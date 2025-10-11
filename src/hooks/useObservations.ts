import { useState, useEffect } from 'react'
import { captureCurrentLocation } from '@/lib/gpsCapture'
import { loadObservaciones, saveObservacionesArray } from '@/lib/observationStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import { OBSERVATION_CONFIG, ALL_OBSERVATION_FIELDS, UseObservationsReturn } from '@/types'

// Calculate total number of fields in observation array
const TOTAL_FIELD_COUNT = OBSERVATION_CONFIG.location.length + OBSERVATION_CONFIG.status.length

export function useObservations(userId: string): UseObservationsReturn {
    // Current observation state (8 empty strings for the 8 fields)
    const [observacion, setObservacion] = useState<string[]>(
        Array(TOTAL_FIELD_COUNT).fill('')
    )

    // All saved observations loaded from localStorage
    const convertToArray = (obs: any): string[] => {
        // If already an array, return as is
        if (Array.isArray(obs)) return obs;
        // Otherwise, convert Observation object to array in expected order
        return [
            obs.finca ?? '',
            obs.bloque ?? '',
            obs.cama ?? '',
            obs.arroz ?? '',
            obs.arveja ?? '',
            obs.garbanzo ?? '',
            obs.color ?? '',
            obs.abierto ?? '',
            obs.usuario_id ?? '',
            obs.fecha ?? '',
            obs.gps ? JSON.stringify(obs.gps) : ''
        ];
    };

    const [observaciones, setObservaciones] = useState<string[][]>(() => {
        const raw = loadObservaciones();
        return Array.isArray(raw) && Array.isArray(raw[0])
            ? (raw as unknown as string[][])
            : Array.isArray(raw)
                ? (raw as any[]).map(convertToArray)
                : [];
    });

    // Persist observations to localStorage whenever they change
    useEffect(() => {
        saveObservacionesArray(observaciones);
    }, [observaciones])

    /**
     * Calculate sum of a specific field for observations matching location and date
     * Note: obsIndex is from the UI perspective (0-7), but in storage userId is at index 0,
     * so we need to account for the offset when filtering by location
     */
    const getSum = (obsIndex: number, location: [string, string, string], date: string): number => {
        const filtered = observaciones.filter(row => {
            // Filter by location
            const matchesLocation =
                row[1] === location[0] &&  // finca is now at index 1 (was 0)
                row[2] === location[1] &&  // bloque is now at index 2 (was 1)
                row[3] === location[2];    // cama is now at index 3 (was 2)

            if (!matchesLocation) return false;

            // Filter by date using GPS timezone
            const gps = row[10] ? JSON.parse(row[10]) : undefined;
            const obsDate = formatDateGroupInRecordedTimezone(row[9], gps);
            return obsDate === date;
        });

        const sum = filtered.reduce((acc, row) => {
            // obsIndex from UI needs +1 offset for storage (because userId is at index 0)
            const storageIndex = obsIndex < OBSERVATION_CONFIG.location.length ? obsIndex + 1 : obsIndex + 1;
            const val = parseInt(row[storageIndex]) || 0;
            return acc + val;
        }, 0);
        return sum;
    };

    /**
     * Save a value to the current observation
     * If it's a location field, resets all subsequent fields
     * If it's a status field and location is complete, saves to observaciones with GPS
     */
    const save = async (i: number, val: string): Promise<void> => {
        setObservacion(prev => {
            const updatedObservacion = [...prev]
            updatedObservacion[i] = val

            // Reset all fields after the current one if it's a location field
            if (i < OBSERVATION_CONFIG.location.length) {
                for (let j = i + 1; j < updatedObservacion.length; j++) {
                    updatedObservacion[j] = ''
                }
            }

            // If it's a status field and location is complete, save to observaciones
            const isStatusField = i >= OBSERVATION_CONFIG.location.length
            const isLocationComplete =
                updatedObservacion[0] &&
                updatedObservacion[1] &&
                updatedObservacion[2]

            if (isStatusField && isLocationComplete) {
                // Capture GPS and save asynchronously (outside of setState)
                captureCurrentLocation()
                    .then(gpsCoords => {
                        // Build the observation record to save
                        // Start with userId, then location fields, then empty status fields
                        const toSave = [
                            userId, // userId at index 0
                            ...updatedObservacion.slice(0, OBSERVATION_CONFIG.location.length),
                            '', '', '', '', ''
                        ]

                        // Set the specific status field that was entered (offset by 1 due to userId at index 0)
                        toSave[i + 1] = val

                        // Add metadata: timestamp, GPS (store as JSON string for localStorage)
                        toSave.push(new Date().toISOString())
                        toSave.push(gpsCoords ? JSON.stringify(gpsCoords) : '')

                        console.log('Saving observation:', toSave)

                        // Add to observations array (triggers localStorage save via useEffect)
                        setObservaciones(prevObs => [...prevObs, toSave])
                    })
                    .catch(error => {
                        console.error('Error capturing GPS or saving observation:', error)
                        // TODO: Show user-facing error message
                    })
            }

            return updatedObservacion
        })
    }

    return {
        observacion,
        observaciones,
        items: ALL_OBSERVATION_FIELDS,
        locationFieldCount: OBSERVATION_CONFIG.location.length,
        save,
        getSum,
    }
}
