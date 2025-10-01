import { type CommandResult } from '@/utils/commandProcessor'
import { vocabulary } from '@/utils/vocabulary'

export type Counts = Record<string, number>

export type State = {
    finca: string
    bloque: string
    cama: string
    counts: Counts
    history: { stage: string; value: number }[]
    voice: 'male' | 'female'
    observations: Array<{
        at: number // epoch ms
        finca: string
        bloque: string
        cama: string
        stage: string
        value: number
    }>
}

export type Observation = State['observations'][number]

export type Action =
    | { type: 'applyResults'; results: CommandResult[] }
    | { type: 'hydrateObservations'; items: Observation[] }

export function reducer(s: State, a: Action): State {
    switch (a.type) {
        case 'applyResults': {
            let next: State = { ...s, counts: { ...s.counts }, history: [...s.history] }

            const computeTodayCountsFor = (finca: string, bloque: string, cama: string): Counts => {
                const zero = Object.fromEntries(vocabulary.stages.map((st) => [st, 0])) as Counts
                if (!finca || finca === '-' || !bloque || bloque === '-' || !cama || cama === '-') return zero
                const start = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
                const end = start + 24 * 60 * 60 * 1000
                const totals = { ...zero }
                for (const o of s.observations) {
                    if (o.at >= start && o.at < end && o.finca === finca && o.bloque === bloque && o.cama === cama) {
                        if (vocabulary.stages.includes(o.stage)) {
                            totals[o.stage] = (totals[o.stage] ?? 0) + o.value
                        }
                    }
                }
                return totals
            }
            for (const r of a.results) {
                if (r.type === 'location' && r.locationType && r.locationValue) {
                    if (r.locationType === 'finca') {
                        // Changing finca resets bloque and cama and clears counts/history
                        if (next.finca !== r.locationValue) {
                            next.finca = r.locationValue
                            next.bloque = '-'
                            next.cama = '-'
                            next.counts = Object.fromEntries(vocabulary.stages.map((s) => [s, 0])) as Counts
                            next.history = []
                        }
                    }
                    if (r.locationType === 'bloque') {
                        // Changing bloque requires choosing a new cama; clear cama and counts/history
                        if (next.bloque !== r.locationValue) {
                            next.bloque = r.locationValue
                            next.cama = '-'
                            next.counts = Object.fromEntries(vocabulary.stages.map((s) => [s, 0])) as Counts
                            next.history = []
                        }
                    }
                    if (r.locationType === 'cama') {
                        // Changing cama clears counts/history
                        if (next.cama !== r.locationValue) {
                            next.cama = r.locationValue
                            // Recompute counts from today's observations for this location
                            next.counts = computeTodayCountsFor(next.finca, next.bloque, next.cama)
                            next.history = []
                        }
                    }
                }
                if (r.type === 'voice' && r.voice) {
                    next.voice = r.voice
                }
                if (r.type === 'count' && r.stage && typeof r.value === 'number') {
                    const key = r.stage
                    next.counts[key] = (next.counts[key] ?? 0) + r.value
                    next.history.push({ stage: key, value: r.value })
                    // Log observation snapshot only if location is fully set
                    if (next.finca !== '-' && next.bloque !== '-' && next.cama !== '-') {
                        next.observations = [
                            ...next.observations,
                            {
                                at: Date.now(),
                                finca: next.finca,
                                bloque: next.bloque,
                                cama: next.cama,
                                stage: key,
                                value: r.value,
                            },
                        ]
                    }
                }
                if (r.type === 'undo') {
                    const last = next.history.pop()
                    if (last) {
                        next.counts[last.stage] = Math.max(0, (next.counts[last.stage] ?? 0) - last.value)
                        // Log negative observation to reflect undo in durable totals when location is set
                        if (next.finca !== '-' && next.bloque !== '-' && next.cama !== '-') {
                            next.observations = [
                                ...next.observations,
                                {
                                    at: Date.now(),
                                    finca: next.finca,
                                    bloque: next.bloque,
                                    cama: next.cama,
                                    stage: last.stage,
                                    value: -last.value,
                                },
                            ]
                        }
                    }
                }
                if (r.type === 'undo_stage' && r.stage) {
                    for (let idx = next.history.length - 1; idx >= 0; idx--) {
                        if (next.history[idx].stage === r.stage) {
                            const [removed] = next.history.splice(idx, 1)
                            if (removed) {
                                next.counts[r.stage] = Math.max(0, (next.counts[r.stage] ?? 0) - removed.value)
                                if (next.finca !== '-' && next.bloque !== '-' && next.cama !== '-') {
                                    next.observations = [
                                        ...next.observations,
                                        {
                                            at: Date.now(),
                                            finca: next.finca,
                                            bloque: next.bloque,
                                            cama: next.cama,
                                            stage: r.stage,
                                            value: -removed.value,
                                        },
                                    ]
                                }
                            }
                            break
                        }
                    }
                }
                // r.type === 'total' doesn't change state here; UI derives total
            }
            return next
        }
        case 'hydrateObservations': {
            // Replace observations with durable data (no duplicates handling here)
            return { ...s, observations: [...a.items] }
        }
        default:
            return s
    }
}

export function createInitialState(): State {
    return {
        finca: '-',
        bloque: '-',
        cama: '-',
        counts: Object.fromEntries(vocabulary.stages.map((s) => [s, 0])) as Counts,
        history: [],
        voice: 'male',
        observations: [],
    }
}

// Context and provider are defined in VoiceContext.tsx to avoid JSX in .ts file
