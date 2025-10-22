import { createFileRoute, redirect } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Trash2, Loader2, Check, Dot } from 'lucide-react'
import { loadObservaciones, saveObservacionesArray } from '@/lib/observationStorage'
import { useObservations } from '@/hooks/useObservations'
import { useObservacionData } from '@/hooks/useObservacionData'
import { useObservacionSync } from '@/hooks/useObservacionSync'
import { formatTimeInRecordedTimezone } from '@/lib/gpsTimezone'
import { canViewObservaciones, hasRole } from '@/lib/auth'

export const Route = createFileRoute('/observaciones')({
  beforeLoad: () => {
    if (!canViewObservaciones()) {
      throw redirect({ to: '/' })
    }
  },
  component: Observaciones,
})

// Utilities
const parseLocation = (key: string) => {
  const parts = key.split('-')
  // Format: date-finca-bloque-cama-tipo or date-finca-bloque-cama (legacy)
  const hasTipo = parts.length === 5

  if (hasTipo) {
    // Format: date-finca-bloque-cama-tipo
    return {
      finca: parts[1],
      bloque: parts[2],
      cama: parts[3],
      tipo: parts[4],
      tuple: [parts[1], parts[2], parts[3]] as [string, string, string]
    }
  } else {
    // Format: date-finca-bloque-cama (legacy)
    return {
      finca: parts[1],
      bloque: parts[2],
      cama: parts[3],
      tipo: undefined,
      tuple: [parts[1], parts[2], parts[3]] as [string, string, string]
    }
  }
}

// Determine if observation is estado or sensor based on which fields have values
const getObservationType = (obs: any): 'estado' | 'sensor' => {
  // New array format: [userId, fecha, gps, finca, bloque, cama, arroz, arveja, garbanzo, color, abierto, conductividad_suelo, humedad, temperatura_suelo, ...]
  // Estado fields: indices 6-10 (arroz, arveja, garbanzo, color, abierto)
  // Sensor fields: indices 11-13 (conductividad_suelo, humedad, temperatura_suelo)
  const arr = obs.originalArr
  if (!arr) return 'estado'

  const hasSensor = arr.slice(11, 14).some((v: any) => v && v !== '0')

  return hasSensor ? 'sensor' : 'estado'
}

// Get estado/sensor labels based on type
const ESTADO_LABELS = ["arroz", "arveja", "garbanzo", "color", "abierto"]
const SENSOR_LABELS = ["conductividad", "humedad", "temperatura"]

