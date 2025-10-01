import { useState, useEffect, useRef, useCallback } from 'react'
import { vocabulary, FINCA_MAP, parseNumber, normalizeSpanish } from '@/shared/vocabulary'
import { addObservationsBatch, deleteLastObservation } from '@/db/database'
import { useAppState, useAppDispatch } from '@/state/AppContext'
import { useAudioFeedback } from '../audio/useAudioFeedback'

type Stage = (typeof vocabulary.stages)[number]

interface UseVoiceRecognitionProps {
    modelPath: string
    onCountsChanged?: () => void
}

// Minimal Vosk types
type VoskResultMessage = { result?: { text?: string } }
type VoskPartialMessage = { partial?: string }
interface VoskRecognizer {
    on(event: 'result', cb: (message: VoskResultMessage) => void): void
    on(event: 'partialresult', cb: (message: VoskPartialMessage) => void): void
    acceptWaveform(buffer: AudioBuffer): void
}
interface VoskModel {
    KaldiRecognizer: new (sampleRate: number, grammarJson: string) => VoskRecognizer
}

// Share model + grammar across hook instances (and hot reloads in dev)
type ModelCache = {
    promise: Promise<VoskModel> | null
    model: VoskModel | null
    path: string | null
    grammarWords: string[] | null
}

const GLOBAL_CACHE_KEY = '__voskModelCache__'
const BANNED_GRAMMAR_WORDS = new Set<string>(typeof navigator !== 'undefined' && 'userAgentData' in navigator ? [] : ['femenie'])

const getModelCache = (): ModelCache => {
    const globalAny = globalThis as Record<string, unknown>
    const existing = globalAny[GLOBAL_CACHE_KEY] as ModelCache | undefined
    if (existing) return existing
    const cache: ModelCache = {
        promise: null,
        model: null,
        path: null,
        grammarWords: null,
    }
    globalAny[GLOBAL_CACHE_KEY] = cache
    return cache
}

const ensureModel = async (modelPath: string): Promise<VoskModel> => {
    const cache = getModelCache()

    if (!cache.promise || cache.path !== modelPath) {
        cache.path = modelPath
        cache.model = null
        cache.grammarWords = null
        cache.promise = import('vosk-browser')
            .then(({ createModel }) => createModel(modelPath) as unknown as VoskModel)
            .then((model) => {
                cache.model = model
                return model
            })
            .catch((error) => {
                cache.promise = null
                cache.path = null
                cache.model = null
                cache.grammarWords = null
                throw error
            })
    }

    if (cache.model) return cache.model
    if (!cache.promise) throw new Error('Model promise missing')
    return cache.promise
}

const getGrammarWords = () => {
    const cache = getModelCache()
    if (!cache.grammarWords) {
        cache.grammarWords = Array.from(
            new Set(
                vocabulary
                    .getAllWords()
                    .filter((word) => word && !BANNED_GRAMMAR_WORDS.has(word))
            )
        )
    }
    return cache.grammarWords
}

