import { useMemo } from 'react'
import { groupBy } from 'lodash'
import { getCurrentUserId } from '@/lib/auth'
import { loadPinches } from '@/lib/pincheStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import type { PincheWithMeta, GroupedPinches } from '@/types'

export const PINCHE_LABELS = ["apertura", "programado", "sanitario"] as const
export const PINCHE_TIPO_MAP: Record<string, 'pinche_apertura' | 'pinche_programado' | 'pinche_sanitario'> = {
    'apertura': 'pinche_apertura',
    'programado': 'pinche_programado',
    'sanitario': 'pinche_sanitario'
}

export function usePincheData() {
    const currentUserId = getCurrentUserId()
    const rawPinches = loadPinches()

    const pinches: PincheWithMeta[] = useMemo(() => {
        if (!Array.isArray(rawPinches[0])) return []

        return ((rawPinches as unknown) as any[][]).map((arr, globalIndex) => {
            // Format: [userId, fecha, gps, finca, bloque, cama, apertura, programado, sanitario, syncStatus, pincheId]
            // Indices: 0       1      2    3      4       5     6         7           8          9           10

            // Find which tipo has a value (tipo fields are at indices 6-8)
            const tipoIndex = arr.slice(6, 9).findIndex((v: any) => v && v !== '0')
            const tipoName = tipoIndex >= 0 ? PINCHE_LABELS[tipoIndex] : 'apertura'  // Default to apertura
            const cantidad = tipoIndex >= 0 ? Number(arr[6 + tipoIndex]) || 0 : 0

            return {
                userId: arr[0] ? parseInt(arr[0]) : currentUserId,
                finca: arr[3],
                bloque: arr[4],
                cama: arr[5],
                tipo: PINCHE_TIPO_MAP[tipoName],
                cantidad: cantidad,
                fecha: arr[1],  // Index 1 is the timestamp
                gps: arr[2] ? JSON.parse(arr[2]) : undefined,  // Index 2 is the GPS
                syncStatus: arr[9] || 'pending',  // Index 9 is syncStatus
                pincheId: arr[10] ? parseInt(arr[10]) : undefined,  // Index 10 is pincheId
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
                groupBy(pincheArr, pinche => `${date}-${pinche.finca}-${pinche.bloque}-${pinche.cama}-${pinche.tipo}`)
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
