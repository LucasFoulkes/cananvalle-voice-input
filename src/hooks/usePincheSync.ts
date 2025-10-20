import { useState } from 'react'
import { syncPincheToSupabase } from '@/services/pincheService'
import { loadPinches, savePinchesArray } from '@/lib/pincheStorage'
import type { PincheWithMeta } from '@/types'

export function usePincheSync() {
    const [uploading, setUploading] = useState<string | null>(null)
    const [synced, setSynced] = useState<Set<string>>(new Set())
    const [errors, setErrors] = useState<Set<string>>(new Set())

    // Check if all pinches in a group are synced
    const areAllSynced = (pinches: PincheWithMeta[]): boolean => {
        return pinches.every(p => p.syncStatus === 'success')
    }

    // Upload all pinches for a location
    const handleSync = async (pinches: PincheWithMeta[], locationKey: string) => {
        setUploading(locationKey)
        setErrors(prev => {
            const next = new Set(prev)
            next.delete(locationKey)
            return next
        })

        const raw = loadPinches()

        try {
            for (const p of pinches) {
                if (p.syncStatus === 'success') continue // Skip already uploaded

                const pincheId = await syncPincheToSupabase(p)

                // Update localStorage with success status
                // Array structure: [userId, fecha, gps, finca, bloque, variedadId, variedadNombre, apertura, programado, sanitario, syncStatus, pincheId]
                if (p.globalIndex !== undefined) {
                    raw[p.globalIndex][10] = 'success'  // syncStatus at index 10
                    raw[p.globalIndex][11] = String(pincheId)  // pincheId at index 11
                }
            }

            savePinchesArray(raw)
            setSynced(prev => new Set(prev).add(locationKey))
            setUploading(null)
        } catch (err: any) {
            setErrors(prev => new Set(prev).add(locationKey))
            setUploading(null)

            // Save partial progress
            savePinchesArray(raw)
            alert(`Error: ${err.message}`)
        }
    }

    // Upload single pinche
    const handleSyncOne = async (p: PincheWithMeta) => {
        if (p.syncStatus === 'success') return // Already uploaded

        const raw = loadPinches()

        try {
            const pincheId = await syncPincheToSupabase(p)

            // Update localStorage with success status
            // Array structure: [userId, fecha, gps, finca, bloque, variedadId, variedadNombre, apertura, programado, sanitario, syncStatus, pincheId]
            if (p.globalIndex !== undefined) {
                raw[p.globalIndex][10] = 'success'  // syncStatus at index 10
                raw[p.globalIndex][11] = String(pincheId)  // pincheId at index 11
                savePinchesArray(raw)
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
