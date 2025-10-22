import { createFileRoute, redirect } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Trash2, Loader2, Check, Dot } from 'lucide-react'
import { loadPinches, savePinchesArray } from '@/lib/pincheStorage'
import { usePinches } from '@/hooks/usePinches'
import { usePincheData } from '@/hooks/usePincheData'
import { usePincheSync } from '@/hooks/usePincheSync'
import { formatTimeInRecordedTimezone } from '@/lib/gpsTimezone'
import { canViewPinches } from '@/lib/auth'

export const Route = createFileRoute('/pinches')({
    beforeLoad: () => {
        if (!canViewPinches()) {
            throw redirect({ to: '/' })
        }
    },
    component: Pinches,
})

// Pinche tipo labels
const PINCHE_LABELS = ["apertura", "programado", "sanitario"]

// Parse location from key
const parseLocation = (key: string) => {
    const parts = key.split('::')
    // Format: date::finca::bloque::variedad::tipo
    return {
        finca: parts[1],
        bloque: parts[2],
        variedad: parts[3],
        tipo: parts[4],
        tuple: [parts[1], parts[2], parts[3]] as [string, string, string]
    }
}

// Get active pinche tipo
const getActiveTipo = (pinche: any) => {
    const arr = pinche.originalArr
    if (!arr) return { name: '-', value: '-', index: -1 }

    // Pinche array: [userId, fecha, gps, finca, bloque, variedadId, variedadNombre, apertura, programado, sanitario, syncStatus, pincheId]
    // Tipo fields are at indices 7-9
    const tipoIndex = arr.slice(7, 10).findIndex((v: any) => v && v !== '0')
    return tipoIndex >= 0 ? {
        name: PINCHE_LABELS[tipoIndex],
        value: arr[7 + tipoIndex],
        index: tipoIndex
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
const LocationCard = ({ locationKey, pincheArr, date, getSum, syncProps, onDelete }: any) => {
    const { finca, bloque, variedad, tuple } = parseLocation(locationKey)
    const { uploading, synced, errors, areAllSynced, handleSync } = syncProps
    const bgColor = 'bg-emerald-800'
    const hoverColor = 'hover:bg-emerald-700'

    const startIndex = 3  // Pinche tipos start at index 3 (after finca, bloque, variedad)

    return (
        <Dialog>
            <h3 className="text-sm text-center flex justify-center items-center gap-1">
                F {finca} <Dot /> B {bloque} <Dot /> V {variedad || '-'}
            </h3>
            <div className={`${bgColor} rounded-xl p-1`}>
                <DialogTrigger asChild>
                    <div className={`cursor-pointer ${hoverColor} rounded-lg p-2`}>
                        <div className="flex items-center gap-1 mb-1 text-xs text-white text-center">
                            {PINCHE_LABELS.map((label: string) => (
                                <div key={label} className="flex-1 capitalize">{label}</div>
                            ))}
                            <div className="w-10">Sync</div>
                            <div className="w-10">Del</div>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-white text-xs text-center">
                            {PINCHE_LABELS.map((_: string, idx: number) => (
                                <div key={idx} className="flex-1">{getSum(startIndex + idx, tuple, date) || '-'}</div>
                            ))}
                            <div className="w-10">
                                <SyncStatus
                                    isSynced={areAllSynced(pincheArr) || synced.has(locationKey)}
                                    isUploading={uploading === locationKey}
                                    hasError={errors.has(locationKey)}
                                    onSync={() => handleSync(pincheArr, locationKey)}
                                />
                            </div>
                            <div className="w-10">
                                <Trash2
                                    className="inline cursor-pointer text-red-400"
                                    size={14}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        confirm(`¿Eliminar todos los pinches de F${finca} B${bloque} V${variedad || '-'} en ${date}?`) && onDelete(pincheArr)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </DialogTrigger>
            </div>
            <PincheDialog
                finca={finca}
                bloque={bloque}
                variedad={variedad}
                pincheArr={pincheArr}
                syncProps={syncProps}
                onDelete={onDelete}
            />
        </Dialog>
    )
}

// Pinche Dialog Component
const PincheDialog = ({ finca, bloque, variedad, pincheArr, syncProps, onDelete }: any) => {
    const { handleSyncOne } = syncProps

    return (
        <DialogContent className="max-w-[calc(100vw-1rem)] w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden bg-zinc-900 text-white border-zinc-800">
            <DialogHeader>
                <DialogTitle>
                    Finca {finca} • Bloque {bloque} • Variedad {variedad || '-'}
                </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-zinc-700">
                            {['Hora', 'Tipo', 'Cantidad', 'Sync', 'Eliminar'].map(h => (
                                <TableHead key={h} className={`text-white text-xs ${h === 'Cantidad' || h === 'Sync' || h === 'Eliminar' ? 'text-center' : ''}`}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pincheArr.map((pinche: any, i: number) => {
                            const tipoData = getActiveTipo(pinche)
                            return (
                                <TableRow key={i} className="border-zinc-700">
                                    <TableCell className="text-xs">{formatTimeInRecordedTimezone(pinche.originalArr?.[1], pinche.gps)}</TableCell>
                                    <TableCell className="text-xs capitalize">{tipoData.name}</TableCell>
                                    <TableCell className="text-xs text-center">{tipoData.value}</TableCell>
                                    <TableCell className="text-center">
                                        <SyncStatus status={pinche.syncStatus} size={18} onSync={() => handleSyncOne(pinche)} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Trash2
                                            className="inline cursor-pointer text-red-400"
                                            size={18}
                                            onClick={() => confirm('¿Eliminar este pinche?') && onDelete([pinche])}
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
function Pinches() {
    const { getSum } = usePinches('summary')
    const { grouped } = usePincheData()
    const syncProps = usePincheSync()

    const handleDelete = (pinches: any[]) => {
        const raw = loadPinches()
        const indicesToDelete = new Set(pinches.map(p => p.globalIndex).filter(i => i !== undefined))
        savePinchesArray(raw.filter((_, i) => !indicesToDelete.has(i)))
        window.location.reload()
    }

    const formatDisplayDate = (dateStr: string) => {
        const parts = dateStr.split('/')
        if (parts.length !== 3) return dateStr

        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parseInt(parts[2])

        const date = new Date(year, month, day)
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })

        return `${dayName} ${dateStr}`
    }

    const hasPinches = Object.keys(grouped).length > 0

    return (
        <div className="flex flex-col w-full h-full p-1 gap-1 overflow-hidden bg-black">
            {!hasPinches ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-center text-zinc-400 text-lg">No hay pinches</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1 overflow-y-auto h-full pb-2">
                    {Object.entries(grouped).map(([date, locationGroups]: [string, any]) => (
                        <div key={date} className="gap-1 flex flex-col flex-shrink-0">
                            <h2 className="text-xl text-center capitalize">{formatDisplayDate(date)}</h2>
                            {Object.entries(locationGroups).map(([locationKey, pincheArr]: [string, any]) => (
                                <LocationCard
                                    key={locationKey}
                                    locationKey={locationKey}
                                    pincheArr={pincheArr}
                                    date={date}
                                    getSum={getSum}
                                    syncProps={syncProps}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
