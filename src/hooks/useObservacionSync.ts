import { useState } from 'react'
import { syncObservationToSupabase } from '@/services/supabaseService'
import { loadObservaciones, saveObservacionesArray } from '@/lib/observationStorage'
import type { ObservationWithMeta } from '@/types'

export function useObservacionSync() {
    const [uploading, setUploading] = useState<string | null>(null)
    const [synced, setSynced] = useState<Set<string>>(new Set())
    const [errors, setErrors] = useState<Set<string>>(new Set())

    // Check if all observations in a group are synced
    const areAllSynced = (observations: ObservationWithMeta[]): boolean => {
        return observations.every(obs => obs.syncStatus === 'success')
    }

    // Upload all observations for a location
    const handleSync = async (observations: ObservationWithMeta[], locationKey: string) => {
        setUploading(locationKey)
        setErrors(prev => {
            const next = new Set(prev)
            next.delete(locationKey)
            return next
        })

        const raw = loadObservaciones()

        try {
            for (const obs of observations) {
                if (obs.syncStatus === 'success') continue // Skip already uploaded

                const observacionId = await syncObservationToSupabase(obs)

                // Update localStorage with success status
                if (obs.globalIndex !== undefined) {
                    raw[obs.globalIndex][14] = 'success'  // syncStatus at index 14
                    raw[obs.globalIndex][15] = String(observacionId)  // observacionId at index 15
                }
            }

            saveObservacionesArray(raw)
            setSynced(prev => new Set(prev).add(locationKey))
            setUploading(null)
        } catch (err: any) {
            setErrors(prev => new Set(prev).add(locationKey))
            setUploading(null)

            // Save partial progress
            saveObservacionesArray(raw)
            alert(`Error: ${err.message}`)
        }
    }

    // Upload single observation
    const handleSyncOne = async (obs: ObservationWithMeta) => {
        if (obs.syncStatus === 'success') return // Already uploaded

        const raw = loadObservaciones()

        try {
            const observacionId = await syncObservationToSupabase(obs)

            // Update localStorage with success status
            if (obs.globalIndex !== undefined) {
                raw[obs.globalIndex][14] = 'success'
                raw[obs.globalIndex][15] = String(observacionId)
                saveObservacionesArray(raw)
            }

            // Refresh page to show updated status
            window.location.reload()
        } catch (err: any) {
            alert(`Error: ${err.message}`)
        }
    }

    return {
        uploading,
        synced,
        errors,
        areAllSynced,
        handleSync,
        handleSyncOne
    }
}