const getActiveStage = (obs: any, tipo: 'estado' | 'sensor') => {
  // New array format: [userId, fecha, gps, finca, bloque, cama, arroz, arveja, garbanzo, color, abierto, conductividad_suelo, humedad, temperatura_suelo, ...]
  const arr = obs.originalArr
  if (!arr) return { name: '-', value: '-', index: -1 }

  if (tipo === 'estado') {
    // Estado fields are at indices 6-10
    const stageIndex = arr.slice(6, 11).findIndex((v: any) => v && v !== '0')
    return stageIndex >= 0 ? {
      name: ESTADO_LABELS[stageIndex],
      value: arr[6 + stageIndex],
      index: stageIndex
    } : { name: '-', value: '-', index: -1 }
  } else {
    // Sensor fields are at indices 11-13
    const stageIndex = arr.slice(11, 14).findIndex((v: any) => v && v !== '0')
    return stageIndex >= 0 ? {
      name: SENSOR_LABELS[stageIndex],
      value: arr[11 + stageIndex],
      index: stageIndex
    } : { name: '-', value: '-', index: -1 }
  }
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
const LocationCard = ({ locationKey, obsArr, date, getSum, syncProps, onDelete }: any) => {
  const { finca, bloque, cama, tipo, tuple } = parseLocation(locationKey)
  const { uploading, synced, errors, areAllSynced, handleSync } = syncProps

  // Determine the actual type from observations if not in key
  const observationType = tipo || getObservationType(obsArr[0])
  const isEstado = observationType === 'estado'
  const stageLabels = isEstado ? ESTADO_LABELS : SENSOR_LABELS
  const startIndex = isEstado ? 3 : 8 // Estado starts at index 3 (arroz), Sensor starts at index 8 (conductividad_suelo)
  const bgColor = isEstado ? 'bg-zinc-800' : 'bg-slate-800'
  const hoverColor = isEstado ? 'hover:bg-zinc-700' : 'hover:bg-slate-700'

  return (
    <Dialog>
      <h3 className="text-sm text-center flex justify-center items-center gap-1">
        F {finca} <Dot /> B {bloque} <Dot /> C {cama}
      </h3>
      <div className={`${bgColor} rounded-xl p-1`}>
        <DialogTrigger asChild>
          <div className={`cursor-pointer ${hoverColor} rounded-lg p-2`}>
            <div className="flex items-center gap-1 mb-1 text-xs text-white text-center">
              {stageLabels.map((label: string) => (
                <div key={label} className="flex-1 capitalize">{label}</div>
              ))}
              <div className="w-10">Sync</div>
              <div className="w-10">Del</div>
            </div>
            <div className="flex items-center gap-1 font-semibold text-white text-xs text-center">
              {stageLabels.map((_: string, idx: number) => (
                <div key={idx} className="flex-1">{getSum(startIndex + idx, tuple, date) || '-'}</div>
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
      <ObservationDialog
        finca={finca}
        bloque={bloque}
        cama={cama}
        obsArr={obsArr}
        tipo={observationType}
        syncProps={syncProps}
        onDelete={onDelete}
      />
    </Dialog>
  )
}

// Observation Dialog Component
const ObservationDialog = ({ finca, bloque, cama, obsArr, tipo, syncProps, onDelete }: any) => {
  const { handleSyncOne } = syncProps

  return (
    <DialogContent className="max-w-[calc(100vw-1rem)] w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden bg-zinc-900 text-white border-zinc-800">
      <DialogHeader>
        <DialogTitle>
          Cama {cama} • Bloque {bloque} • Finca {finca}
        </DialogTitle>
      </DialogHeader>
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-700">
              {['Hora', 'Cantidad', 'Sync', 'Eliminar'].map(h => (
                <TableHead key={h} className={`text-white text-xs ${h === 'Cantidad' || h === 'Sync' || h === 'Eliminar' ? 'text-center' : ''}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {obsArr.map((obs: any, i: number) => {
              const stage = getActiveStage(obs, tipo)
              return (
                <TableRow key={i} className="border-zinc-700">
                  <TableCell className="text-xs">{formatTimeInRecordedTimezone(obs.originalArr?.[1], obs.gps)}</TableCell>
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
  const { grouped } = useObservacionData()
  const syncProps = useObservacionSync()
  const canSeeEstados = hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_estados_fenologicos'])
  const canSeeSensores = hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_sensores'])

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

  // Re-group observations by location AND type
  const regroupByType = (dateGroups: any) => {
    const result: any = {}

    Object.entries(dateGroups).forEach(([date, locationGroups]: any) => {
      result[date] = {}

      Object.entries(locationGroups).forEach(([locationKey, obsArr]: any) => {
        // Split observations by type
        const estadoObs = obsArr.filter((obs: any) => getObservationType(obs) === 'estado')
        const sensorObs = obsArr.filter((obs: any) => getObservationType(obs) === 'sensor')

        // Add separate entries for estados and sensores
        if (estadoObs.length > 0) {
          result[date][`${locationKey}-estado`] = estadoObs
        }
        if (sensorObs.length > 0) {
          result[date][`${locationKey}-sensor`] = sensorObs
        }
      })
    })

    return result
  }

  const groupedByType = regroupByType(grouped)

  const dateSections = Object.entries(groupedByType)
    .map(([date, locationGroups]: [string, any]) => {
      const locationCards = Object.entries(locationGroups)
        .map(([locationKey, obsArr]: [string, any]) => {
          const { tipo } = parseLocation(locationKey)
          const observationType = (tipo === 'sensor' || tipo === 'estado')
            ? (tipo as 'sensor' | 'estado')
            : getObservationType(obsArr[0])

          if (observationType === 'estado' && !canSeeEstados) return null
          if (observationType === 'sensor' && !canSeeSensores) return null

          return (
            <LocationCard
              key={locationKey}
              locationKey={locationKey}
              obsArr={obsArr}
              date={date}
              getSum={getSum}
              syncProps={syncProps}
              onDelete={handleDelete}
            />
          )
        })
        .filter(Boolean)

      if (locationCards.length === 0) return null

      return (
        <div key={date} className="gap-1 flex flex-col flex-shrink-0">
          <h2 className="text-xl text-center capitalize">{formatDisplayDate(date)}</h2>
          {locationCards}
        </div>
      )
    })
    .filter(Boolean)

  const hasObservations = dateSections.length > 0

  return (
    <div className="flex flex-col w-full h-full p-1 gap-1 overflow-hidden bg-black">
      {!hasObservations ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-center text-zinc-400 text-lg">No hay observaciones</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto h-full pb-2">
          {dateSections}
        </div>
      )}
    </div>
  )
}