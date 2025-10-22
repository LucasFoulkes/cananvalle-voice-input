import { parseSpanishNumberFromWords } from './spanishNumbers'
import type { ProcessCommandOptions } from '@/types'

const LOCATION_COMMANDS = ['finca', 'bloque', 'cama', 'variedad']

const ESTADO_COMMANDS = ['arroz', 'arveja', 'garbanzo', 'color', 'abierto']

const SENSOR_COMMANDS = ['conductividad', 'humedad', 'temperatura']

const PINCHE_COMMANDS = ['apertura', 'programado', 'sanitario']

const COMMAND_ALIASES: Record<string, string> = {
    'conductividad': 'conductividad_suelo',
    'temperatura': 'temperatura_suelo',
}

export function processObservationCommand(text: string, options: ProcessCommandOptions): void {
    const { items, onSave, mode } = options
    const words = text.split(' ').filter(Boolean)
    let i = 0

    while (i < words.length) {
        const command = words[i]
        const fieldName = COMMAND_ALIASES[command] || command
        const index = items.indexOf(fieldName)

        if (index >= 0 && i + 1 < words.length) {
            const isLocationCommand = LOCATION_COMMANDS.includes(command)
            const isEstadoCommand = ESTADO_COMMANDS.includes(command)
            const isSensorCommand = SENSOR_COMMANDS.includes(command)
            const isPincheCommand = PINCHE_COMMANDS.includes(command)

            const isValidCommand = isLocationCommand ||
                (mode === 'estados' && isEstadoCommand) ||
                (mode === 'sensores' && isSensorCommand) ||
                (mode === 'pinches' && isPincheCommand) ||
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
