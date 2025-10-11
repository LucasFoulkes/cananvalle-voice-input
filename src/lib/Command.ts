import { parseSpanishNumberFromWords } from './spanishNumbers'
import type { ProcessCommandOptions } from '@/types'

/**
 * Processes voice command text and extracts observation commands.
 * Parses commands like "finca tres bloque veinte cama cinco arroz diez"
 * into structured commands with indices and values.
 */
export function processObservationCommand(text: string, options: ProcessCommandOptions): void {
    const { items, onSave } = options
    const words = text.split(' ').filter(Boolean)
    let i = 0

    while (i < words.length) {
        const command = words[i]
        const index = items.indexOf(command)

        if (index >= 0 && i + 1 < words.length) {
            const result = parseSpanishNumberFromWords(words, i + 1)

            if (result) {
                onSave(index, result.number.toString())
                i += 1 + result.wordsConsumed  // Skip command + number words
            } else {
                i++
            }
        } else {
            i++
        }
    }
}
