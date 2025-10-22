import { useMemo } from 'react'
import { groupBy } from 'lodash'
import { getCurrentUserId } from '@/lib/auth'
import { loadObservaciones } from '@/lib/observationStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import type { ObservationWithMeta, GroupedObservations } from '@/types'

export const STAGE_LABELS = ["arroz", "arveja", "garbanzo", "color", "abierto", "conductividad_suelo", "humedad", "temperatura_suelo"] as const

export function useObservacionData() {
    const currentUserId = getCurrentUserId()
    const rawObservaciones = loadObservaciones()

    const observations: ObservationWithMeta[] = useMemo(() => {
        if (!Array.isArray(rawObservaciones[0])) return []

        return ((rawObservaciones as unknown) as any[][]).map((arr, globalIndex) => {
            // New format: [userId, fecha, gps, finca, bloque, cama, arroz, arveja, garbanzo, color, abierto, conductividad_suelo, humedad, temperatura_suelo, syncStatus, observacionId]
            // Indices:     0       1      2    3      4       5     6      7       8         9      10       11                   12       13                 14          15

            // Find which stage has a value (status fields are at indices 6-13)
            const stageIndex = arr.slice(6, 14).findIndex((v: any) => v && v !== '0')
            const stageName = stageIndex >= 0 ? STAGE_LABELS[stageIndex] : ''
            const cantidad = stageIndex >= 0 ? Number(arr[6 + stageIndex]) || 0 : 0

            return {
                userId: arr[0] ? parseInt(arr[0]) : currentUserId,
                finca: arr[3],
                bloque: arr[4],
                cama: arr[5],
                estado: stageName,
                cantidad: cantidad,
                fecha: arr[1],  // Index 1 is the timestamp
                gps: arr[2] ? JSON.parse(arr[2]) : undefined,  // Index 2 is the GPS
                syncStatus: arr[14] || 'pending',  // Index 14 is syncStatus
                observacionId: arr[15] ? parseInt(arr[15]) : undefined,  // Index 15 is observacionId
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
