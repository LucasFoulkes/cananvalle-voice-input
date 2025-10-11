import { useMemo } from 'react'
import { groupBy } from 'lodash'
import { getCurrentUserId } from '@/lib/auth'
import { loadObservaciones } from '@/lib/observationStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import type { ObservationWithMeta, GroupedObservations } from '@/types'

export const STAGE_LABELS = ["arroz", "arveja", "garbanzo", "color", "abierto"] as const

export function useObservacionData() {
    const currentUserId = getCurrentUserId()
    const rawObservaciones = loadObservaciones()

    const observations: ObservationWithMeta[] = useMemo(() => {
        if (!Array.isArray(rawObservaciones[0])) return []

        return ((rawObservaciones as unknown) as any[][]).map((arr, globalIndex) => {
            // Format: [userId, finca, bloque, cama, arroz, arveja, garbanzo, color, abierto, fecha, gps, syncStatus, observacionId]
            // Find which stage has a value (indices 4-8, offset by 1 due to userId at index 0)
            const stageIndex = arr.slice(4, 9).findIndex((v: any) => v && v !== '0')
            const stageName = stageIndex >= 0 ? STAGE_LABELS[stageIndex] : ''
            const cantidad = stageIndex >= 0 ? Number(arr[4 + stageIndex]) || 0 : 0

            return {
                userId: arr[0] ? parseInt(arr[0]) : currentUserId,
                finca: arr[1],
                bloque: arr[2],
                cama: arr[3],
                estado: stageName,
                cantidad: cantidad,
                fecha: arr[9],  // Index 9 is the timestamp
                gps: arr[10] ? JSON.parse(arr[10]) : undefined,  // Index 10 is the GPS
                syncStatus: arr[11] || 'pending',  // Index 11 is syncStatus
                observacionId: arr[12] ? parseInt(arr[12]) : undefined,  // Index 12 is observacionId
                originalArr: arr,
                globalIndex
            }
        })
    }, [rawObservaciones, currentUserId])

    const grouped: GroupedObservations = useMemo(() => {
        // Group by date first - using GPS timezone for accurate date grouping
        const byDate = groupBy(observations, (obs: ObservationWithMeta) => {
            return formatDateGroupInRecordedTimezone(obs.fecha, obs.gps)
        })        // Then group by location within each date
        return Object.fromEntries(
            Object.entries(byDate).map(([date, obsArr]) => [
                date,
                groupBy(obsArr, obs => `${date}-${obs.finca}-${obs.bloque}-${obs.cama}`)
            ])
        )
    }, [observations])

    return {
        observations,
        grouped,
        stageLabels: STAGE_LABELS,
        currentUserId
    }
}
