import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { Observation, GpsLocation } from '@/types'
import { useVosk } from '@/hooks/useVosk'
import TileButton from '@/components/TileButton'
import { interpretVoiceText, HIERARCHY, type ContextKey } from '@/lib/commandEngine'
import { Mic, Loader2 } from 'lucide-react'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getCurrentUser } from '@/lib/auth'

// Utility function to generate UUID
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// Sound feedback functions - use Web Audio API for simple tones
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

function playTone(frequency: number, duration: number = 100) {
    if (!audioContext) return
    try {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration / 1000)
    } catch (e) {
        console.warn('Audio playback failed:', e)
    }
}

// Different tones for different command types
const TONES = {
    finca: 440,    // A4
    bloque: 523,   // C5
    cama: 659,     // E5
    arroz: 784,    // G5
    arveja: 880,   // A5
    garbanzo: 988, // B5
    color: 1047,   // C6
    abierto: 1175  // D6
}

// Vibration patterns for different command types
const VIBRATION_PATTERNS = {
    finca: [50],           // Single short
    bloque: [50, 30, 50],  // Double tap
    cama: [50, 30, 50, 30, 50], // Triple tap
    arroz: [100],          // Single medium
    arveja: [100],
    garbanzo: [100],
    color: [100],
    abierto: [100]
}

// Request vibration permission on first use (Android only - iOS doesn't support vibration API)
let vibrationRequested = false

function vibrate(pattern: number[]) {
    if (!navigator.vibrate) {
        console.log('Vibration API not supported on this device')
        return
    }

    // Request permission on first use
    if (!vibrationRequested) {
        vibrationRequested = true
        // Trigger a small test vibration to request permission
        try {
            navigator.vibrate(1)
        } catch (e) {
            console.warn('Vibration permission failed:', e)
        }
    }

    // Perform actual vibration
    try {
        navigator.vibrate(pattern)
    } catch (e) {
        console.warn('Vibration failed:', e)
    }
}

// Get local time as ISO string (without timezone conversion)
function getLocalISOString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
}

// Function to capture GPS location
async function captureGpsLocation(): Promise<GpsLocation | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null)
            return
        }

        const currentUser = getCurrentUser()

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const gps: GpsLocation = {
                    id: generateUUID(),
                    usuario_id: currentUser ? String(currentUser.id_usuario) : null,
                    latitud: position.coords.latitude,
                    longitud: position.coords.longitude,
                    precision: position.coords.accuracy,
                    altitud: position.coords.altitude,
                    creado_en: getLocalISOString()
                }
                resolve(gps)
            },
            (error) => {
                console.warn('GPS capture failed:', error)
                resolve(null)
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        )
    })
}

type Location = {
    finca: string
    bloque: string
    cama: string
}

