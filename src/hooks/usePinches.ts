import { useState, useEffect } from 'react'
import { captureCurrentLocation } from '@/lib/gpsCapture'
import { playTileTone } from '@/lib/tileAudio'
import { loadPinches, savePinchesArray } from '@/lib/pincheStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import { PINCHE_CONFIG, ALL_PINCHE_FIELDS, UsePinchesReturn } from '@/types'

// Calculate total number of fields in pinche array
const TOTAL_FIELD_COUNT = PINCHE_CONFIG.location.length + PINCHE_CONFIG.tipos.length

export function usePinches(userId: string): UsePinchesReturn {
    // Current pinche state (5 fields: bloque, cama, apertura, programado, sanitario)
    const [pinche, setPinche] = useState<string[]>(
        Array(TOTAL_FIELD_COUNT).fill('')
    )

    // All saved pinches loaded from localStorage
    const convertToArray = (p: any): string[] => {
        // If already an array, return as is
        if (Array.isArray(p)) return p;
        // Otherwise, convert Pinche object to array in expected order
        // [userId, fecha, gps, finca, bloque, cama, apertura, programado, sanitario, syncStatus, pincheId]
        return [
            p.usuario_id ?? '',
            p.fecha ?? '',
            p.gps ? JSON.stringify(p.gps) : '',
            p.finca ?? '',
            p.bloque ?? '',
            p.cama ?? '',
            p.apertura ?? '',
            p.programado ?? '',
            p.sanitario ?? '',
            p.syncStatus ?? 'pending',
            p.pincheId?.toString() ?? ''
        ];
    };

    const [pinches, setPinches] = useState<string[][]>(() => {
        const raw = loadPinches();
        return Array.isArray(raw) && Array.isArray(raw[0])
            ? (raw as unknown as string[][])
            : Array.isArray(raw)
                ? (raw as any[]).map(convertToArray)
                : [];
    });

    // Persist pinches to localStorage whenever they change
    useEffect(() => {
        savePinchesArray(pinches);
    }, [pinches])

    /**
     * Calculate sum of a specific field for pinches matching location and date
     * Array structure: [userId, fecha, gps, finca, bloque, cama, apertura, programado, sanitario, syncStatus, pincheId]
     * Note: pincheIndex is from the UI perspective (0-5), but in storage we have metadata at start
     */
    const getSum = (pincheIndex: number, location: [string, string, string], date: string): number => {
        const filtered = pinches.filter(row => {
            // Filter by location (finca at index 3, bloque at index 4, cama at index 5)
            const matchesLocation =
                row[3] === location[0] &&  // finca at index 3
                row[4] === location[1] &&  // bloque at index 4
                row[5] === location[2];    // cama at index 5

            if (!matchesLocation) return false;

            // Filter by date using GPS timezone
            const gps = row[2] ? JSON.parse(row[2]) : undefined;  // gps at index 2
            const pincheDate = formatDateGroupInRecordedTimezone(row[1], gps);  // fecha at index 1
            return pincheDate === date;
        });

        // Calculate storage index
        const storageIndex = pincheIndex < PINCHE_CONFIG.location.length
            ? pincheIndex + 3  // Location: add 3 for userId, fecha, gps
            : pincheIndex + 3; // Tipos: same offset (0-based to storage)

        // Sum all values
        const sum = filtered.reduce((acc, row) => {
            const val = parseInt(row[storageIndex]) || 0;
            return acc + val;
        }, 0);
        return sum;
    };

    /**
     * Save a value to the current pinche
     * If it's a location field, resets all subsequent fields
     * If it's a tipo field and location is complete, saves to pinches with GPS
     */
    const save = async (i: number, val: string): Promise<void> => {
        const isLocationField = i < PINCHE_CONFIG.location.length
        const fieldName = ALL_PINCHE_FIELDS[i]

        if (isLocationField) {
            // Reset all fields from this index onward
            setPinche(prev => {
                const next = [...prev]
                for (let j = i; j < next.length; j++) {
                    next[j] = ''
                }
                next[i] = val
                return next
            })
            if (fieldName) {
                playTileTone(fieldName)
            }
            return
        }

        // It's a tipo field
        const newPinche = [...pinche]
        newPinche[i] = val

        // Check if location is complete (finca, bloque and cama filled)
        const isLocationComplete = newPinche.slice(0, PINCHE_CONFIG.location.length)
            .every(field => field !== '')

        if (isLocationComplete) {
            try {
                // Capture GPS location
                const gpsLocation = await captureCurrentLocation()

                // Persist: [userId, fecha, gps, finca, bloque, cama, apertura, programado, sanitario, syncStatus, pincheId]
                const newRow = [
                    userId,
                    new Date().toISOString(),
                    gpsLocation ? JSON.stringify(gpsLocation) : '',
                    ...newPinche,
                    'pending',  // syncStatus
                    ''          // pincheId (empty until synced)
                ]

                setPinches(prev => {
                    const next = [...prev, newRow]
                    savePinchesArray(next)
                    return next
                })

                // Reset tipo fields but keep location
                setPinche(prev => {
                    const next = [...prev]
                    for (let j = PINCHE_CONFIG.location.length; j < next.length; j++) {
                        next[j] = ''
                    }
                    return next
                })

                if (fieldName) {
                    playTileTone(fieldName)
                }
            } catch (error) {
                console.error('Error capturing GPS:', error)
                // Save anyway without GPS
                const newRow = [
                    userId,
                    new Date().toISOString(),
                    '',
                    ...newPinche,
                    'pending',  // syncStatus
                    ''          // pincheId (empty until synced)
                ]
                setPinches(prev => {
                    const next = [...prev, newRow]
                    savePinchesArray(next)
                    return next
                })

                // Reset tipo fields but keep location
                setPinche(prev => {
                    const next = [...prev]
                    for (let j = PINCHE_CONFIG.location.length; j < next.length; j++) {
                        next[j] = ''
                    }
                    return next
                })
                if (fieldName) {
                    playTileTone(fieldName)
                }
            }
        } else {
            // Location not complete yet, just update the field
            setPinche(newPinche)
            if (fieldName) {
                playTileTone(fieldName)
            }
        }
    }

    return {
        pinche,
        pinches,
        items: ALL_PINCHE_FIELDS,
        locationFieldCount: PINCHE_CONFIG.location.length,
        save,
        getSum
    }
}
