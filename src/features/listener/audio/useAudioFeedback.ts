import { useCallback, useEffect, useRef } from 'react'

// Low-latency audio feedback using pre-recorded files in /public/audio
// Caches decoded buffers and plays them back-to-back.
export const useAudioFeedback = () => {
    const audioCtxRef = useRef<AudioContext | null>(null)
    const queueRef = useRef<AudioBuffer[]>([])
    const playingRef = useRef(false)
    const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
    const GAP_MS = 100 // ms between clips

    const getCtx = useCallback(async () => {
        let ctx = audioCtxRef.current
        if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioCtxRef.current = ctx
        }
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume()
            } catch {
                // ignore
            }
        }
        return ctx
    }, [])

    const loadWord = useCallback(async (word: string) => {
        const key = word.trim()
        if (!key) return null

        const cached = bufferCacheRef.current.get(key)
        if (cached) return cached

        try {
            const ctx = await getCtx()
            const res = await fetch(`/audio/${key}.mp3`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const arr = await res.arrayBuffer()
            const buf = await ctx.decodeAudioData(arr)
            bufferCacheRef.current.set(key, buf)
            return buf
        } catch {
            console.warn(`[audio] missing clip: ${key}.mp3`)
            return null
        }
    }, [getCtx])

    const tokenize = useCallback((text: string) => {
        const out: string[] = []
        for (const token of text.toLowerCase().split(/\s+/).filter(Boolean)) {
            const match = token.match(/^(\d+)([a-z])$/)
            if (match) {
                out.push(match[1], match[2])
            } else {
                out.push(token)
            }
        }
        return out
    }, [])

    const playNext = useCallback(async () => {
        if (playingRef.current) return
        const ctx = await getCtx()
        const next = queueRef.current.shift()
        if (!next) {
            playingRef.current = false
            return
        }
        playingRef.current = true
        const src = ctx.createBufferSource()
        src.buffer = next
        src.connect(ctx.destination)
        src.onended = () => {
            playingRef.current = false
            setTimeout(() => {
                void playNext()
            }, GAP_MS)
        }
        src.start()
    }, [getCtx])

    const speakWithVoice = useCallback(async (text: string, voice: 'male' | 'female' = 'male') => {
        const tokens = tokenize(String(text || ''))
        if (!tokens.length) return
        const prefix = voice === 'female' ? 'f_' : ''
        const bufs = await Promise.all(tokens.map((token) => loadWord(prefix + token)))
        for (const buf of bufs) {
            if (buf) queueRef.current.push(buf)
        }
        void playNext()
    }, [loadWord, tokenize, playNext])

    useEffect(() => () => {
        try {
            audioCtxRef.current?.close()
        } catch {
            // ignore
        }
        audioCtxRef.current = null
        queueRef.current = []
        playingRef.current = false
        bufferCacheRef.current.clear()
    }, [])

    return { speakWithVoice }
}
