import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SpectrogramCanvas } from '@/features/listener/components/SpectrogramCanvas'
import { LocationTile, StageTile } from '@/features/listener/components/Tiles'
import { vocabulary } from '@/shared/vocabulary'
import { Play } from 'lucide-react'
import { useAppState } from '@/state/AppContext'
import { useVoiceRecognition } from '@/features/listener/hooks/useVoiceRecognition'
import { useObservations } from '@/features/observations/hooks/useObservations'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const state = useAppState()
    const { counts, refresh } = useObservations(state.finca, state.bloque, state.cama)
    const [notice, setNotice] = useState<string | null>(null)
    const [flashingStages, setFlashingStages] = useState<Set<string>>(new Set())
    const prevCounts = useRef<Record<string, number>>({})

    const modelPath = useMemo(() => '/models/vosk-model-small-es-0.42.tar.gz', [])

    const { isListening, isLoading, isSupported, start, stop, analyser } = useVoiceRecognition({
        modelPath,
        onCountsChanged: refresh
    })

    // Flash animation when counts change
    useEffect(() => {
        const newFlashing = new Set<string>()
        for (const stage of vocabulary.stages) {
            if (prevCounts.current[stage] !== undefined && prevCounts.current[stage] !== counts[stage]) {
                newFlashing.add(stage)
            }
        }

        if (newFlashing.size > 0) {
            setFlashingStages(newFlashing)
            setTimeout(() => setFlashingStages(new Set()), 1000)
        }

        prevCounts.current = { ...counts }
    }, [counts])

    // Check if location is set
    const locationSet = state.finca !== '-' && state.bloque !== '-' && state.cama !== '-'

    // Show notice when trying to count without location
    useEffect(() => {
        if (!locationSet && isListening) {
            setNotice('Configura primero: finca, bloque, cama')
        } else {
            setNotice(null)
        }
    }, [locationSet, isListening])

    const toggle = useCallback(() => {
        if (isListening) stop()
        else start()
    }, [isListening, start, stop])

    const btnClass = isListening ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'

    return (
        <div className='w-full h-full flex flex-col p-1 space-y-1'>
            <Button
                className={`relative p-0 overflow-hidden h-32 ${btnClass}`}
                onClick={toggle}
                disabled={!isSupported || isLoading}
            >
                <SpectrogramCanvas
                    analyserRef={analyser}
                    height={140}
                    background={isListening ? 'hsla(242, 70%, 52%, 1.00)' : '#6b7280'}
                    idleBaseline={false}
                />
                {!isListening && (
                    <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10 [&_svg]:!w-24 [&_svg]:!h-24'>
                        <Play size={96} className='text-grey-500' fill='currentColor' stroke='none' />
                    </div>
                )}
            </Button>

            {notice && (
                <div className='text-sm text-red-700 bg-red-100 border border-red-200 rounded-md px-3 py-2'>
                    {notice}
                </div>
            )}

            <div className='grid grid-cols-4 gap-1'>
                <LocationTile type='finca' value={state.finca} className='col-span-2 h-28' />
                <LocationTile type='bloque' value={state.bloque} className='col-span-1 h-28' />
                <LocationTile type='cama' value={state.cama} className='col-span-1 h-28' />
            </div>

            <div className='grid grid-cols-2 w-full gap-1 h-full flex-1'>
                {vocabulary.stages.map((stage) => (
                    <StageTile
                        key={stage}
                        stage={stage}
                        count={counts[stage] || 0}
                        isActive={locationSet}
                        isFlashing={flashingStages.has(stage)}
                    />
                ))}
            </div>
        </div>
    )
}
