import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Observation, GpsLocation } from '@/types'
import { syncObservationToSupabase } from '@/services/supabaseService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Dot, Trash2, Maximize2, MapPin, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/observaciones')({
  component: RouteComponent,
})

type SummaryRow = {
  finca: string
  bloque: string
  cama: string
  fecha: string
  arroz: number
  arveja: number
  garbanzo: number
  color: number
  abierto: number
  entries: Observation[]
}

function RouteComponent() {
  const [observaciones, setObservaciones] = useState<Observation[]>(
    JSON.parse(localStorage.getItem("observaciones") || "[]")
  )
  const [selectedSummary, setSelectedSummary] = useState<SummaryRow | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<Observation | null>(null)
  const [camaToDelete, setCamaToDelete] = useState<SummaryRow | null>(null)
  const [selectedGps, setSelectedGps] = useState<GpsLocation | null>(null)

  // Group observations by finca/bloque/cama/day
  const summaries: SummaryRow[] = Object.values(
    observaciones.reduce((acc, obs) => {
      const d = new Date(obs.fecha)
      const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
      const key = `${obs.finca}-${obs.bloque}-${obs.cama}-${date}`

      if (!acc[key]) {
        acc[key] = {
          finca: obs.finca,
          bloque: obs.bloque,
          cama: obs.cama,
          fecha: date,
          arroz: 0,
          arveja: 0,
          garbanzo: 0,
          color: 0,
          abierto: 0,
          entries: []
        }
      }

      acc[key][obs.estado as keyof Pick<SummaryRow, 'arroz' | 'arveja' | 'garbanzo' | 'color' | 'abierto'>] += obs.cantidad
      acc[key].entries.push(obs)

      return acc
    }, {} as Record<string, SummaryRow>)
  )

  // Group summaries by date
  const groupedByDate = summaries.reduce((acc, summary) => {
    if (!acc[summary.fecha]) {
      acc[summary.fecha] = []
    }
    acc[summary.fecha].push(summary)
    return acc
  }, {} as Record<string, SummaryRow[]>)

  // Keep selectedSummary in sync with latest data
  const currentSelectedSummary = selectedSummary
    ? summaries.find(s =>
      s.finca === selectedSummary.finca &&
      s.bloque === selectedSummary.bloque &&
      s.cama === selectedSummary.cama &&
      s.fecha === selectedSummary.fecha
    ) || null
    : null

  const isSameObservation = (a: Observation, b: Observation) => {
    return a.fecha === b.fecha &&
      a.finca === b.finca &&
      a.bloque === b.bloque &&
      a.cama === b.cama &&
      a.estado === b.estado &&
      a.cantidad === b.cantidad
  }

  const handleSyncObservation = async (observation: Observation) => {
    if (observation.synced || observation.syncing) return

    // Mark as syncing
    setObservaciones(prev => prev.map(obs =>
      isSameObservation(obs, observation) ? { ...obs, syncing: true, syncError: undefined } : obs
    ))

    try {
      const observacionId = await syncObservationToSupabase(observation)

      // Mark as synced
      setObservaciones(prev => {
        const updated = prev.map(obs =>
          isSameObservation(obs, observation) ? { ...obs, synced: true, syncing: false, syncError: undefined, observacionId } : obs
        )
        localStorage.setItem("observaciones", JSON.stringify(updated))
        return updated
      })
    } catch (error) {
      console.error('Sync error:', error)
      setObservaciones(prev => {
        const updated = prev.map(obs =>
          isSameObservation(obs, observation) ? { ...obs, syncing: false, syncError: error instanceof Error ? error.message : 'Error desconocido' } : obs
        )
        localStorage.setItem("observaciones", JSON.stringify(updated))
        return updated
      })
    }
  }

  const getSyncStatus = (entries: Observation[]) => {
    const allSynced = entries.every(e => e.synced)
    const hasFailed = entries.some(e => e.syncError)
    const someSynced = entries.some(e => e.synced)
    const anySyncing = entries.some(e => e.syncing)

    if (anySyncing) return 'syncing'
    if (allSynced) return 'synced'
    if (hasFailed) return 'error'
    if (someSynced) return 'partial'
    return 'none'
  }

  const getSyncProgress = (entries: Observation[]) => {
    const total = entries.length
    const synced = entries.filter(e => e.synced).length
    return (synced / total) * 100
  }

  const getRowClassName = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-900/20 hover:bg-green-900/30'
      case 'error': return 'bg-red-900/20 hover:bg-red-900/30'
      case 'partial': return 'bg-amber-900/20 hover:bg-amber-900/30'
      default: return 'hover:bg-zinc-700'
    }
  }

  const getEntryRowClassName = (entry: Observation) => {
    if (entry.synced) return 'bg-green-900/20 hover:bg-green-900/30'
    if (entry.syncError) return 'bg-red-900/20 hover:bg-red-900/30'
    return 'hover:bg-zinc-700'
  }

  const handleSyncAllInCama = async (row: SummaryRow) => {
    const unsyncedEntries = row.entries.filter(e => !e.synced && !e.syncing)
    for (const entry of unsyncedEntries) {
      await handleSyncObservation(entry)
    }
  }

  const handleDeleteAllInCama = () => {
    if (!camaToDelete) return

    const updatedObservaciones = observaciones.filter(
      obs => {
        if (obs.finca !== camaToDelete.finca || obs.bloque !== camaToDelete.bloque || obs.cama !== camaToDelete.cama) {
          return true // Keep observations from different locations
        }
        // Compare dates: convert obs.fecha to YYYY/MM/DD format
        const d = new Date(obs.fecha)
        const obsDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
        return obsDate !== camaToDelete.fecha // Keep if dates don't match
      }
    )
    setObservaciones(updatedObservaciones)
    localStorage.setItem("observaciones", JSON.stringify(updatedObservaciones))
    setCamaToDelete(null)
  }

  const handleDeleteEntry = () => {
    if (!entryToDelete || !currentSelectedSummary) return

    const updatedObservaciones = observaciones.filter(
      obs => obs.fecha !== entryToDelete.fecha ||
        obs.finca !== entryToDelete.finca ||
        obs.bloque !== entryToDelete.bloque ||
        obs.cama !== entryToDelete.cama ||
        obs.estado !== entryToDelete.estado ||
        obs.cantidad !== entryToDelete.cantidad
    )

    setObservaciones(updatedObservaciones)
    localStorage.setItem("observaciones", JSON.stringify(updatedObservaciones))

    // Check if any entries remain for this cama
    const remainingEntries = updatedObservaciones.filter(
      obs => obs.finca === currentSelectedSummary.finca &&
        obs.bloque === currentSelectedSummary.bloque &&
        obs.cama === currentSelectedSummary.cama &&
        new Date(obs.fecha).toISOString().split('T')[0] === new Date(currentSelectedSummary.fecha).toISOString().split('T')[0]
    )

    if (remainingEntries.length === 0) {
      // If no entries left, close the dialog
      setSelectedSummary(null)
    }

    setEntryToDelete(null)
  }

  return (
    <>
      <div className='overflow-y-auto bg-zinc-900 flex flex-1 flex-col h-full p-2 rounded-lg gap-4'>
        {Object.entries(groupedByDate).map(([fecha, rows]) => (
          <div key={fecha} className='flex flex-col gap-1'>
            <h2 className='text-white text-xl text-center'>{fecha}</h2>
            <Card className='overflow-hidden max-h-full bg-zinc-800 p-1  text-white px-2 pb-2 text-white border-none'>
              <Table >
                <TableHeader className='text-xs'>
                  <TableRow>
                    <TableHead className='text-white'>F</TableHead>
                    <TableHead className='text-white'>B</TableHead>
                    <TableHead className='text-white'>C</TableHead>
                    <TableHead className='text-white text-right'>Arr</TableHead>
                    <TableHead className='text-white text-right'>Arv</TableHead>
                    <TableHead className='text-white text-right'>Gar</TableHead>
                    <TableHead className='text-white text-right'>Col</TableHead>
                    <TableHead className='text-white text-right'>Abi</TableHead>
                    <TableHead className='text-white text-center'>Ver</TableHead>
                    <TableHead className='text-white text-center'>Sync</TableHead>
                    <TableHead className='text-white text-center'>Del</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const syncStatus = getSyncStatus(row.entries)
                    const syncProgress = getSyncProgress(row.entries)
                    const showProgress = syncStatus === 'syncing' || (syncStatus === 'partial' && syncProgress > 0 && syncProgress < 100)

                    return (
                      <TableRow
                        key={i}
                        className={getRowClassName(syncStatus)}
                        style={{
                          ...(showProgress && {
                            background: `linear-gradient(to right, rgba(59, 130, 246, 0.3) ${syncProgress}%, transparent ${syncProgress}%)`,
                            transition: 'background 0.3s ease'
                          })
                        }}
                      >
                        <TableCell>{row.finca}</TableCell>
                        <TableCell>{row.bloque}</TableCell>
                        <TableCell>{row.cama}</TableCell>
                        <TableCell className='text-right'>{row.arroz || '-'}</TableCell>
                        <TableCell className='text-right'>{row.arveja || '-'}</TableCell>
                        <TableCell className='text-right'>{row.garbanzo || '-'}</TableCell>
                        <TableCell className='text-right'>{row.color || '-'}</TableCell>
                        <TableCell className='text-right'>{row.abierto || '-'}</TableCell>
                        <TableCell className='text-center'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 hover:bg-blue-900/50'
                            onClick={() => setSelectedSummary(row)}
                          >
                            <Maximize2 className='h-4 w-4 text-blue-400' />
                          </Button>
                        </TableCell>
                        <TableCell className='text-center'>
                          {syncStatus === 'syncing' ? (
                            <Loader2 className='h-4 w-4 text-blue-400 mx-auto animate-spin' />
                          ) : syncStatus === 'synced' ? (
                            <CheckCircle className='h-4 w-4 text-green-400 mx-auto' />
                          ) : syncStatus === 'error' ? (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-6 w-6 p-0 hover:bg-red-900/50'
                              onClick={() => handleSyncAllInCama(row)}
                            >
                              <XCircle className='h-4 w-4 text-red-400' />
                            </Button>
                          ) : (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-6 w-6 p-0 hover:bg-blue-900/50'
                              onClick={() => handleSyncAllInCama(row)}
                            >
                              <Upload className='h-4 w-4 text-blue-400' />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className='text-center'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 hover:bg-red-900/50'
                            onClick={() => setCamaToDelete(row)}
                          >
                            <Trash2 className='h-4 w-4 text-red-400' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedSummary} onOpenChange={(open) => !open && setSelectedSummary(null)}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle className='flex flex-col gap-1 '>
              <div className='flex gap-2 text-xl '><span className='font-semibold'>Cama {currentSelectedSummary?.cama}</span>
                <span className='font-thin text-xs flex flex-row items-center'>
                  <Dot />
                  Bloque {currentSelectedSummary?.bloque}
                  <Dot />
                  Finca {currentSelectedSummary?.finca}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-auto max-h-96'>
            <Table>
              <TableHeader className='text-xs'>
                <TableRow>
                  <TableHead className='text-white'>Hora</TableHead>
                  <TableHead className='text-white'>Estado</TableHead>
                  <TableHead className='text-white text-right'>Cantidad</TableHead>
                  <TableHead className='text-white text-center'>GPS</TableHead>
                  <TableHead className='text-white text-center'>Sync</TableHead>
                  <TableHead className='text-white text-center'>Eliminar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-xs'>
                {currentSelectedSummary?.entries.map((entry, i) => (
                  <TableRow key={i} className={getEntryRowClassName(entry)}>
                    <TableCell>{new Date(entry.fecha).toLocaleTimeString()}</TableCell>
                    <TableCell className='capitalize'>{entry.estado}</TableCell>
                    <TableCell className='text-right'>{entry.cantidad}</TableCell>
                    <TableCell className='text-center'>
                      {entry.gps ? (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0 hover:bg-green-900/50'
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedGps(entry.gps!)
                          }}
                        >
                          <MapPin className='h-4 w-4 text-green-400' />
                        </Button>
                      ) : (
                        <span className='text-zinc-600'>-</span>
                      )}
                    </TableCell>
                    <TableCell className='text-center'>
                      {entry.syncing ? (
                        <Loader2 className='h-4 w-4 text-blue-400 mx-auto animate-spin' />
                      ) : entry.synced ? (
                        <CheckCircle className='h-4 w-4 text-green-400 mx-auto' />
                      ) : entry.syncError ? (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0 hover:bg-red-900/50'
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSyncObservation(entry)
                          }}
                          title={entry.syncError}
                        >
                          <XCircle className='h-4 w-4 text-red-400' />
                        </Button>
                      ) : (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0 hover:bg-blue-900/50'
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSyncObservation(entry)
                          }}
                        >
                          <Upload className='h-4 w-4 text-blue-400' />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-6 w-6 p-0 hover:bg-red-900/50'
                        onClick={(e) => {
                          e.stopPropagation()
                          setEntryToDelete(entry)
                        }}
                      >
                        <Trash2 className='h-4 w-4 text-red-400' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog >

      <Dialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle className='text-center'>¿Eliminar esta entrada?</DialogTitle>
          </DialogHeader>
          <div className='flex justify-center pt-4'>
            <Button
              variant='destructive'
              onClick={handleDeleteEntry}
              className='bg-red-600 hover:bg-red-700'
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!camaToDelete} onOpenChange={(open) => !open && setCamaToDelete(null)}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle className='text-center'>
              ¿Eliminar todas las entradas de esta cama?
            </DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-2 pt-2'>
            <p className='text-center text-sm text-zinc-400'>
              Finca {camaToDelete?.finca} • Bloque {camaToDelete?.bloque} • Cama {camaToDelete?.cama}
            </p>
            <p className='text-center text-sm text-zinc-400'>
              {camaToDelete?.entries.length} {camaToDelete?.entries.length === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>
          <div className='flex justify-center pt-4'>
            <Button
              variant='destructive'
              onClick={handleDeleteAllInCama}
              className='bg-red-600 hover:bg-red-700'
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGps} onOpenChange={(open) => !open && setSelectedGps(null)}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle className='text-center flex items-center justify-center gap-2'>
              <MapPin className='h-5 w-5 text-green-400' />
              Ubicación GPS
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 pt-4'>
            <div className='grid grid-cols-2 gap-2'>
              <span className='font-semibold'>Latitud:</span>
              <span>{selectedGps?.latitud.toFixed(6)}</span>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <span className='font-semibold'>Longitud:</span>
              <span>{selectedGps?.longitud.toFixed(6)}</span>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <span className='font-semibold'>Precisión:</span>
              <span>{selectedGps?.precision.toFixed(2)} m</span>
            </div>
            {selectedGps?.altitud && (
              <div className='grid grid-cols-2 gap-2'>
                <span className='font-semibold'>Altitud:</span>
                <span>{selectedGps.altitud.toFixed(2)} m</span>
              </div>
            )}
            <div className='grid grid-cols-2 gap-2'>
              <span className='font-semibold'>Creado en:</span>
              <span>{selectedGps && new Date(selectedGps.creado_en).toLocaleString()}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