export const useVoiceRecognition = ({ modelPath, onCountsChanged }: UseVoiceRecognitionProps) => {
    const [isListening, setIsListening] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSupported, setIsSupported] = useState(false)
    const [partial, setPartial] = useState('')
    const [lastCommand, setLastCommand] = useState<string | null>(null)

    const state = useAppState()
    const dispatch = useAppDispatch()
    const { speakWithVoice } = useAudioFeedback()

    const modelRef = useRef<VoskModel | null>(null)
    const recognizerRef = useRef<VoskRecognizer | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const analyserRef = useRef<AnalyserNode | null>(null)

    const latestRef = useRef({
        state,
        speakWithVoice,
        onCountsChanged,
    })

    useEffect(() => {
        latestRef.current = {
            state,
            speakWithVoice,
            onCountsChanged,
        }
    }, [state, speakWithVoice, onCountsChanged])

    const processCommand = useCallback(async (transcript: string) => {
        const { state: currentState, speakWithVoice: speakLatest, onCountsChanged: onCountsChangedLatest } = latestRef.current

        const normalized = normalizeSpanish(transcript)
        const words = normalized.split(/\s+/).filter(Boolean)
        if (!words.length) return

        setLastCommand(transcript)
        const phrases: string[] = []
        const pendingObservations: Parameters<typeof addObservationsBatch>[0] = []
        let needsRefresh = false

        const STAGES = vocabulary.stages as Stage[]
        const LETTERS = vocabulary.letters
        const VOICE_MAP: Record<string, 'male' | 'female'> = {
            masculino: 'male', masculina: 'male', hombre: 'male', varon: 'male',
            femenino: 'female', femenina: 'female', mujer: 'female',
        }

        const location = {
            finca: currentState.finca,
            bloque: currentState.bloque,
            cama: currentState.cama,
        }
        let voiceSelection = currentState.voice

        const hasLocation = () =>
            location.finca !== '-' && location.bloque !== '-' && location.cama !== '-'

        let i = 0
        while (i < words.length) {
            const word = words[i]

            if (word === 'borrar' && i + 1 < words.length && words[i + 1] === 'ultimo') {
                if (hasLocation()) {
                    let stageWord: Stage | undefined
                    for (let j = i + 2; j < words.length; j++) {
                        if (STAGES.includes(words[j] as Stage)) {
                            stageWord = words[j] as Stage
                            break
                        }
                    }
                    await deleteLastObservation(location.finca, location.bloque, location.cama, stageWord)
                    needsRefresh = true
                    phrases.push('borrado')
                }
                i += 2
                continue
            }

            if (word === 'total' || (STAGES.includes(word as Stage) && i + 1 < words.length && words[i + 1] === 'total')) {
                needsRefresh = true
                i += word === 'total' ? 1 : 2
                continue
            }

            const voice = VOICE_MAP[word]
            if (voice) {
                dispatch({ type: 'setVoice', value: voice })
                voiceSelection = voice
                phrases.push(word)
                i += 1
                continue
            }

            if (word === 'finca' && i + 1 < words.length) {
                const next = words[i + 1]
                const n = parseNumber(next)
                const key = (n ?? next).toString()
                const fincaName = FINCA_MAP[key] || FINCA_MAP[next]
                if (fincaName) {
                    dispatch({ type: 'setFinca', value: fincaName })
                    location.finca = fincaName
                    location.bloque = '-'
                    location.cama = '-'
                    phrases.push(`finca ${fincaName}`)
                    needsRefresh = true
                    i += 2
                    continue
                }
            }

            if (word === 'bloque' && i + 1 < words.length) {
                const n = parseNumber(words[i + 1])
                if (n !== null) {
                    let value = String(n)
                    if (i + 2 < words.length && LETTERS.includes(words[i + 2])) {
                        value += words[i + 2]
                        i += 3
                    } else {
                        i += 2
                    }
                    dispatch({ type: 'setBloque', value })
                    location.bloque = value
                    location.cama = '-'
                    phrases.push(`bloque ${value}`)
                    needsRefresh = true
                    continue
                }
            }

            if (word === 'cama' && i + 1 < words.length) {
                const n = parseNumber(words[i + 1])
                if (n !== null) {
                    let value = String(n)
                    if (i + 2 < words.length && LETTERS.includes(words[i + 2])) {
                        value += words[i + 2]
                        i += 3
                    } else {
                        i += 2
                    }
                    dispatch({ type: 'setCama', value })
                    location.cama = value
                    phrases.push(`cama ${value}`)
                    needsRefresh = true
                    continue
                }
            }

            if (STAGES.includes(word as Stage) && i + 1 < words.length) {
                const n = parseNumber(words[i + 1])
                if (n !== null) {
                    if (hasLocation()) {
                        pendingObservations.push({
                            at: Date.now(),
                            finca: location.finca,
                            bloque: location.bloque,
                            cama: location.cama,
                            stage: word,
                            value: n,
                        })
                        phrases.push(`${word} ${n}`)
                        needsRefresh = true
                    } else {
                        phrases.push('configura ubicacion primero')
                    }
                    i += 2
                    continue
                }
            }

            i += 1
        }

        if (pendingObservations.length > 0) {
            await addObservationsBatch(pendingObservations)
        }

        if (phrases.length) {
            speakLatest(phrases.join(' '), voiceSelection)
        }

        if (needsRefresh) {
            onCountsChangedLatest?.()
        }
    }, [dispatch])

    useEffect(() => {
        let cancelled = false

        if (!recognizerRef.current) {
            setIsLoading(true)
        } else {
            setIsSupported(true)
            setIsLoading(false)
        }

        const initVosk = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('MediaDevices API not supported')
                }

                const model = await ensureModel(modelPath)
                if (cancelled) return

                modelRef.current = model

                if (!recognizerRef.current) {
                    const grammarWords = getGrammarWords()
                    const recognizer = new model.KaldiRecognizer(16000, JSON.stringify(grammarWords))
                    recognizerRef.current = recognizer

                    recognizer.on('result', (message) => {
                        if (message.result?.text) {
                            const transcript = message.result.text.trim()
                            if (transcript.length > 0) {
                                processCommand(transcript)
                                setPartial('')
                            }
                        }
                    })

                    recognizer.on('partialresult', (message) => {
                        if (message.partial) {
                            setPartial(message.partial)
                        }
                    })
                }

                if (!cancelled) {
                    setIsSupported(true)
                    setIsLoading(false)
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('[vosk] failed to initialize recognizer', error)
                    setIsSupported(false)
                    setIsLoading(false)
                }
            }
        }

        if (!recognizerRef.current) {
            void initVosk()
        }

        return () => {
            cancelled = true
        }
    }, [modelPath, processCommand])

    const stopRecording = () => {
        processorRef.current?.disconnect()
        processorRef.current = null
        sourceRef.current?.disconnect()
        sourceRef.current = null
        analyserRef.current?.disconnect()
        analyserRef.current = null
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (audioContextRef.current?.state !== 'closed') {
            audioContextRef.current?.close()
            audioContextRef.current = null
        }
    }

    const start = useCallback(async () => {
        if (!recognizerRef.current || isListening) return

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1,
                },
            })

            streamRef.current = stream
            const audioContext = new AudioContext({ sampleRate: 16000 })
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            sourceRef.current = source

            const processor = audioContext.createScriptProcessor(4096, 1, 1)
            source.connect(processor)

            const sink = audioContext.createGain()
            sink.gain.value = 0
            processor.connect(sink)
            sink.connect(audioContext.destination)

            processor.onaudioprocess = (e: AudioProcessingEvent) => {
                recognizerRef.current?.acceptWaveform(e.inputBuffer)
            }

            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.92
            source.connect(analyser)
            analyserRef.current = analyser

            processorRef.current = processor
            setIsListening(true)
        } catch {
            stopRecording()
        }
    }, [isListening])

    const stop = useCallback(() => {
        stopRecording()
        setIsListening(false)
        setPartial('')
    }, [])

    return {
        isListening,
        isLoading,
        isSupported,
        partial,
        lastCommand,
        start,
        stop,
        analyser: analyserRef,
    }
}
