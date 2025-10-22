import { useState, useEffect } from 'react'
import { captureCurrentLocation } from '@/lib/gpsCapture'
import { playTileTone } from '@/lib/tileAudio'
import { loadObservaciones, saveObservacionesArray } from '@/lib/observationStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import { OBSERVATION_CONFIG, ALL_OBSERVATION_FIELDS, UseObservationsReturn } from '@/types'

const SENSOR_FIELDS = new Set(['conductividad_suelo', 'humedad', 'temperatura_suelo'])

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
     * For estados: returns sum of all values
     * For sensores: returns most recent value only
     * Array structure: [userId, fecha, gps, finca, bloque, cama, arroz, arveja, garbanzo, color, abierto, ...]
     * Note: obsIndex is from the UI perspective (0-10), but in storage we have metadata at start
     */
    const getSum = (obsIndex: number, location: [string, string, string], date: string, mode?: 'estados' | 'sensores'): number => {
        const filtered = observaciones.filter(row => {
            // Filter by location (now at indices 3-5)
            const matchesLocation =
                row[3] === location[0] &&  // finca at index 3
                row[4] === location[1] &&  // bloque at index 4
                row[5] === location[2];    // cama at index 5

            if (!matchesLocation) return false;

            // Filter by date using GPS timezone
            const gps = row[2] ? JSON.parse(row[2]) : undefined;  // gps at index 2
            const obsDate = formatDateGroupInRecordedTimezone(row[1], gps);  // fecha at index 1
            return obsDate === date;
        });

        // Calculate storage index
        const storageIndex = obsIndex < OBSERVATION_CONFIG.location.length
            ? obsIndex + 3  // Location: add 3 for userId, fecha, gps
            : obsIndex + 3; // Status: same offset (0-based to storage)

        // For sensores mode, return most recent value instead of sum
        if (mode === 'sensores' && filtered.length > 0) {
            const lastObservation = filtered[filtered.length - 1];
            return parseInt(lastObservation[storageIndex]) || 0;
        }

        // For estados mode (or default), sum all values
        const sum = filtered.reduce((acc, row) => {
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

            const fieldName = ALL_OBSERVATION_FIELDS[i]

            if (isStatusField && isLocationComplete && fieldName) {
                const recordedAt = new Date().toISOString()
                const locationTuple = updatedObservacion.slice(0, OBSERVATION_CONFIG.location.length) as [string, string, string]
                const displayDate = formatDateGroupInRecordedTimezone(recordedAt, undefined)
                const isSensorField = SENSOR_FIELDS.has(fieldName)
                const sumMode: 'estados' | 'sensores' = isSensorField ? 'sensores' : 'estados'
                const previousSum = getSum(i, locationTuple, displayDate, sumMode)
                const numericVal = parseFloat(val)
                const delta = Number.isNaN(numericVal) ? 0 : numericVal
                const newSum = isSensorField ? delta : previousSum + delta

                if (newSum !== previousSum) {
                    playTileTone(fieldName)
                }
                const baseObservation = [
                    userId,     // index 0
                    recordedAt,  // index 1
                    '',         // index 2 placeholder for GPS
                    ...updatedObservacion.slice(0, OBSERVATION_CONFIG.location.length),
                    '', '', '', '', '', '', '', ''
                ]
                baseObservation[i + 3] = val

                let newIndex = -1
                setObservaciones(prevObs => {
                    const next = [...prevObs]
                    newIndex = next.length
                    next.push(baseObservation)
                    return next
                })

                captureCurrentLocation()
                    .then(gpsCoords => {
                        if (!gpsCoords) return
                        const gpsJson = JSON.stringify(gpsCoords)
                        setObservaciones(prevObs => {
                            if (newIndex < 0 || newIndex >= prevObs.length) return prevObs
                            const next = [...prevObs]
                            const updated = [...next[newIndex]]
                            updated[2] = gpsJson
                            next[newIndex] = updated
                            return next
                        })
                    })
                    .catch(error => {
                        console.error('Error capturing GPS:', error)
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
