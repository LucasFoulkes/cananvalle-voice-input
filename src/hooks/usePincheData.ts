import { useMemo } from 'react'
import { groupBy } from 'lodash'
import { getCurrentUserId } from '@/lib/auth'
import { loadPinches } from '@/lib/pincheStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import type { PincheWithMeta, GroupedPinches, PincheTipo } from '@/types'

export const PINCHE_LABELS = ["apertura", "programado", "sanitario"] as const
export const PINCHE_TIPO_MAP: Record<string, PincheTipo> = {
    'apertura': 'pinche apertura',
    'programado': 'pinche programado',
    'sanitario': 'pinche sanitario'
}

export function usePincheData() {
    const currentUserId = getCurrentUserId()
    const rawPinches = loadPinches()

    const pinches: PincheWithMeta[] = useMemo(() => {
        if (!Array.isArray(rawPinches[0])) return []

        return ((rawPinches as unknown) as any[][]).map((arr, globalIndex) => {
            // Format: [userId, fecha, gps, finca, bloque, variedadId, variedadNombre, apertura, programado, sanitario, syncStatus, pincheId]
            // Indices: 0       1      2    3      4      5           6              7         8          9          10          11

            // Find which tipo has a value (tipo fields are at indices 7-9)
            const tipoIndex = arr.slice(7, 10).findIndex((v: any) => v && v !== '0')
            const tipoName = tipoIndex >= 0 ? PINCHE_LABELS[tipoIndex] : 'apertura'
            const cantidad = tipoIndex >= 0 ? Number(arr[7 + tipoIndex]) || 0 : 0

            return {
                userId: arr[0] ? parseInt(arr[0]) : currentUserId,
                finca: arr[3],
                bloque: arr[4],
                variedadId: arr[5] ? parseInt(arr[5]) : null,
                variedad: arr[6] || '',
                tipo: PINCHE_TIPO_MAP[tipoName],
                cantidad: cantidad,
                fecha: arr[1],  // Index 1 is the timestamp
                gps: arr[2] ? JSON.parse(arr[2]) : undefined,  // Index 2 is the GPS
                syncStatus: arr[10] || 'pending',  // Index 10 is syncStatus
                pincheId: arr[11] ? parseInt(arr[11]) : undefined,  // Index 11 is pincheId
                originalArr: arr,
                globalIndex
            }
        })
    }, [rawPinches, currentUserId])

    const grouped: GroupedPinches = useMemo(() => {
        // Group by date first - using GPS timezone for accurate date grouping
        const byDate = groupBy(pinches, (pinche: PincheWithMeta) => {
            return formatDateGroupInRecordedTimezone(pinche.fecha, pinche.gps)
        })

        // Then group by location within each date
        return Object.fromEntries(
            Object.entries(byDate).map(([date, pincheArr]) => [
                date,
                groupBy(pincheArr, pinche => `${date}::${pinche.finca}::${pinche.bloque}::${pinche.variedad}::${pinche.tipo}`)
            ])
        )
    }, [pinches])

    return {
        pinches,
        grouped,
        tipoLabels: PINCHE_LABELS,
        currentUserId
    }
}
