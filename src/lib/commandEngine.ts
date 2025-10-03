import { parseSpanishNumber } from '@/lib/spanishNumbers'

export const HIERARCHY = ['finca', 'bloque', 'cama'] as const
export const ESTADO_COMMANDS = ['arroz', 'arveja', 'garbanzo', 'color', 'abierto'] as const
export const NAVIGATION_COMMANDS = ['observaciones'] as const
export const COMMANDS = [...HIERARCHY, ...ESTADO_COMMANDS, 'borrar'] as const

export type ContextKey = typeof HIERARCHY[number]

export type InterpretationEvent =
    | { type: 'context'; key: ContextKey; value: string }
    | { type: 'estado'; estado: string; cantidad: number }
    | { type: 'undo' }
    | { type: 'navigate'; to: string }

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

    // Check for undo command (no parameters needed)
    if (/\bborrar\b/i.test(buffer)) {
        return {
            buffer: '',
            event: { type: 'undo' },
        }
    }

    // Check for navigation commands (no parameters needed)
    for (const navCmd of NAVIGATION_COMMANDS) {
        if (new RegExp(`\\b${navCmd}\\b`, 'i').test(buffer)) {
            return {
                buffer: '',
                event: { type: 'navigate', to: `/${navCmd}` },
            }
        }
    }

    // Find the rightmost (most recent) command with a valid value
    let bestMatch: { cmd: string; value: string | number; startIndex: number } | null = null

    for (const cmd of COMMANDS) {
        if (cmd === 'borrar') continue // Already handled above

        // Find the last occurrence of this command word
        const cmdPattern = new RegExp(`\\b${cmd}\\b`, 'gi')
        let match
        let lastMatchIndex = -1

        while ((match = cmdPattern.exec(buffer)) !== null) {
            lastMatchIndex = match.index
        }

        if (lastMatchIndex === -1) continue

        // Extract everything after this command word
        const afterCmd = buffer.substring(lastMatchIndex + cmd.length).trim()
        if (!afterCmd) continue

        // The value is everything up to the next command word (or end of string)
        const commandsPattern = COMMANDS.filter(c => c !== 'borrar').join('|')
        const valueMatch = afterCmd.match(new RegExp(`^([^]*?)(?:\\s+(?:${commandsPattern})\\b|$)`, 'i'))

        if (!valueMatch) continue

        const tailRaw = valueMatch[1].trim()

        // Don't allow command words as values
        const hasCommandWord = COMMANDS.some(c => new RegExp(`\\b${c}\\b`, 'i').test(tailRaw))
        if (hasCommandWord) continue

        let value: string | number | null = /^\d+$/.test(tailRaw) ? parseInt(tailRaw, 10) : parseSpanishNumber(tailRaw)

        // Allow finca letter (e.g., "finca a")
        if ((cmd === 'finca') && !value && /^[a-z]$/i.test(tailRaw)) {
            value = tailRaw
        }

        if (!value && value !== 0) continue

        // Keep the rightmost (most recent) valid match
        if (!bestMatch || lastMatchIndex > bestMatch.startIndex) {
            bestMatch = { cmd, value, startIndex: lastMatchIndex }
        }
    }

    if (!bestMatch) return { buffer }

    // Check if command is in hierarchy
    if (HIERARCHY.includes(bestMatch.cmd as any)) {
        return {
            buffer: '',
            event: { type: 'context', key: bestMatch.cmd as ContextKey, value: String(bestMatch.value) },
        }
    }

    // Otherwise it's an estado command
    return {
        buffer: '',
        event: { type: 'estado', estado: bestMatch.cmd, cantidad: Number(bestMatch.value) },
    }
}
