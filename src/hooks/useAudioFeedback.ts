import { useCallback, useEffect, useRef } from 'react'

// Low-latency audio feedback using pre-recorded files in /public/audio
// - No TTS fallback (per requirement)
// - Caches decoded AudioBuffers
// - Schedules words back-to-back using actual clip durations
export const useAudioFeedback = () => {
    const audioCtxRef = useRef<AudioContext | null>(null)
    // Simple sequential queue: play one buffer, then the next on 'ended'
    const queueRef = useRef<AudioBuffer[]>([])
    const playingRef = useRef<boolean>(false)
    const GAP_MS = 100 // 0.1 seconds between clips
    const onQueueEmptyRef = useRef<(() => void) | null>(null)

    // Create or resume the audio context lazily
    const getCtx = useCallback(async (): Promise<AudioContext> => {
        let ctx = audioCtxRef.current
        if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioCtxRef.current = ctx
        }
        if (ctx.state === 'suspended') {
            try { await ctx.resume() } catch { /* ignore */ }
        }
        return ctx
    }, [])

    // Load one word fresh (no cache) so updates to files are reflected immediately
    const loadWord = useCallback(async (word: string): Promise<AudioBuffer | null> => {
        const key = word.trim()
        if (!key) return null

        try {
            const ctx = await getCtx()
            // Bypass HTTP cache and any SW caches; add a cache-busting query param
            const res = await fetch(`/audio/${key}.mp3?v=${Date.now()}`, { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const arr = await res.arrayBuffer()
            const buf = await ctx.decodeAudioData(arr)
            return buf
        } catch {
            // Log once per attempt; skip the word
            console.warn(`[audio] missing clip: ${key}.mp3`)
            return null
        }
    }, [getCtx])

    const tokenize = useCallback((text: string): string[] => {
        // Split by whitespace, then split alnum combos like "10a" -> ["10", "a"]
        const rough = text.toLowerCase().split(/\s+/).filter(Boolean)
        const tokens: string[] = []
        for (const t of rough) {
            const m = t.match(/^(\d+)([a-z])$/)
            if (m) {
                tokens.push(m[1], m[2])
            } else {
                tokens.push(t)
            }
        }
        return tokens
    }, [])

    const playNext = useCallback(async () => {
        if (playingRef.current) return
        const ctx = await getCtx()
        const next = queueRef.current.shift()
        if (!next) {
            playingRef.current = false
            // Notify listeners that queue is empty (e.g., resume mic)
            onQueueEmptyRef.current?.()
            return
        }
        playingRef.current = true
        const src = ctx.createBufferSource()
        src.buffer = next
        src.connect(ctx.destination)
        src.onended = () => {
            playingRef.current = false
            // Add a small delay between clips
            setTimeout(() => {
                // Kick off the next buffer if queued
                void playNext()
            }, GAP_MS)
        }
        // Start immediately; we want the full file without offsets
        src.start()
    }, [getCtx])

    const speakWithVoice = useCallback(async (text: string, voice: 'male' | 'female' = 'male') => {
        const tokens = tokenize(String(text || ''))
        if (!tokens.length) return
        const prefix = voice === 'female' ? 'f_' : ''
        const bufs = await Promise.all(tokens.map((w) => loadWord(prefix + w)))
        for (const b of bufs) {
            if (b) queueRef.current.push(b)
        }
        // Begin playback if idle
        void playNext()
    }, [loadWord, tokenize, playNext])

    const onQueueEmpty = useCallback((cb: () => void) => {
        onQueueEmptyRef.current = cb
        return () => {
            if (onQueueEmptyRef.current === cb) onQueueEmptyRef.current = null
        }
    }, [])

    const speak = useCallback(async (text: string) => speakWithVoice(text, 'male'), [speakWithVoice])

    // Optional: expose a prewarm method to reduce first-play latency
    const prewarm = useCallback(async (words: string[]) => {
        // Prewarm just fetches+decodes, discards result to keep queue clean
        await Promise.all(words.map((w) => loadWord(w)))
    }, [loadWord])

    // Clean up on unmount
    useEffect(() => {
        return () => {
            try { audioCtxRef.current?.close() } catch { /* ignore */ }
            audioCtxRef.current = null
            queueRef.current = []
            playingRef.current = false
        }
    }, [])

    return { speak, prewarm, speakWithVoice, onQueueEmpty }
}
