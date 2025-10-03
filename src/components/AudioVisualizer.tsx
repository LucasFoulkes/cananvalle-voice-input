import { useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  isListening: boolean
  audioContext?: AudioContext | null
  stream?: MediaStream | null
}

export function AudioVisualizer({ isListening, audioContext, stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode>()

  useEffect(() => {
    if (!isListening || !audioContext || !stream || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create analyser
    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    // Connect stream to analyser
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const draw = () => {
      if (!isListening) return

      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height / 2)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        // Draw top half (mirrored)
        ctx.fillRect(x, canvas.height / 2 - barHeight, barWidth, barHeight)
        // Draw bottom half
        ctx.fillRect(x, canvas.height / 2, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      source.disconnect()
    }
  }, [isListening, audioContext, stream])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={200}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
