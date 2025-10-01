// Use normalization and number parsing from numberConverter
import { normalizeSpanish as normalize, parseNumber } from './numberConverter'

import { FINCA_MAP, vocabulary } from './vocabulary'

export type Stage = (typeof vocabulary.stages)[number]
export type LocationType = 'finca' | 'bloque' | 'cama'

export interface CommandResult {
    type: 'location' | 'count' | 'undo' | 'undo_stage' | 'total' | 'voice' | 'unknown'
    locationType?: LocationType
    locationValue?: string
    stage?: Stage
    value?: number
    voice?: 'male' | 'female'
}

// local parser no longer needed; use parseNumber from util

export const processCommand = (input: string): CommandResult[] => {
    const text = normalize(input)
    const words = text.split(/\s+/).filter(Boolean)
    const results: CommandResult[] = []

    const STAGES = vocabulary.stages as Stage[]
    const LETTERS = vocabulary.letters

    // Undo: "borrar ultimo [stage]"
    if (words.includes('borrar') && words.includes('ultimo')) {
        const s = words.find((w) => STAGES.includes(w as Stage))
        return s ? [{ type: 'undo_stage', stage: s as Stage }] : [{ type: 'undo' }]
    }

    // Total
    if (words.includes('total')) {
        return [{ type: 'total' }]
    }

    // Voice switch keywords
    const VOICE_MAP: Record<string, 'male' | 'female'> = {
        masculino: 'male',
        masculina: 'male',
        hombre: 'male',
        varon: 'male',
        varón: 'male',
        femenino: 'female',
        femenina: 'female',
        femenie: 'female', // common misrecognition in the field
        mujer: 'female',
    }

    // Parse sequential commands in one transcript
    let i = 0
    while (i < words.length) {
        const word = words[i]

        // voice: masculino / femenino
        const vm = VOICE_MAP[word]
        if (vm) {
            results.push({ type: 'voice', voice: vm })
            i += 1
            continue
        }

        // finca <n | word> → map via FINCA_MAP
        if (word === 'finca' && i + 1 < words.length) {
            const next = words[i + 1]
            const n = parseNumber(next)
            const key = (n ?? next).toString()
            const fincaName = FINCA_MAP[key] || FINCA_MAP[next]
            if (fincaName) {
                results.push({ type: 'location', locationType: 'finca', locationValue: fincaName })
                i += 2
                continue
            }
        }

        // bloque <n> [a|b|c]
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
                results.push({ type: 'location', locationType: 'bloque', locationValue: value })
                continue
            }
        }

        // cama <n> [a|b|c]
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
                results.push({ type: 'location', locationType: 'cama', locationValue: value })
                continue
            }
        }

        // stage <count>
        if (STAGES.includes(word as Stage) && i + 1 < words.length) {
            const n = parseNumber(words[i + 1])
            if (n !== null) {
                results.push({ type: 'count', stage: word as Stage, value: n })
                i += 2
                continue
            }
        }

        i += 1
    }

    return results.length ? results : [{ type: 'unknown' }]
}

// Helper to predict location state within a transcript and gate counts until location is fully set
export function gateResultsWithLocation(
    results: CommandResult[],
    current: { finca: string; bloque: string; cama: string }
): { filtered: CommandResult[]; notice: string | null } {
    let nextFinca = current.finca
    let nextBloque = current.bloque
    let nextCama = current.cama
    for (const r of results) {
        if (r.type === 'location' && r.locationType && r.locationValue) {
            if (r.locationType === 'finca') nextFinca = r.locationValue
            if (r.locationType === 'bloque') nextBloque = r.locationValue
            if (r.locationType === 'cama') nextCama = r.locationValue
        }
    }
    const missing: string[] = []
    if (!nextFinca || nextFinca === '-') missing.push('finca')
    if (!nextBloque || nextBloque === '-') missing.push('bloque')
    if (!nextCama || nextCama === '-') missing.push('cama')

    const hasCounts = results.some((r) => r.type === 'count')
    const filtered = hasCounts && missing.length ? results.filter((r) => r.type !== 'count') : results
    const notice = hasCounts && missing.length ? `Configura primero: ${missing.join(', ')}` : null
    return { filtered, notice }
}

// Helper to build short feedback phrases for audio playback
export function buildFeedbackPhrases(results: CommandResult[]): string[] {
    const phrases: string[] = []
    for (const r of results) {
        if (r.type === 'location' && r.locationType && r.locationValue) {
            if (r.locationType === 'finca') phrases.push(`finca ${r.locationValue}`)
            if (r.locationType === 'bloque') phrases.push(`bloque ${r.locationValue}`)
            if (r.locationType === 'cama') phrases.push(`cama ${r.locationValue}`)
        }
        if (r.type === 'count' && r.stage && typeof r.value === 'number') {
            phrases.push(`${r.stage} ${r.value}`)
        }
        // skip undo/total/voice to keep feedback concise
    }
    return phrases
}
