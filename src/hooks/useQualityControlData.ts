import { useMemo } from 'react'

export interface CamaTimeRange {
    label: string
    start: number
    end: number
    count: number
    totalTallos: number
}

export interface UserQualityData {
    userId: string
    usuario: any
    observations: any[]
    camaData: CamaTimeRange[]
    dayStart: number
    dayEnd: number
    totalMs: number
    totalTallos: number
}

export function useQualityControlData(observations: any[]): UserQualityData[] {
    return useMemo(() => {
        // Group by user
        const byUser = observations.reduce((acc: any, obs: any) => {
            const userId = obs.id_usuario || 'sin_usuario'
            if (!acc[userId]) {
                acc[userId] = {
                    usuario: obs.usuario,
                    observations: []
                }
            }
            acc[userId].observations.push(obs)
            return acc
        }, {})

        // Process each user
        return Object.entries(byUser).map(([userId, data]: [string, any]) => {
            // Group by cama
            const byCama = data.observations.reduce((acc: any, obs: any) => {
                const camaKey = `F${obs.cama?.grupo_cama?.bloque?.id_finca}B${obs.cama?.grupo_cama?.bloque?.nombre}C${obs.cama?.nombre}`
                if (!acc[camaKey]) {
                    acc[camaKey] = {
                        label: camaKey,
                        observations: []
                    }
                }
                acc[camaKey].observations.push(obs)
                return acc
            }, {})

            // Calculate time ranges for each cama
            const camaData: CamaTimeRange[] = Object.values(byCama).map((cama: any) => {
                const sorted = cama.observations.sort((a: any, b: any) =>
                    new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
                )
                // Calculate total tallos (sum of all cantidad values)
                const totalTallos = sorted.reduce((sum: number, obs: any) =>
                    sum + (parseInt(obs.cantidad) || 0), 0
                )
                return {
                    label: cama.label,
                    start: new Date(sorted[0].creado_en).getTime(),
                    end: new Date(sorted[sorted.length - 1].creado_en).getTime(),
                    count: sorted.length,
                    totalTallos
                }
            })

            // Sort by start time
            camaData.sort((a, b) => a.start - b.start)

            // Calculate total time span
            const dayStart = Math.min(...camaData.map(c => c.start))
            const dayEnd = Math.max(...camaData.map(c => c.end))
            const totalMs = dayEnd - dayStart

            // Calculate total tallos across all camas
            const totalTallos = camaData.reduce((sum, cama) => sum + cama.totalTallos, 0)

            return {
                userId,
                usuario: data.usuario,
                observations: data.observations,
                camaData,
                dayStart,
                dayEnd,
                totalMs,
                totalTallos
            }
        })
    }, [observations])
}
