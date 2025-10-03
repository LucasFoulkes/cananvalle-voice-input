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
import { Dot, Trash2, Maximize2, MapPin, Upload, CheckCircle, XCircle } from 'lucide-react'
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

  const handleSyncObservation = async (observation: Observation) => {
    if (observation.synced) return

    try {
      await syncObservationToSupabase(observation)

      // Mark as synced
      setObservaciones(prev => prev.map(obs =>
        obs === observation ? { ...obs, synced: true, syncError: undefined } : obs
      ))
      localStorage.setItem("observaciones", JSON.stringify(
        observaciones.map(obs =>
          obs === observation ? { ...obs, synced: true, syncError: undefined } : obs
        )
      ))
    } catch (error) {
      console.error('Sync error:', error)
      setObservaciones(prev => prev.map(obs =>
        obs === observation ? { ...obs, syncError: error instanceof Error ? error.message : 'Error desconocido' } : obs
      ))
    }
  }

  const handleDeleteEntry = () => {
    if (!entryToDelete || !selectedSummary) return

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

    // Update the selected summary to reflect the deletion
    const updatedEntries = selectedSummary.entries.filter(
      entry => entry !== entryToDelete
    )

    if (updatedEntries.length === 0) {
      // If no entries left, close the dialog
      setSelectedSummary(null)
    } else {
      // Update the summary with new entries and recalculated totals
      const newSummary = { ...selectedSummary, entries: updatedEntries }
      newSummary.arroz = updatedEntries.filter(e => e.estado === 'arroz').reduce((sum, e) => sum + e.cantidad, 0)
      newSummary.arveja = updatedEntries.filter(e => e.estado === 'arveja').reduce((sum, e) => sum + e.cantidad, 0)
      newSummary.garbanzo = updatedEntries.filter(e => e.estado === 'garbanzo').reduce((sum, e) => sum + e.cantidad, 0)
      newSummary.color = updatedEntries.filter(e => e.estado === 'color').reduce((sum, e) => sum + e.cantidad, 0)
      newSummary.abierto = updatedEntries.filter(e => e.estado === 'abierto').reduce((sum, e) => sum + e.cantidad, 0)
      setSelectedSummary(newSummary)
    }

    setEntryToDelete(null)
  }

  return (
    <>
      <div className='overflow-y-auto bg-zinc-900 flex flex-1 flex-col h-full p-2 rounded-lg gap-4'>
        {Object.entries(groupedByDate).map(([fecha, rows]) => (
          <div key={fecha} className='flex flex-col gap-1'>
            <h2 className='text-white text-xl text-center'>{fecha}</h2>
            <Card className='overflow-hidden max-h-full bg-zinc-800 p-1 text-white border-none'>
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
                    <TableHead className='text-white text-center'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className='hover:bg-zinc-700'
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
                    </TableRow>
                  ))}
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
              <div className='flex gap-2 text-xl '><span className='font-semibold'>Cama {selectedSummary?.cama}</span>
                <span className='font-thin text-xs flex flex-row items-center'>
                  <Dot />
                  Bloque {selectedSummary?.bloque}
                  <Dot />
                  Finca {selectedSummary?.finca}
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
                {selectedSummary?.entries.map((entry, i) => (
                  <TableRow key={i}>
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
                      {entry.synced ? (
                        <CheckCircle className='h-4 w-4 text-green-400 mx-auto' />
                      ) : entry.syncError ? (
                        <div title={entry.syncError}>
                          <XCircle className='h-4 w-4 text-red-400 mx-auto' />
                        </div>
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
