import { useState, useEffect, useRef, useCallback } from 'react'
import { vocabulary } from '../utils/vocabulary'

interface UseVoskRecognitionProps {
    onTranscript: (transcript: string) => void
    modelPath: string
}

// Minimal local types for Vosk to avoid any
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

export const useVoskRecognition = ({ onTranscript, modelPath }: UseVoskRecognitionProps) => {
    const [isListening, setIsListening] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSupported, setIsSupported] = useState(false)
    const [partial, setPartial] = useState('')

    const modelRef = useRef<VoskModel | null>(null)
    const recognizerRef = useRef<VoskRecognizer | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const onTranscriptRef = useRef(onTranscript)

    // Keep latest callback without reinitializing Vosk
    useEffect(() => {
        onTranscriptRef.current = onTranscript
    }, [onTranscript])

    useEffect(() => {
        let mounted = true

        const initVosk = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('MediaDevices API not supported')
                }

                const { createModel } = await import('vosk-browser')

                setIsLoading(true)

                const modelAny = await createModel(modelPath)
                if (!mounted) return

                const model = modelAny as unknown as VoskModel
                modelRef.current = model

                const grammarWords = vocabulary.getAllWords()
                const recognizer = new model.KaldiRecognizer(16000, JSON.stringify(grammarWords))
                recognizerRef.current = recognizer

                recognizer.on('result', (message) => {
                    if (message.result && message.result.text) {
                        const transcript = message.result.text.trim()
                        if (transcript.length > 0) {
                            try {
                                onTranscriptRef.current?.(transcript)
                            } catch {
                                // ignore
                            }
                            setPartial('')
                        }
                    }
                })

                recognizer.on('partialresult', (message) => {
                    if (message.partial) {
                        setPartial(message.partial)
                    }
                })

                setIsSupported(true)
                setIsLoading(false)
            } catch {
                if (mounted) {
                    setIsLoading(false)
                    setIsSupported(false)
                }
            }
        }

        initVosk()

        return () => {
            mounted = false
            stopRecording()
        }
    }, [modelPath])

    const stopRecording = () => {
        if (processorRef.current) {
            processorRef.current.disconnect()
            processorRef.current = null
        }

        if (sourceRef.current) {
            sourceRef.current.disconnect()
            sourceRef.current = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
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

            // Use ScriptProcessorNode (deprecated but works)
            const processor: ScriptProcessorNode = audioContext.createScriptProcessor(4096, 1, 1)

            source.connect(processor)
            // Keep processor alive without routing mic to speakers (avoid feedback)
            const sink = audioContext.createGain()
            sink.gain.value = 0
            processor.connect(sink)
            sink.connect(audioContext.destination)

            processor.onaudioprocess = (e: AudioProcessingEvent) => {
                if (recognizerRef.current) {
                    try {
                        recognizerRef.current.acceptWaveform(e.inputBuffer)
                    } catch {
                        // ignore
                    }
                }
            }

            // Create analyser for visualization
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
        start,
        stop,
        analyser: analyserRef,
    }
}