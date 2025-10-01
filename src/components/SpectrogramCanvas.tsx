import { useEffect, useRef, type MutableRefObject } from 'react'

type Props = {
    analyserRef: MutableRefObject<AnalyserNode | null>
    height?: number
    barColor?: string
    background?: string
}

// Lightweight offline waveform visualizer using Web Audio AnalyserNode
export function SpectrogramCanvas({ analyserRef, height = 500, barColor = '#ffffff', background = '#16a34a' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const prevHeightsRef = useRef<Float32Array | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const applyScale = () => {
            // Reset then apply DPR scaling so drawing uses CSS pixel units
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.scale(dpr, dpr)
        }

        const resize = () => {
            const parent = canvas.parentElement as HTMLElement | null
            const rect = (parent ?? canvas).getBoundingClientRect()
            const targetH = rect.height > 0 ? rect.height : height
            canvas.width = Math.max(1, Math.floor(rect.width * dpr))
            canvas.height = Math.max(1, Math.floor((targetH || 80) * dpr))
            applyScale()
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas.parentElement ?? canvas)

        const freqDataRef = { current: new Float32Array(1024) }

        const render = () => {
            // Ensure draw buffer tracks CSS size even if parent changes between ResizeObserver ticks
            const desiredW = Math.max(1, Math.floor(canvas.clientWidth * dpr))
            const desiredH = Math.max(1, Math.floor(canvas.clientHeight * dpr))
            if (canvas.width !== desiredW || canvas.height !== desiredH) {
                canvas.width = desiredW
                canvas.height = desiredH
                applyScale()
            }

            const analyser = analyserRef.current
            const w = canvas.width / dpr
            const h = canvas.height / dpr
            if (!analyser) {
                // Background and a baseline when idle
                ctx.fillStyle = background
                ctx.fillRect(0, 0, w, h)
                const centerY = h / 2
                ctx.fillStyle = barColor
                ctx.fillRect(0, Math.max(0, centerY - 1), w, 2)
                rafRef.current = requestAnimationFrame(render)
                return
            }

            if (analyser.frequencyBinCount !== freqDataRef.current.length) {
                freqDataRef.current = new Float32Array(analyser.frequencyBinCount)
            }

            // Use decibels for bars
            analyser.getFloatFrequencyData(freqDataRef.current)

            // Clear
            ctx.fillStyle = background
            ctx.fillRect(0, 0, w, h)

            // Draw simple discrete bars (like typical voice UIs) with smoothing
            const centerY = h / 2
            const barWidth = 3 // css px
            const gap = 2 // css px
            const stepX = barWidth + gap
            const bins = freqDataRef.current.length
            const columns = Math.max(1, Math.floor(w / stepX))
            const sampleStep = Math.max(1, Math.floor(bins / columns))

            // init smoothing buffer
            const cols = columns + 1
            if (!prevHeightsRef.current || prevHeightsRef.current.length !== cols) {
                prevHeightsRef.current = new Float32Array(cols)
            }

            const prev = prevHeightsRef.current
            const rise = 0.5 // 0..1, higher = faster rise
            const decay = 0.9 // 0..1, lower = faster fall
            const minDb = analyser.minDecibels
            const maxDb = analyser.maxDecibels
            const dbRange = Math.max(1, maxDb - minDb)

            ctx.fillStyle = barColor
            for (let x = 0, col = 0, ci = 0; x <= w - barWidth; x += stepX, col += sampleStep, ci++) {
                const start = Math.min(col, bins - 1)
                const end = Math.min(start + sampleStep, bins)
                let peakDb = -Infinity
                for (let bi = start; bi < end; bi++) {
                    const val = freqDataRef.current[bi]
                    if (val > peakDb) peakDb = val
                }
                // Normalize dB to 0..1
                const norm = Math.max(0, Math.min(1, (peakDb - minDb) / dbRange))
                const target = Math.max(1, norm * centerY)
                const last = prev[ci] || 0
                const smoothed = target > last ? last + (target - last) * rise : last * decay
                prev[ci] = smoothed
                ctx.fillRect(x, centerY - smoothed, barWidth, smoothed * 2)
            }

            rafRef.current = requestAnimationFrame(render)
        }

        rafRef.current = requestAnimationFrame(render)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            ro.disconnect()
        }
    }, [analyserRef, height, barColor, background])

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

