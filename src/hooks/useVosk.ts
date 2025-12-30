import { useEffect, useMemo, useRef, useState } from 'react'
import { createModel } from 'vosk-browser'
import type { UseVoskOptions } from '@/types'

function normalizeSpanish(text: string) {
    return text
        .toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .trim()
}

export function useVosk(options: UseVoskOptions = {}) {
    const { onResult } = options
    const [isInitializing, setIsInitializing] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [partialTranscript, setPartialTranscript] = useState('')
    const modelRef = useRef<any>(null)
    const recognizerRef = useRef<any>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)

    const grammarWords = useMemo(() => {
        const words = new Set<string>()
        // connector
        words.add('y')
            // units
            ;['cero', 'uno', 'un', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'].forEach(w => words.add(w))
            // 10-15
            ;['diez', 'once', 'doce', 'trece', 'catorce', 'quince'].forEach(w => words.add(w))
            // 16-19 variants
            ;['dieciseis', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'].forEach(w => words.add(w))
            // tens 20-90
            ;['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'].forEach(w => words.add(w))
            // 21-29 fused forms (variants)
            ;[
                'veintiuno',
                'veintiun',
                'veintiún',
                'veintiuna',
                'veintidos',
                'veintidós',
                'veintitres',
                'veintitrés',
                'veinticuatro',
                'veinticinco',
                'veintiseis',
                'veintiséis',
                'veintisiete',
                'veintiocho',
                'veintinueve',
            ].forEach(w => words.add(w))
            // hundreds up to 400
            ;['cien', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos'].forEach(w => words.add(w))
            // command words - estados and sensores
            ;[
                'finca', 'bloque', 'cama', 'parar',
                'arroz', 'arveja', 'garbanzo', 'color', 'abierto',  // estados
                'conductividad', 'humedad', 'temperatura',  // sensores
                'borrar', 'ultimo', 'observaciones', 'a', 'b', 'c', 'd'
            ].forEach(w => words.add(w))
        // unknown token
        words.add('[unk]')
        return Array.from(words)
    }, [])

    const start = async () => {
        setIsInitializing(true)
        try {
            if (!modelRef.current) {
                const modelPath = `${import.meta.env.BASE_URL}models/vosk-model-small-es-0.42.tar.gz`
                const modelUrl = new URL(modelPath, window.location.origin).href
                modelRef.current = await createModel(modelUrl)
                try { modelRef.current.setLogLevel?.(-1) } catch { }
            }
            if (!recognizerRef.current) {
                recognizerRef.current = new modelRef.current.KaldiRecognizer(16000, JSON.stringify(grammarWords))
                recognizerRef.current.on('result', (message: any) => {
                    const text = normalizeSpanish(String(message?.result?.text || ''))
                    if (text) {
                        setTranscript(text)
                        onResult?.(text, true)
                    }
                    setPartialTranscript('')
                })
                recognizerRef.current.on('partialresult', (message: any) => {
                    const p = normalizeSpanish(String(message?.result?.partial || ''))
                    setPartialTranscript(p)
                })
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1, sampleRate: 16000 },
            })
            mediaStreamRef.current = stream
            audioContextRef.current = new AudioContext()
            const source = audioContextRef.current.createMediaStreamSource(stream)
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e: AudioProcessingEvent) => {
                if (recognizerRef.current) {
                    try {
                        recognizerRef.current.acceptWaveform(e.inputBuffer)
                    } catch (err) {
                        console.error('acceptWaveform failed', err)
                    }
                }
            }
            source.connect(processor)
            processor.connect(audioContextRef.current.destination)
            setIsListening(true)
        } catch (error) {
            console.error('Error starting recognition:', error)
        } finally {
            setIsInitializing(false)
        }
    }

    const stop = () => {
        try {
            setPartialTranscript('')
            setTranscript('')
            if (processorRef.current) {
                processorRef.current.disconnect()
                processorRef.current.onaudioprocess = null as any
                processorRef.current = null
            }
            if (audioContextRef.current) {
                audioContextRef.current.close()
                audioContextRef.current = null
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(t => t.stop())
                mediaStreamRef.current = null
            }
            if (recognizerRef.current) {
                recognizerRef.current.remove()
                recognizerRef.current = null
            }
        } finally {
            setIsListening(false)
        }
    }

    useEffect(() => {
        return () => {
            stop()
            if (modelRef.current) {
                try {
                    modelRef.current.terminate()
                } catch { }
                modelRef.current = null
            }
        }
    }, [])

    return { isInitializing, isListening, start, stop, transcript, partialTranscript, audioContext: audioContextRef.current, mediaStream: mediaStreamRef.current }
}