type LoadingState = 'idle' | 'loading' | 'ready'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate()
    const [location, setLocation] = useState<Location>({
        finca: '',
        bloque: '',
        cama: ''
    })
    const [observaciones, setObservaciones] = useState<Observation[]>(() => {
        try {
            const raw = localStorage.getItem('observaciones')
            const parsed = raw ? JSON.parse(raw) : []
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    })
    const [command, setCommand] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [loadingState, setLoadingState] = useState<LoadingState>('idle')
    const lastProcessedRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 })
    const [manualInputDialog, setManualInputDialog] = useState<{ type: 'location' | 'estado'; key: string } | null>(null)
    const [manualInputValue, setManualInputValue] = useState('')

    useEffect(() => {
        try {
            localStorage.setItem('observaciones', JSON.stringify(observaciones))
        } catch { /* ignore */ }
    }, [observaciones])

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 3000)
            return () => clearTimeout(timer)
        }
    }, [errorMessage])

    const onVoiceText = useCallback((text: string, isFinal: boolean) => {
        if (!isFinal) return

        const now = Date.now()

        // Prevent duplicate processing within 200ms
        if (lastProcessedRef.current.text === text && (now - lastProcessedRef.current.timestamp) < 200) {
            console.log('DEBUG: Skipping duplicate within 200ms', text)
            return
        }

        lastProcessedRef.current = { text, timestamp: now }
        console.log('DEBUG: onVoiceText called', { text, command, location })

        const result = interpretVoiceText(command, text)
        console.log('DEBUG: interpretVoiceText result', result)
        setCommand(result.buffer)

        // Use events array if multiple commands, otherwise use single event
        const eventsToProcess = result.events || (result.event ? [result.event] : [])

        if (eventsToProcess.length === 0) return

        // Process each event in order
        eventsToProcess.forEach((event, index) => {
            const isLastEvent = index === eventsToProcess.length - 1

            // Handle navigation commands
            if (event.type === 'navigate') {
                navigate({ to: event.to })
                setCommand('')
                setErrorMessage('')
                return
            }

            // Handle location context updates using hierarchy
            if (event.type === 'context') {
                console.log('DEBUG: context event', { key: event.key, value: event.value, currentLocation: location })
                const hierarchyIndex = HIERARCHY.indexOf(event.key)

                // Play tone and vibrate for this location level (with slight delay for multiple commands)
                setTimeout(() => {
                    const tone = TONES[event.key as keyof typeof TONES]
                    if (tone) playTone(tone)

                    const pattern = VIBRATION_PATTERNS[event.key as keyof typeof VIBRATION_PATTERNS]
                    if (pattern) vibrate(pattern)
                }, index * 150)

                // Use functional update to get the latest location state
                setLocation(prevLocation => {
                    const newLocation = { ...prevLocation }

                    // Set the current level
                    const value = event.key === 'cama'
                        ? String(event.value).padStart(2, '0')
                        : String(event.value)
                    newLocation[event.key] = value

                    // Clear all levels after this one in the hierarchy
                    for (let i = hierarchyIndex + 1; i < HIERARCHY.length; i++) {
                        newLocation[HIERARCHY[i]] = ''
                    }

                    console.log('DEBUG: setting newLocation', newLocation)
                    return newLocation
                })
                if (isLastEvent) {
                    setCommand('')
                    setErrorMessage('')
                }
                return
            }

            // Handle undo command
            if (event.type === 'undo') {
                if (observaciones.length > 0) {
                    setObservaciones(prev => prev.slice(0, -1))
                    setErrorMessage('')
                } else {
                    setErrorMessage('No hay observaciones para borrar')
                }
                if (isLastEvent) setCommand('')
                return
            }

            // Handle undo-estado command (delete last observation of specific estado in current location)
            if (event.type === 'undo-estado') {
                setLocation(currentLocation => {
                    if (!HIERARCHY.every(key => currentLocation[key] !== '')) {
                        setErrorMessage('Complete la ubicación primero')
                        setCommand('')
                        return currentLocation
                    }

                    // Find the last observation of this estado in current location
                    setObservaciones(prev => {
                        const matchingIndices: number[] = []
                        prev.forEach((obs, index) => {
                            if (obs.finca === currentLocation.finca &&
                                obs.bloque === currentLocation.bloque &&
                                obs.cama === currentLocation.cama &&
                                obs.estado === event.estado) {
                                matchingIndices.push(index)
                            }
                        })

                        if (matchingIndices.length === 0) {
                            setErrorMessage(`No hay ${event.estado} para borrar`)
                            return prev
                        }

                        // Remove the last matching observation
                        const lastIndex = matchingIndices[matchingIndices.length - 1]
                        const newObservaciones = [...prev]
                        newObservaciones.splice(lastIndex, 1)
                        setErrorMessage('')
                        return newObservaciones
                    })

                    if (isLastEvent) setCommand('')
                    return currentLocation
                })
                return
            }

            // Handle estado/observation commands with upfront validation
            if (event.type === 'estado') {
                setLocation(currentLocation => {
                    if (!HIERARCHY.every(key => currentLocation[key] !== '')) {
                        setErrorMessage('Complete la ubicación primero (finca, bloque, cama)')
                        setCommand('')
                        return currentLocation
                    }

                    // Play tone and vibrate for this estado (with slight delay for multiple commands)
                    setTimeout(() => {
                        const tone = TONES[event.estado as keyof typeof TONES]
                        if (tone) playTone(tone)

                        const pattern = VIBRATION_PATTERNS[event.estado as keyof typeof VIBRATION_PATTERNS]
                        if (pattern) vibrate(pattern)
                    }, index * 150)

                    // Capture GPS and add observation asynchronously
                    const locationSnapshot = { ...currentLocation }
                    const timestamp = getLocalISOString()

                    captureGpsLocation().then(gps => {
                        setObservaciones(prev => [...prev, {
                            fecha: timestamp,
                            ...locationSnapshot,
                            estado: event.estado,
                            cantidad: Number(event.cantidad),
                            ...(gps && { gps })
                        }])
                    })

                    if (isLastEvent) {
                        setCommand('')
                        setErrorMessage('')
                    }
                    return currentLocation
                })
            }
        })
    }, [command])

    const { isListening, start: voskStart, stop, audioContext, mediaStream, partialTranscript } = useVosk({ onResult: onVoiceText })

    const start = async () => {
        setLoadingState('loading')
        // Request GPS permission on user gesture (button click)
        await captureGpsLocation()
        await voskStart()
        setLoadingState('ready')
    }

    useEffect(() => {
        if (!isListening) {
            setLoadingState('idle')
        }
    }, [isListening])

    // Today's sums for selected location
    const sums = observaciones.reduce((acc, o) => {
        if (o.finca === location.finca && o.bloque === location.bloque && o.cama === location.cama &&
            new Date(o.fecha).toDateString() === new Date().toDateString()) {
            if (o.estado in acc) acc[o.estado as keyof typeof acc] += o.cantidad
        }
        return acc
    }, { arroz: 0, arveja: 0, garbanzo: 0, color: 0, abierto: 0 })

    const handleManualInput = async () => {
        if (!manualInputDialog || !manualInputValue) return

        if (manualInputDialog.type === 'location') {
            // Handle location input (finca, bloque, cama)
            const value = manualInputDialog.key === 'cama'
                ? manualInputValue.padStart(2, '0')
                : manualInputValue

            const hierarchyIndex = HIERARCHY.indexOf(manualInputDialog.key as ContextKey)

            setLocation(prevLocation => {
                const newLocation = { ...prevLocation }
                newLocation[manualInputDialog.key as ContextKey] = value

                // Clear all levels after this one in the hierarchy
                for (let i = hierarchyIndex + 1; i < HIERARCHY.length; i++) {
                    newLocation[HIERARCHY[i]] = ''
                }

                return newLocation
            })

            setManualInputDialog(null)
            setManualInputValue('')
            setErrorMessage('')
        } else {
            // Handle estado input (arroz, arveja, etc.)
            const cantidad = parseInt(manualInputValue, 10)
            if (isNaN(cantidad) || cantidad <= 0) {
                setErrorMessage('Cantidad inválida')
                return
            }

            if (!HIERARCHY.every(key => location[key] !== '')) {
                setErrorMessage('Complete la ubicación primero (finca, bloque, cama)')
                setManualInputDialog(null)
                setManualInputValue('')
                return
            }

            const gps = await captureGpsLocation()

            setObservaciones(prev => [...prev, {
                fecha: getLocalISOString(),
                ...location,
                estado: manualInputDialog.key,
                cantidad,
                ...(gps && { gps })
            }])

            setManualInputDialog(null)
            setManualInputValue('')
            setErrorMessage('')
        }
    }

    // Determine which tiles should be active (green) or ready (emerald)
    const isVoiceActive = loadingState === 'ready' && isListening
    const isLocationComplete = HIERARCHY.every(key => location[key] !== '')

    return (
        <div className='flex flex-col gap-1 p-1 h-full'>
            <div className='grid grid-cols-3 gap-1'>
                <TileButton
                    label='FINCA'
                    value={location.finca || '-'}
                    square
                    isActive={location.finca !== '' || (isVoiceActive && !location.finca)}
                    onClick={() => setManualInputDialog({ type: 'location', key: 'finca' })}
                />
                <TileButton
                    label='BLOQUE'
                    value={location.bloque || '-'}
                    square
                    labelClassName='relative top-1'
                    isActive={location.bloque !== '' || (isVoiceActive && location.finca !== '' && !location.bloque)}
                    onClick={() => setManualInputDialog({ type: 'location', key: 'bloque' })}
                />
                <TileButton
                    label='CAMA'
                    value={location.cama || '-'}
                    square
                    isActive={location.cama !== '' || (isVoiceActive && location.finca !== '' && location.bloque !== '' && !location.cama)}
                    onClick={() => setManualInputDialog({ type: 'location', key: 'cama' })}
                />
            </div>
            <div className='grid grid-cols-3 gap-1'>
                <TileButton
                    label='ARROZ'
                    value={sums.arroz}
                    square
                    onClick={() => setManualInputDialog({ type: 'estado', key: 'arroz' })}
                    isReady={isVoiceActive && isLocationComplete}
                />
                <TileButton
                    label='ARVEJA'
                    value={sums.arveja}
                    square
                    onClick={() => setManualInputDialog({ type: 'estado', key: 'arveja' })}
                    isReady={isVoiceActive && isLocationComplete}
                />
                <TileButton
                    label='GARBANZO'
                    value={sums.garbanzo}
                    square
                    onClick={() => setManualInputDialog({ type: 'estado', key: 'garbanzo' })}
                    isReady={isVoiceActive && isLocationComplete}
                />
                <TileButton
                    label='COLOR'
                    value={sums.color}
                    square
                    onClick={() => setManualInputDialog({ type: 'estado', key: 'color' })}
                    isReady={isVoiceActive && isLocationComplete}
                />
                <TileButton
                    label='ABIERTO'
                    value={sums.abierto}
                    square
                    onClick={() => setManualInputDialog({ type: 'estado', key: 'abierto' })}
                    isReady={isVoiceActive && isLocationComplete}
                />
            </div>
            <Button
                className={`w-full text-white border-none px-3 flex-1 flex flex-col items-center justify-center gap-4 relative ${isListening ? 'bg-blue-500' : ''} ${errorMessage ? 'bg-red-500' : ''} ${loadingState === 'loading' ? 'bg-yellow-500' : ''}`}
                onClick={isListening ? stop : start}
                disabled={loadingState === 'loading'}
            >
                {loadingState === 'loading' && (
                    <>
                        <Loader2 className='size-32 opacity-50 animate-spin' />
                        <span className='text-xs'>Cargando...</span>
                    </>
                )}
                {loadingState === 'ready' && isListening && (
                    <>
                        <div className='absolute inset-0'>
                            <AudioVisualizer isListening={isListening} audioContext={audioContext} stream={mediaStream} />
                        </div>
                        <div className='absolute bottom-4 left-0 right-0 text-center text-white text-sm px-4'>
                            {partialTranscript || command || 'Escuchando...'}
                        </div>
                    </>
                )}
                {loadingState === 'idle' && (
                    <>
                        <Mic className='size-32 opacity-50' />
                        <span className='text-xs'>Toca para hablar</span>
                    </>
                )}
            </Button>

            <Dialog open={!!manualInputDialog} onOpenChange={(open) => !open && setManualInputDialog(null)}>
                <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
                    <DialogHeader>
                        <DialogTitle className='text-center capitalize'>
                            {manualInputDialog?.key}
                        </DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-col gap-4 pt-4'>
                        <Input
                            type={manualInputDialog?.type === 'location' ? 'text' : 'number'}
                            placeholder='Valor'
                            value={manualInputValue}
                            onChange={(e) => setManualInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleManualInput()
                                }
                            }}
                            autoFocus
                            className='bg-zinc-800 border-zinc-700 text-white'
                        />
                        <Button
                            onClick={handleManualInput}
                            className='bg-blue-600 hover:bg-blue-700'
                        >
                            Agregar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}