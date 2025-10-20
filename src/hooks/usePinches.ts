import { useState, useEffect } from 'react'
import { captureCurrentLocation } from '@/lib/gpsCapture'
import { playTileTone } from '@/lib/tileAudio'
import { loadPinches, savePinchesArray } from '@/lib/pincheStorage'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import { PINCHE_CONFIG, ALL_PINCHE_FIELDS, UsePinchesReturn, type VariedadOption } from '@/types'
import { findVariedad, findVariedadByNombre } from '@/lib/variedades'

// Calculate total number of fields in pinche array
const TOTAL_FIELD_COUNT = PINCHE_CONFIG.location.length + PINCHE_CONFIG.tipos.length

const LOCATION_STORAGE_INDEX = [3, 4, 6] as const
const TIPO_STORAGE_INDEX = [7, 8, 9] as const

export function usePinches(userId: string): UsePinchesReturn {
    // Current pinche state (6 fields: finca, bloque, variedad, apertura, programado, sanitario)
    const [pinche, setPinche] = useState<string[]>(
        Array(TOTAL_FIELD_COUNT).fill('')
    )
    const [selectedVariedad, setSelectedVariedad] = useState<VariedadOption | null>(null)

    // All saved pinches loaded from localStorage
    const convertToArray = (p: any): string[] => {
        if (Array.isArray(p)) {
            // Already stored as array; upgrade old format if needed
            if (p.length >= 12) {
                return p as string[]
            }

            if (p.length === 11) {
                const [userId, fecha, gps, finca, bloque, _legacyCama, apertura, programado, sanitario, syncStatus, pincheId] = p
                return [
                    userId ?? '',
                    fecha ?? '',
                    gps ?? '',
                    finca ?? '',
                    bloque ?? '',
                    '',      // variedadId (unknown in legacy data)
                    '',      // variedadNombre
                    apertura ?? '',
                    programado ?? '',
                    sanitario ?? '',
                    syncStatus ?? 'pending',
                    pincheId ?? ''
                ]
            }

            return p as string[]
        }

        // Convert legacy object shape into array format
        return [
            p.usuario_id ?? '',
            p.fecha ?? '',
            p.gps ? JSON.stringify(p.gps) : '',
            p.finca ?? '',
            p.bloque ?? '',
            p.variedadId?.toString() ?? '',
            p.variedad ?? p.variedadNombre ?? '',
            p.apertura ?? '',
            p.programado ?? '',
            p.sanitario ?? '',
            p.syncStatus ?? 'pending',
            p.pincheId?.toString() ?? ''
        ]
    }

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
     * Array structure: [userId, fecha, gps, finca, bloque, variedadId, variedadNombre, apertura, programado, sanitario, syncStatus, pincheId]
     * Note: pincheIndex is from the UI perspective (0-5), but in storage we have metadata at start
     */
    const getSum = (pincheIndex: number, location: [string, string, string], date: string): number => {
        const filtered = pinches.filter(row => {
            const matchesLocation =
                row[LOCATION_STORAGE_INDEX[0]] === location[0] &&
                row[LOCATION_STORAGE_INDEX[1]] === location[1] &&
                row[LOCATION_STORAGE_INDEX[2]] === location[2]

            if (!matchesLocation) return false

            const gps = row[2] ? JSON.parse(row[2]) : undefined
            const pincheDate = formatDateGroupInRecordedTimezone(row[1], gps)
            return pincheDate === date
        })

        let storageIndex: number | undefined
        if (pincheIndex < PINCHE_CONFIG.location.length) {
            storageIndex = LOCATION_STORAGE_INDEX[pincheIndex]
        } else {
            const tipoIndex = pincheIndex - PINCHE_CONFIG.location.length
            storageIndex = TIPO_STORAGE_INDEX[tipoIndex]
        }

        if (storageIndex === undefined) {
            return 0
        }

        return filtered.reduce((acc, row) => {
            const val = parseInt(row[storageIndex]) || 0
            return acc + val
        }, 0)
    }

    /**
     * Save a value to the current pinche
     * If it's a location field, resets all subsequent fields
     * If it's a tipo field and location is complete, saves to pinches with GPS
     */
    const save = async (i: number, val: string): Promise<void> => {
        const isLocationField = i < PINCHE_CONFIG.location.length
        const fieldName = ALL_PINCHE_FIELDS[i]

        if (isLocationField) {
            let nextState: string[] = []
            setPinche(prev => {
                const next = [...prev]
                for (let j = i; j < next.length; j++) {
                    next[j] = ''
                }
                next[i] = val
                nextState = next
                return next
            })

            if (fieldName === 'variedad') {
                if (!val) {
                    setSelectedVariedad(null)
                } else {
                    const resolved = findVariedadByNombre(nextState[0], nextState[1], val) ?? selectedVariedad
                    setSelectedVariedad(resolved ?? null)
                }
            } else if (i < PINCHE_CONFIG.location.length - 1) {
                setSelectedVariedad(null)
            }

            if (fieldName) {
                playTileTone(fieldName)
            }
            return
        }

        // It's a tipo field
        const newPinche = [...pinche]
        newPinche[i] = val

        // Check if location is complete (finca, bloque y variedad)
        const isLocationComplete = newPinche.slice(0, PINCHE_CONFIG.location.length)
            .every(field => field !== '')

        if (isLocationComplete) {
            const resolvedVariedad = selectedVariedad
                ?? findVariedadByNombre(newPinche[0], newPinche[1], newPinche[2])
                ?? findVariedad(newPinche[0], newPinche[1], newPinche[2])
            const variedadIdString = resolvedVariedad ? resolvedVariedad.id.toString() : ''
            const variedadNombre = resolvedVariedad ? resolvedVariedad.nombre : newPinche[2]
            if (resolvedVariedad && resolvedVariedad.nombre !== newPinche[2]) {
                newPinche[2] = resolvedVariedad.nombre
            }
            setSelectedVariedad(resolvedVariedad ?? null)

            const recordedAt = new Date().toISOString()
            const newRow = [
                userId,
                recordedAt,
                '',
                newPinche[0],
                newPinche[1],
                variedadIdString,
                variedadNombre,
                newPinche[3],
                newPinche[4],
                newPinche[5],
                'pending',  // syncStatus
                ''          // pincheId (empty until synced)
            ]

            let newIndex = -1
            setPinches(prev => {
                const next = [...prev]
                newIndex = next.length
                next.push(newRow)
                savePinchesArray(next)
                return next
            })

            // Reset tipo fields but keep location so the user can continue quickly
            setPinche(() => {
                const next = [...newPinche]
                for (let j = PINCHE_CONFIG.location.length; j < next.length; j++) {
                    next[j] = ''
                }
                return next
            })

            if (fieldName) {
                playTileTone(fieldName)
            }

            captureCurrentLocation()
                .then(gpsLocation => {
                    if (!gpsLocation) return
                    const gpsJson = JSON.stringify(gpsLocation)
                    setPinches(prev => {
                        if (newIndex < 0 || newIndex >= prev.length) return prev
                        const next = [...prev]
                        const updated = [...next[newIndex]]
                        updated[2] = gpsJson
                        next[newIndex] = updated
                        savePinchesArray(next)
                        return next
                    })
                })
                .catch(error => {
                    console.error('Error capturing GPS:', error)
                })
        } else {
            // Location not complete yet, just update the field
            setPinche(newPinche)
            if (fieldName) {
                playTileTone(fieldName)
            }
        }
    }

    const selectVariedad = (option: VariedadOption | null) => {
        if (!option) {
            setSelectedVariedad(null)
            void save(2, '')
            return
        }

        setSelectedVariedad(option)
        void save(2, option.nombre)
    }

    return {
        pinche,
        pinches,
        items: ALL_PINCHE_FIELDS,
        locationFieldCount: PINCHE_CONFIG.location.length,
        selectedVariedad,
        selectVariedad,
        save,
        getSum
    }
}
