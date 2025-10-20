import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { TileButton } from '@/components/TileButton'
import { Mic, ChevronLeft } from 'lucide-react'
import { useVosk } from '@/hooks/useVosk'
import { useObservations } from '@/hooks/useObservations'
import { usePinches } from '@/hooks/usePinches'
import { Spinner } from '@/components/ui/spinner'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import { processObservationCommand } from '@/lib/Command'
import { getCurrentUser, canAccessEstados, canAccessSensores, canAccessPinches } from '@/lib/auth'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'
import { getVariedades } from '@/lib/variedades'
import type { VariedadOption } from '@/types'

export const Route = createFileRoute('/')({
    component: ObservationRecorderRoute,
})

function ObservationRecorderRoute() {
    const currentUser = getCurrentUser()
    const userId = currentUser?.id_usuario.toString() || ''

    // Mode selection state
    const [mode, setMode] = useState<'select' | 'estados' | 'sensores' | 'pinches'>('select')

    // Observation state and logic
    const observationHook = useObservations(userId)
    const pincheHook = usePinches(userId)

    const modeOptions = useMemo(() => (
        [
            { mode: 'estados' as const, label: 'Estados Fenológicos', enabled: canAccessEstados() },
            { mode: 'sensores' as const, label: 'Sensores', enabled: canAccessSensores() },
            { mode: 'pinches' as const, label: 'Pinches', enabled: canAccessPinches() }
        ].filter(option => option.enabled)
    ), [currentUser?.rol])

    useEffect(() => {
        if (mode === 'select' && modeOptions.length === 1) {
            setMode(modeOptions[0].mode)
        }
    }, [mode, modeOptions])

    useEffect(() => {
        if (mode !== 'select') {
            const stillAvailable = modeOptions.some(option => option.mode === mode)
            if (!stillAvailable) {
                setMode('select')
            }
        }
    }, [mode, modeOptions])

    // Use the appropriate hook based on mode
    const activeHook = mode === 'pinches' ? pincheHook : observationHook
    const { items, locationFieldCount, save } = activeHook

    // Get today's date for filtering observations
    const today = formatDateGroupInRecordedTimezone(new Date().toISOString(), undefined)

    // Voice recognition
    const { isInitializing, isListening, start, stop, transcript, partialTranscript, audioContext, mediaStream } = useVosk({
        onResult: (text) => processObservationCommand(text, {
            items: [...items], // Convert readonly array to mutable for processObservationCommand
            onSave: save,
            mode: mode === 'select' ? undefined : mode  // Pass mode for command filtering
        })
    })

    const handleMicClick = () => {
        if (!isListening && !isInitializing) {
            start()
        } else if (isListening) {
            stop()
        }
    }

    const getBgColor = () => {
        if (isInitializing) return 'bg-amber-500'
        if (isListening) return 'bg-emerald-500'
        return 'bg-zinc-800'
    }

    // Get current location for sum calculations
    const currentLocation = mode === 'pinches'
        ? (pincheHook.pinche.slice(0, 3) as [string, string, string])
        : (observationHook.observacion.slice(0, 3) as [string, string, string])

    const pincheFinca = pincheHook.pinche[0]
    const pincheBloque = pincheHook.pinche[1]
    const variedadDisplay = pincheHook.selectedVariedad?.nombre || pincheHook.pinche[2]
    const variedadOptions = useMemo(() => {
        if (mode !== 'pinches') return [] as VariedadOption[]
        return getVariedades(pincheFinca, pincheBloque)
    }, [mode, pincheFinca, pincheBloque])

    // Helper function to get readable label for field
    const getFieldLabel = (item: string): string => {
        const labelMap: Record<string, string> = {
            'conductividad_suelo': 'Conductividad',
            'humedad': 'Humedad',
            'temperatura_suelo': 'Temperatura',
            'apertura': 'Apertura',
            'programado': 'Programado',
            'sanitario': 'Sanitario'
        }
        return labelMap[item] || item
    }

    // Filter items based on mode
    const getVisibleItems = () => {
        if (mode === 'select') return []

        if (mode === 'pinches') {
            // For pinches: show bloque, cama, and all 3 tipos
            return items // All fields (bloque, cama, apertura, programado, sanitario)
        }

        // Always show location fields (first 3 for observations)
        const locationItems = items.slice(0, locationFieldCount)

        if (mode === 'estados') {
            // Show first 5 status fields: arroz, arveja, garbanzo, color, abierto
            const estadoItems = items.slice(locationFieldCount, locationFieldCount + 5)
            return [...locationItems, ...estadoItems]
        } else {
            // Show last 3 status fields: conductividad_suelo, humedad, temperatura_suelo
            const sensorItems = items.slice(locationFieldCount + 5, locationFieldCount + 8)
            return [...locationItems, ...sensorItems]
        }
    }

    const visibleItems = getVisibleItems()

    // Handle back button - reset to mode selection
    const handleBack = () => {
        if (modeOptions.length > 1) {
            setMode('select')
        }
        // Reset location fields
        for (let i = 0; i < locationFieldCount; i++) {
            save(i, '')
        }
    }

    return (
        <div className="flex flex-col w-full h-full p-1 gap-1 overflow-hidden bg-black">
            {/* Mode Selection Screen */}
            {mode === 'select' && (
                <div className="flex flex-col w-full h-full gap-1 justify-center">
                    {modeOptions.length === 0 ? (
                        <div className="text-center text-zinc-400 text-lg px-4">
                            No tienes permisos para registrar información.
                        </div>
                    ) : (
                        modeOptions.map(({ mode: m, label }) => (
                            <Button
                                key={m}
                                onClick={() => setMode(m as 'estados' | 'sensores' | 'pinches')}
                                className="h-32 text-4xl font-thin"
                                variant="default"
                            >
                                {label}
                            </Button>
                        ))
                    )}
                </div>
            )}

            {/* Observation/Pinche Grid (Estados, Sensores, or Pinches) */}
            {mode !== 'select' && (
                <>
                    {/* Back Button */}
                    {modeOptions.length > 1 && (
                        <Button
                            onClick={handleBack}
                            variant="default"
                            size="icon"
                            className="h-16 w-16 flex-shrink-0"
                        >
                            <ChevronLeft className="size-full" strokeWidth={1} />
                        </Button>
                    )}

                    {/* Observation Buttons Grid */}
                    <div className="grid grid-cols-3 w-full gap-1 flex-shrink-0">
                        {visibleItems.map((item) => {
                            // Calculate the actual index in the full items array
                            const actualIndex = items.indexOf(item)
                            const isVariedadField = mode === 'pinches' && item === 'variedad'

                            // Get display value based on mode
                            let displayValue: string

                            if (actualIndex >= locationFieldCount) {
                                // It's a tipo/status field - show sum
                                if (mode === 'pinches') {
                                    displayValue = pincheHook.getSum(
                                        actualIndex,
                                        currentLocation as [string, string, string],
                                        today
                                    ).toString()
                                } else {
                                    displayValue = observationHook.getSum(
                                        actualIndex,
                                        currentLocation as [string, string, string],
                                        today,
                                        mode
                                    ).toString()
                                }
                            } else {
                                // It's a location field - show current value
                                displayValue = mode === 'pinches'
                                    ? (isVariedadField ? variedadDisplay : pincheHook.pinche[actualIndex])
                                    : observationHook.observacion[actualIndex]
                            }

                            if (isVariedadField) {
                                const disabled = !pincheFinca || !pincheBloque

                                return (
                                    <VariedadTile
                                        key={actualIndex}
                                        label="Variedad"
                                        value={displayValue}
                                        options={variedadOptions}
                                        disabled={disabled}
                                        onSelect={pincheHook.selectVariedad}
                                    />
                                )
                            }

                            return (
                                <TileButton
                                    key={actualIndex}
                                    label={getFieldLabel(item)}
                                    value={displayValue}
                                    onSave={(val) => save(actualIndex, val)}
                                />
                            )
                        })}
                    </div>

                    {/* Microphone Button */}
                    <div
                        className={`flex-1 min-h-0 ${getBgColor()} rounded-xl cursor-pointer transition-colors overflow-hidden`}
                        onClick={handleMicClick}
                    >
                        {!isInitializing && !isListening && (
                            <div className="flex items-center justify-center w-full h-full">
                                <Mic className='size-32 text-muted-foreground' />
                            </div>
                        )}
                        {isInitializing && (
                            <div className="flex items-center justify-center w-full h-full">
                                <Spinner className='size-32 text-white/50' />
                            </div>
                        )}
                        {isListening && (
                            <div className="relative flex items-center justify-center w-full h-full">
                                <div className="w-full max-w-4xl aspect-[4/1]">
                                    <AudioVisualizer
                                        isListening={isListening}
                                        audioContext={audioContext}
                                        stream={mediaStream}
                                    />
                                </div>
                                {(partialTranscript || transcript) && (
                                    <div className="absolute bottom-4 left-0 right-0 text-center text-2xl">
                                        <span className={partialTranscript ? "text-white/50" : "text-white"}>
                                            {partialTranscript || transcript}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

type VariedadTileProps = {
    label: string
    value: string
    options: VariedadOption[]
    disabled: boolean
    onSelect: (option: VariedadOption | null) => void
}

function VariedadTile({ label, value, options, disabled, onSelect }: VariedadTileProps) {
    const [open, setOpen] = useState(false)

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
    }

    const handleSelect = (option: VariedadOption | null) => {
        onSelect(option)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <div
                    className={`aspect-square rounded-xl flex items-center relative select-none cursor-pointer ${disabled ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-800'}`}
                >
                    <span className='uppercase font-medium text-center absolute top-0 w-full'>{label}</span>
                    <span className='text-center text-5xl font-regular w-full px-2 truncate'>{value || '-'}</span>
                </div>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
                <DialogHeader>
                    <DialogTitle className='uppercase'>{label}</DialogTitle>
                </DialogHeader>
                {disabled ? (
                    <div className='text-sm text-muted-foreground'>Selecciona primero la finca y el bloque.</div>
                ) : options.length === 0 ? (
                    <div className='text-sm text-muted-foreground'>No hay variedades configuradas para esta combinación.</div>
                ) : (
                    <div className='grid gap-2 max-h-80 overflow-y-auto pr-1'>
                        {options.map(option => {
                            const isActive = option.nombre === value
                            return (
                                <Button
                                    key={option.id}
                                    variant={isActive ? 'default' : 'outline'}
                                    className='justify-between'
                                    onClick={() => handleSelect(option)}
                                >
                                    <span>{option.nombre}</span>
                                    {option.color && (
                                        <span className='text-xs text-muted-foreground'>{option.color}</span>
                                    )}
                                </Button>
                            )
                        })}
                    </div>
                )}
                <DialogFooter className='justify-between'>
                    <DialogClose asChild>
                        <Button variant='outline' onClick={() => handleSelect(null)}>Limpiar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button>Listo</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
