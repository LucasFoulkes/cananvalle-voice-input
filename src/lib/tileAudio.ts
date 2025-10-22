const TILE_FREQUENCIES: Record<string, number> = {
    finca: 523.25, // C5
    bloque: 554.37, // C#5
    cama: 587.33, // D5
    arroz: 659.25, // E5
    arveja: 698.46, // F5
    garbanzo: 739.99, // F#5
    color: 783.99, // G5
    abierto: 830.61, // G#5
    conductividad_suelo: 880, // A5
    humedad: 932.33, // A#5
    temperatura_suelo: 987.77 // B5
}

let audioContext: AudioContext | null = null
const playbackQueue: string[] = []
let isPlaying = false

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioContext) {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
        if (!AudioCtx) return null
        audioContext = new AudioCtx()
    }
    return audioContext
}

async function playFrequency(frequency: number): Promise<void> {
    const context = getAudioContext()
    if (!context) return

    await context.resume().catch(() => { /* ignore resume errors */ })

    return new Promise(resolve => {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()

        oscillator.type = 'triangle'
        oscillator.frequency.value = frequency

        gainNode.gain.setValueAtTime(0, context.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.25, context.currentTime + 0.015)
        gainNode.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.07)
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.32)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)

        const startTime = context.currentTime
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.35)

        oscillator.addEventListener('ended', () => {
            oscillator.disconnect()
            gainNode.disconnect()
            resolve()
        })
    })
}

function processQueue() {
    if (isPlaying) return
    const fieldName = playbackQueue.shift()
    if (!fieldName) return

    const frequency = TILE_FREQUENCIES[fieldName]
    if (!frequency) {
        processQueue()
        return
    }

    isPlaying = true

    playFrequency(frequency)
        .catch(() => { /* ignore playback errors */ })
        .finally(() => {
            isPlaying = false
            setTimeout(processQueue, 50)
        })
}

export function playTileTone(fieldName: string): void {
    if (typeof window === 'undefined') return
    if (!TILE_FREQUENCIES[fieldName]) return
    playbackQueue.push(fieldName)
    processQueue()
}
