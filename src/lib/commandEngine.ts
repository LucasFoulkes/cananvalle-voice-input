import { parseSpanishNumber } from '@/lib/spanishNumbers'

export const HIERARCHY = ['finca', 'bloque', 'cama'] as const
export const ESTADO_COMMANDS = ['arroz', 'arveja', 'garbanzo', 'color', 'abierto'] as const
export const NAVIGATION_COMMANDS = ['observaciones'] as const
export const UNDO_COMMANDS = ['borrar ultimo arroz', 'borrar ultimo arveja', 'borrar ultimo garbanzo', 'borrar ultimo color', 'borrar ultimo abierto'] as const
export const COMMANDS = [...HIERARCHY, ...ESTADO_COMMANDS, 'borrar'] as const

export type ContextKey = typeof HIERARCHY[number]

export type InterpretationEvent =
    | { type: 'context'; key: ContextKey; value: string }
    | { type: 'estado'; estado: string; cantidad: number }
    | { type: 'undo' }
    | { type: 'undo-estado'; estado: string }
    | { type: 'navigate'; to: string }

export type InterpretationResult = {
    buffer: string
    event?: InterpretationEvent
    events?: InterpretationEvent[]
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

    // Check for undo estado commands (e.g., "borrar ultimo arroz")
    for (const estado of ESTADO_COMMANDS) {
        const undoPattern = new RegExp(`\\bborrar\\s+ultimo\\s+${estado}\\b`, 'i')
        if (undoPattern.test(buffer)) {
            return {
                buffer: '',
                event: { type: 'undo-estado', estado },
            }
        }
    }

    // Check for general undo command (no parameters needed)
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

    // Find ALL command matches in order
    const allMatches: { cmd: string; value: string | number; startIndex: number }[] = []

    for (const cmd of COMMANDS) {
        if (cmd === 'borrar') continue // Already handled above

        // Find ALL occurrences of this command word
        const cmdPattern = new RegExp(`\\b${cmd}\\b`, 'gi')
        let match

        while ((match = cmdPattern.exec(buffer)) !== null) {
            const matchIndex = match.index

            // Extract everything after this command word
            const afterCmd = buffer.substring(matchIndex + cmd.length).trim()
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

            allMatches.push({ cmd, value, startIndex: matchIndex })
        }
    }

    if (allMatches.length === 0) return { buffer }

    // Sort matches by position in text
    allMatches.sort((a, b) => a.startIndex - b.startIndex)

    // Convert matches to events
    const events: InterpretationEvent[] = allMatches.map(match => {
        if (HIERARCHY.includes(match.cmd as any)) {
            return { type: 'context', key: match.cmd as ContextKey, value: String(match.value) }
        } else {
            return { type: 'estado', estado: match.cmd, cantidad: Number(match.value) }
        }
    })

    // For backwards compatibility, return the last event as 'event'
    const lastEvent = events[events.length - 1]

    return {
        buffer: '',
        event: lastEvent,
        events: events.length > 1 ? events : undefined
    }
}
