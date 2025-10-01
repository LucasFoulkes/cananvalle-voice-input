import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useVoskRecognition } from '@/hooks/useVosk'
import { SpectrogramCanvas } from '@/components/SpectrogramCanvas'
import { buildFeedbackPhrases, gateResultsWithLocation, processCommand } from '@/utils/commandProcessor'
import { vocabulary } from '@/utils/vocabulary'
import { Play } from 'lucide-react'
import { useVoiceDispatch, useVoiceState } from '@/state/VoiceContext'
import { useAudioFeedback } from '@/hooks/useAudioFeedback'

export const Route = createFileRoute('/')({
  component: Index,
})

type TileProps = {
  label: string
  value: ReactNode
  className?: string
  bgClass?: string
  textClass?: string
  labelClassName?: string
  valueClassName?: string
}

function Tile({
  label,
  value,
  className = '',
  bgClass = 'bg-black',
  textClass = 'text-white',
  labelClassName = 'text-black opacity-80 text-[15px] leading-none absolute top-2 left-0 right-0 text-center pointer-events-none',
  valueClassName = 'text-2xl font-bold',
}: TileProps) {
  return (
    <div className={`relative uppercase rounded-xl overflow-hidden ${bgClass} ${textClass} ${className}`}>
      <div className={labelClassName}>{label}</div>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className={valueClassName}>{value}</div>
      </div>
    </div>
  )
}

function Index() {
  const state = useVoiceState()
  const dispatch = useVoiceDispatch()
  const { speakWithVoice } = useAudioFeedback()
  const [notice, setNotice] = useState<string | null>(null)

  const onTranscript = useCallback((t: string) => {
    const results = processCommand(t)
    if (!results?.length) return
    const { filtered, notice } = gateResultsWithLocation(results, {
      finca: state.finca,
      bloque: state.bloque,
      cama: state.cama,
    })
    setNotice(notice)
    if (filtered.length) {
      dispatch({ type: 'applyResults', results: filtered })
      const phrases = buildFeedbackPhrases(filtered)
      if (phrases.length) {
        speakWithVoice(phrases.join(' '), state.voice)
      }
    }
  }, [dispatch, speakWithVoice, state.voice, state.finca, state.bloque, state.cama])

  const modelPath = useMemo(() => '/models/vosk-model-small-es-0.42.tar.gz', [])

  const { isListening, isLoading, isSupported, start, stop, analyser } = useVoskRecognition({
    onTranscript,
    modelPath,
  })

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  const btnClass = isListening ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
  const stages = vocabulary.stages
  const missingAny = !state.finca || state.finca === '-' || !state.bloque || state.bloque === '-' || !state.cama || state.cama === '-'

  return (
    <div className='w-full h-full flex flex-col p-1 space-y-1'>
      <Button className={`relative p-0 overflow-hidden h-32 ${btnClass}`} onClick={toggle} disabled={!isSupported || isLoading}>
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
        {(['finca', 'bloque', 'cama'] as const).map((key, idx) => (
          <Tile
            key={key}
            label={key}
            value={state[key]}
            className={`${idx === 0 ? 'col-span-2' : 'col-span-1'} h-28`}
            bgClass='bg-green-400'
            textClass='text-black'
          />
        ))}
      </div>
      <div className='grid grid-cols-2 w-full gap-1 h-full flex-1'>
        {stages.map((st) => (
          <Tile
            key={st}
            label={st}
            value={state.counts[st] ?? 0}
            className='h-full'
            bgClass={missingAny ? 'bg-gray-400' : 'bg-emerald-400'}
            textClass='text-black'
          />
        ))}
      </div>
    </div>
  )
}
