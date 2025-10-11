import { createFileRoute } from '@tanstack/react-router'
import { TileButton } from '@/components/TileButton'
import { Mic } from 'lucide-react'
import { useVosk } from '@/hooks/useVosk'
import { useObservations } from '@/hooks/useObservations'
import { Spinner } from '@/components/ui/spinner'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import { processObservationCommand } from '@/lib/Command'
import { getCurrentUser } from '@/lib/auth'
import { formatDateGroupInRecordedTimezone } from '@/lib/gpsTimezone'

export const Route = createFileRoute('/')({
    component: ObservationRecorderRoute,
})

function ObservationRecorderRoute() {
    const currentUser = getCurrentUser()
    const userId = currentUser?.id_usuario.toString() || ''

    // Observation state and logic
    const { observacion, items, locationFieldCount, save, getSum } = useObservations(userId)

    // Get today's date for filtering observations
    const today = formatDateGroupInRecordedTimezone(new Date().toISOString(), undefined)

    // Voice recognition
    const { isInitializing, isListening, start, stop, transcript, partialTranscript, audioContext, mediaStream } = useVosk({
        onResult: (text) => processObservationCommand(text, {
            items: [...items], // Convert readonly array to mutable for processObservationCommand
            onSave: save
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

    return (
        <div className="flex flex-col w-full h-full p-1 gap-1">
            <div className="grid grid-cols-3 w-full gap-1">
                {items.map((item, i) => (
                    <TileButton
                        key={i}
                        label={item}
                        value={i >= locationFieldCount ? getSum(i, currentLocation, today).toString() : observacion[i]}
                        onSave={(val) => save(i, val)}
                    />
                ))}
            </div>
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
        </div>
    )
}
