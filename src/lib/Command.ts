import { parseSpanishNumberFromWords } from './spanishNumbers'
import type { ProcessCommandOptions } from '@/types'

// Location fields are always available in both modes
const LOCATION_COMMANDS = ['finca', 'bloque', 'cama']

// Estado fenológico commands (only available in estados mode)
const ESTADO_COMMANDS = ['arroz', 'arveja', 'garbanzo', 'color', 'abierto']

// Sensor commands (only available in sensores mode)
const SENSOR_COMMANDS = ['conductividad', 'humedad', 'temperatura']

// Map voice commands to actual field names
const COMMAND_ALIASES: Record<string, string> = {
    'conductividad': 'conductividad_suelo',
    'temperatura': 'temperatura_suelo',
}

/**
 * Processes voice command text and extracts observation commands.
 * Parses commands like "finca tres bloque veinte cama cinco arroz diez"
 * into structured commands with indices and values.
 * Filters commands based on the current mode (estados vs sensores).
 */
export function processObservationCommand(text: string, options: ProcessCommandOptions): void {
    const { items, onSave, mode } = options
    const words = text.split(' ').filter(Boolean)
    let i = 0

    while (i < words.length) {
        const command = words[i]
        // Map voice command to actual field name if needed
        const fieldName = COMMAND_ALIASES[command] || command
        const index = items.indexOf(fieldName)

        if (index >= 0 && i + 1 < words.length) {
            // Filter commands by mode
            const isLocationCommand = LOCATION_COMMANDS.includes(command)
            const isEstadoCommand = ESTADO_COMMANDS.includes(command)
            const isSensorCommand = SENSOR_COMMANDS.includes(command)

            // Allow location commands always, filter estado/sensor by mode
            const isValidCommand = isLocationCommand ||
                (mode === 'estados' && isEstadoCommand) ||
                (mode === 'sensores' && isSensorCommand) ||
                (!mode)  // No mode filter when mode is undefined

            if (isValidCommand) {
                const result = parseSpanishNumberFromWords(words, i + 1)

                if (result) {
                    onSave(index, result.number.toString())
                    i += 1 + result.wordsConsumed  // Skip command + number words
                } else {
                    i++
                }
            } else {
                i++  // Skip invalid command
            }
        } else {
            i++
        }
    }
}
