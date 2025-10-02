import { parseSpanishNumber } from '@/lib/spanishNumbers'

export const COMMANDS = ['finca', 'bloque', 'cama', 'arroz', 'arveja', 'garbanzo', 'color', 'abierto'] as const
export type ContextKey = 'finca' | 'bloque' | 'cama'

export type InterpretationEvent =
    | { type: 'context'; key: ContextKey; value: string }
    | { type: 'estado'; estado: string; cantidad: number }

export type InterpretationResult = {
    buffer: string
    event?: InterpretationEvent
}

/**
 * Stateless interpreter for voice commands. Combines the previous buffer with
 * the new text, searches for the latest matching command at the tail, and if
 * found returns a normalized event and clears the buffer; otherwise returns the
 * updated buffer for future matches.
 */
export function interpretVoiceText(prevBuffer: string, text: string): InterpretationResult {
    // Keep only last 10 tokens to avoid unbounded growth
    const buffer = (prevBuffer + ' ' + text).trim().split(/\s+/).slice(-10).join(' ')

    for (const cmd of COMMANDS) {
        const re = new RegExp(`${cmd}\\s+(.+)$`, 'i')
        const match = buffer.match(re)
        if (!match) continue

        const tailRaw = match[1].trim()
        let value: string | number | null = /^\d+$/.test(tailRaw) ? parseInt(tailRaw, 10) : parseSpanishNumber(tailRaw)

        // Allow finca letter (e.g., "finca a")
        if ((cmd === 'finca') && !value && /^[a-z]$/i.test(tailRaw)) {
            value = tailRaw
        }

        if (!value && value !== 0) continue

        if (cmd === 'finca' || cmd === 'bloque' || cmd === 'cama') {
            return {
                buffer: '',
                event: { type: 'context', key: cmd, value: String(value) },
            }
        }

        return {
            buffer: '',
            event: { type: 'estado', estado: cmd, cantidad: Number(value) },
        }
    }

    return { buffer }
}
