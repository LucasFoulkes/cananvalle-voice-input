import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCallback, useMemo, useState } from 'react'
import { useVoskRecognition } from '@/hooks/useVosk'
import { SpectrogramCanvas } from '@/components/SpectrogramCanvas'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [transcript, setTranscript] = useState('')

  const onTranscript = useCallback((t: string) => {
    setTranscript((prev) => (prev ? prev + ' ' + t : t))
  }, [])

  const modelPath = useMemo(() => '/models/vosk-model-small-es-0.42.tar.gz', [])

  const { isListening, isLoading, isSupported, partial, start, stop, analyser } = useVoskRecognition({
    onTranscript,
    modelPath,
  })

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  const btnLabel = isLoading ? 'Cargando…' : isListening ? 'Escuchando' : 'Escuchar'
  const btnClass = isListening ? 'bg-green-600 hover:bg-green-700' : ''

  return (
    <div className='w-full h-full flex flex-col p-4 space-y-4'>
      <Button className={`py-8 ${btnClass}`} onClick={toggle} disabled={!isSupported || isLoading}>
        {btnLabel}
      </Button>
      <Card className='w-full p-0 overflow-hidden'>
        <CardContent className='w-full p-0' style={{ height: 140 }}>
          <SpectrogramCanvas analyserRef={analyser} height={140} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className='w-full flex flex-col items-center gap-4 py-4'>
          <span className='w-full text-center break-words'>{transcript || partial}</span>
        </CardContent>
      </Card>
    </div>
  )
}
