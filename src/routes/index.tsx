import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Observation } from '@/types'
import { useVosk } from '@/hooks/useVosk'
import TileButton from '@/components/TileButton'
import { interpretVoiceText, HIERARCHY } from '@/lib/commandEngine'
import { Mic, Loader2 } from 'lucide-react'
import { AudioVisualizer } from '@/components/AudioVisualizer'

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

        console.log('DEBUG: onVoiceText called', { text, command, location })
        const { buffer, event } = interpretVoiceText(command, text)
        console.log('DEBUG: interpretVoiceText result', { buffer, event })
        setCommand(buffer)

        if (!event) return

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
            const index = HIERARCHY.indexOf(event.key)

            // Use functional update to get the latest location state
            setLocation(prevLocation => {
                const newLocation = { ...prevLocation }

                // Set the current level
                const value = event.key === 'cama'
                    ? String(event.value).padStart(2, '0')
                    : String(event.value)
                newLocation[event.key] = value

                // Clear all levels after this one in the hierarchy
                for (let i = index + 1; i < HIERARCHY.length; i++) {
                    newLocation[HIERARCHY[i]] = ''
                }

                console.log('DEBUG: setting newLocation', newLocation)
                return newLocation
            })
            setCommand('')
            setErrorMessage('')
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
            setCommand('')
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

                setObservaciones(prev => [...prev, {
                    fecha: new Date().toISOString(),
                    ...currentLocation,
                    estado: event.estado,
                    cantidad: Number(event.cantidad)
                }])
                setCommand('')
                setErrorMessage('')
                return currentLocation
            })
        }
    }, [command, observaciones.length])

    const { isListening, start: voskStart, stop, audioContext, mediaStream, partialTranscript } = useVosk({ onResult: onVoiceText })

    const start = async () => {
        setLoadingState('loading')
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

    return (
        <div className='flex flex-col gap-1 p-1 h-full'>
            <div className='grid grid-cols-3 gap-1'>
                <TileButton label='FINCA' value={location.finca || '-'} square />
                <TileButton label='BLOQUE' value={location.bloque || '-'} square labelClassName='relative top-1' />
                <TileButton label='CAMA' value={location.cama || '-'} square />
            </div>
            <div className='grid grid-cols-3 gap-1'>
                <TileButton label='ARROZ' value={sums.arroz} square />
                <TileButton label='ARVEJA' value={sums.arveja} square />
                <TileButton label='GARBANZO' value={sums.garbanzo} square />
                <TileButton label='COLOR' value={sums.color} square />
                <TileButton label='ABIERTO' value={sums.abierto} square />
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
        </div >
    )
}