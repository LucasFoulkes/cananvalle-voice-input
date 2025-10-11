import { createFileRoute } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Trash2, Loader2, Check, Dot } from 'lucide-react'
import { loadObservaciones, saveObservacionesArray } from '@/lib/observationStorage'
import { useObservations } from '@/hooks/useObservations'
import { useObservacionData } from '@/hooks/useObservacionData'
import { useObservacionSync } from '@/hooks/useObservacionSync'
import { formatTimeInRecordedTimezone } from '@/lib/gpsTimezone'

export const Route = createFileRoute('/observaciones')({
  component: Observaciones,
})

// Utilities
const parseLocation = (key: string) => {
  const parts = key.split('-')
  return {
    finca: parts[parts.length - 3],
    bloque: parts[parts.length - 2],
    cama: parts[parts.length - 1],
    tuple: [parts[parts.length - 3], parts[parts.length - 2], parts[parts.length - 1]] as [string, string, string]
  }
}

const getActiveStage = (obs: any, stageLabels: string[]) => {
  // Status fields are now at indices 4-8 (offset by 1 due to userId at index 0)
  const stageIndex = obs.originalArr?.slice(4, 9).findIndex((v: any) => v && v !== '0')
  return stageIndex >= 0 ? {
    name: stageLabels[stageIndex],
    value: obs.originalArr[4 + stageIndex],
    index: stageIndex
  } : { name: '-', value: '-', index: -1 }
}


// Sync Status Component
const SyncStatus = ({ status, isUploading, isSynced, hasError, size = 14, onSync }: any) => {
  if (status === 'success' || isSynced) return <Check className="inline text-green-400" size={size} />
  if (isUploading) return <Loader2 className="inline text-blue-400 animate-spin" size={size} />
  return (
    <Upload
      className={`inline cursor-pointer ${hasError ? 'text-orange-400' : 'text-green-400'}`}
      size={size}
      onClick={(e) => { e?.stopPropagation?.(); onSync?.() }}
    />
  )
}

// Location Card Component
const LocationCard = ({ locationKey, obsArr, date, stageLabels, getSum, syncProps, onDelete }: any) => {
  const { finca, bloque, cama, tuple } = parseLocation(locationKey)
  const { uploading, synced, errors, areAllSynced, handleSync } = syncProps

  return (
    <Dialog>
      <h3 className="text-sm text-center flex justify-center items-center gap-1">
        F {finca} <Dot /> B {bloque} <Dot /> C {cama}
      </h3>
      <div className="bg-zinc-800 rounded-xl p-1">
        <DialogTrigger asChild>
          <div className="cursor-pointer hover:bg-zinc-700 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1 text-xs text-white text-center">
              {stageLabels.map((label: string) => (
                <div key={label} className="flex-1 capitalize">{label}</div>
              ))}
              <div className="w-10">Sync</div>
              <div className="w-10">Del</div>
            </div>
            <div className="flex items-center gap-1 font-semibold text-white text-xs text-center">
              {stageLabels.map((_: string, idx: number) => (
                <div key={idx} className="flex-1">{getSum(3 + idx, tuple, date) || '-'}</div>
              ))}
              <div className="w-10">
                <SyncStatus
                  isSynced={areAllSynced(obsArr) || synced.has(locationKey)}
                  isUploading={uploading === locationKey}
                  hasError={errors.has(locationKey)}
                  onSync={() => handleSync(obsArr, locationKey)}
                />
              </div>
              <div className="w-10">
                <Trash2
                  className="inline cursor-pointer text-red-400"
                  size={14}
                  onClick={(e) => {
                    e.stopPropagation()
                    confirm(`¿Eliminar todas las observaciones de F${finca} B${bloque} C${cama} en ${date}?`) && onDelete(obsArr)
                  }}
                />
              </div>
            </div>
          </div>
        </DialogTrigger>
      </div>
      <ObservationDialog finca={finca} bloque={bloque} cama={cama} obsArr={obsArr} stageLabels={stageLabels} syncProps={syncProps} onDelete={onDelete} />
    </Dialog>
  )
}

// Observation Dialog Component
const ObservationDialog = ({ finca, bloque, cama, obsArr, stageLabels, syncProps, onDelete }: any) => {
  const { handleSyncOne } = syncProps

  return (
    <DialogContent className="max-w-[calc(100vw-1rem)] w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden bg-zinc-900 text-white border-zinc-800">
      <DialogHeader>
        <DialogTitle>Cama {cama} • Bloque {bloque} • Finca {finca}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-700">
              {['Hora', 'Estado', 'Cantidad', 'Sync', 'Eliminar'].map(h => (
                <TableHead key={h} className={`text-white text-xs ${h === 'Cantidad' || h === 'Sync' || h === 'Eliminar' ? 'text-center' : ''}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {obsArr.map((obs: any, i: number) => {
              const stage = getActiveStage(obs, stageLabels)
              return (
                <TableRow key={i} className="border-zinc-700">
                  <TableCell className="text-xs">{formatTimeInRecordedTimezone(obs.originalArr?.[9], obs.gps)}</TableCell>
                  <TableCell className="text-xs capitalize">{stage.name}</TableCell>
                  <TableCell className="text-xs text-center">{stage.value}</TableCell>
                  <TableCell className="text-center">
                    <SyncStatus status={obs.syncStatus} size={18} onSync={() => handleSyncOne(obs)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Trash2
                      className="inline cursor-pointer text-red-400"
                      size={18}
                      onClick={() => confirm('¿Eliminar esta observación?') && onDelete([obs])}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  )
}

// Main Component
function Observaciones() {
  const { getSum } = useObservations('summary')
  const { grouped, stageLabels } = useObservacionData()
  const syncProps = useObservacionSync()

  const handleDelete = (observations: any[]) => {
    const raw = loadObservaciones()
    const indicesToDelete = new Set(observations.map(o => o.globalIndex).filter(i => i !== undefined))
    saveObservacionesArray(raw.filter((_, i) => !indicesToDelete.has(i)))
    window.location.reload()
  }

  const formatDisplayDate = (dateStr: string) => {
    // dateStr is already formatted as "DD/MM/YYYY" from formatDateGroupInRecordedTimezone
    // Parse it to get day, month, year
    const parts = dateStr.split('/')
    if (parts.length !== 3) return dateStr // Fallback if format is unexpected

    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1 // JavaScript months are 0-indexed
    const year = parseInt(parts[2])

    const date = new Date(year, month, day)
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })

    return `${dayName} ${dateStr}`
  }

  // Check if there are no observations
  const hasObservations = Object.keys(grouped).length > 0

  return (
    <div className="flex flex-col w-full h-full p-1 gap-1">
      {!hasObservations ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-center text-zinc-400 text-lg">No hay observaciones</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, locationGroups]) => (
          <div key={date} className="gap-1 flex flex-col">
            <h2 className="text-xl text-center capitalize">{formatDisplayDate(date)}</h2>
            {Object.entries(locationGroups).map(([locationKey, obsArr]) => (
              <LocationCard
                key={locationKey}
                locationKey={locationKey}
                obsArr={obsArr}
                date={date}
                stageLabels={stageLabels}
                getSum={getSum}
                syncProps={syncProps}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}