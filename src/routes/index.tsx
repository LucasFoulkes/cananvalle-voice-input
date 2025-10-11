import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { TileButton } from '@/components/TileButton'
import { Mic, ChevronLeft } from 'lucide-react'
import { useVosk } from '@/hooks/useVosk'
import { useObservations } from '@/hooks/useObservations'
import { Spinner } from '@/components/ui/spinner'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import { Button } from '@/components/ui/button'
import { processObservationCommand } from '@/lib/Command'
import { getCurrentUser } from '@/lib/auth'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'

export const Route = createFileRoute('/')({
    component: ObservationRecorderRoute,
})

function ObservationRecorderRoute() {
    const currentUser = getCurrentUser()
    const userId = currentUser?.id_usuario.toString() || ''

    // Mode selection state
    const [mode, setMode] = useState<'select' | 'estados' | 'sensores'>('select')

    // Observation state and logic
    const { observacion, items, locationFieldCount, save, getSum } = useObservations(userId)

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
    const currentLocation = observacion.slice(0, 3) as [string, string, string]

    // Helper function to get readable label for field
    const getFieldLabel = (item: string): string => {
        const labelMap: Record<string, string> = {
            'conductividad_suelo': 'Conductividad',
            'humedad': 'Humedad',
            'temperatura_suelo': 'Temperatura'
        }
        return labelMap[item] || item
    }

    // Filter items based on mode
    const getVisibleItems = () => {
        if (mode === 'select') return []

        // Always show location fields (first 3)
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
        setMode('select')
        // Reset location fields
        for (let i = 0; i < locationFieldCount; i++) {
            save(i, '')
        }
    }

    return (
        <div className="flex flex-col w-full h-full p-1 gap-1">
            {/* Mode Selection Screen */}
            {mode === 'select' && (
                <div className="flex flex-col w-full h-full gap-1 justify-center">
                    {[
                        { mode: 'estados', label: 'Estados Fenológicos' },
                        { mode: 'sensores', label: 'Sensores' }
                    ].map(({ mode, label }) => (
                        <Button
                            key={mode}
                            onClick={() => setMode(mode as 'estados' | 'sensores')}
                            className="h-32 text-4xl font-thin"
                            variant="default"
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            )}

            {/* Observation Grid (Estados or Sensores) */}
            {mode !== 'select' && (
                <>
                    {/* Back Button */}
                    <Button
                        onClick={handleBack}
                        variant="default"
                        size="icon"
                        className="h-16 w-16"
                    >
                        <ChevronLeft className="size-full" strokeWidth={1} />
                    </Button>

                    {/* Observation Buttons Grid */}
                    <div className="grid grid-cols-3 w-full gap-1">
                        {visibleItems.map((item) => {
                            // Calculate the actual index in the full items array
                            const actualIndex = items.indexOf(item)
                            return (
                                <TileButton
                                    key={actualIndex}
                                    label={getFieldLabel(item)}
                                    value={actualIndex >= locationFieldCount ? getSum(actualIndex, currentLocation, today, mode).toString() : observacion[actualIndex]}
                                    onSave={(val) => save(actualIndex, val)}
                                />
                            )
                        })}
                    </div>

                    {/* Microphone Button */}
                    <div
                        className={`h-full ${getBgColor()} rounded-xl cursor-pointer transition-colors overflow-hidden`}
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
