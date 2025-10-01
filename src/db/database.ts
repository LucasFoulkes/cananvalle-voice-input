import Dexie, { type Table } from 'dexie'

export type Observation = {
    id?: number
    at: number
    finca: string
    bloque: string
    cama: string
    stage: string
    value: number
}

class RoseTrackerDB extends Dexie {
    observations!: Table<Observation, number>
    
    constructor() {
        super('roseTrackerDB')
        this.version(1).stores({
            observations: '++id, at, [finca+bloque+cama], finca, bloque, cama, stage',
        })
    }
}

export const db = new RoseTrackerDB()

// Add a single observation
export async function addObservation(obs: Omit<Observation, 'id'>) {
    return await db.observations.add(obs)
}

// Add multiple observations in batch
export async function addObservationsBatch(observations: Omit<Observation, 'id'>[]) {
    if (observations.length === 0) return []
    return await db.observations.bulkAdd(observations, { allKeys: true })
}

// Get all observations
export async function getAllObservations(): Promise<Observation[]> {
    return await db.observations.toArray()
}

// Get today's observations for a specific location
export async function getTodayObservations(finca: string, bloque: string, cama: string): Promise<Observation[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return await db.observations
        .where('[finca+bloque+cama]')
        .equals([finca, bloque, cama])
        .and(obs => obs.at >= today.getTime() && obs.at < tomorrow.getTime())
        .toArray()
}

// Delete an observation by ID
export async function deleteObservation(id: number): Promise<void> {
    await db.observations.delete(id)
}

// Delete last observation for a location/stage
export async function deleteLastObservation(
    finca: string,
    bloque: string,
    cama: string,
    stage?: string
): Promise<Observation | null> {
    let query = db.observations
        .where('[finca+bloque+cama]')
        .equals([finca, bloque, cama])

    if (stage) {
        query = query.and(obs => obs.stage === stage)
    }

    // Sort by 'at' descending to get the most recent first
    const items = await query.sortBy('at')
    const last = items[items.length - 1] // Get the last (most recent) item

    if (last?.id) {
        await db.observations.delete(last.id)
        return last
    }

    return null
}

// Get summary counts for today grouped by location
export async function getTodaySummary() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const observations = await db.observations
        .where('at')
        .between(today.getTime(), tomorrow.getTime())
        .toArray()
    
    // Group by location and stage
    const summary = new Map<string, Map<string, number>>()
    
    for (const obs of observations) {
        const key = `${obs.finca}|${obs.bloque}|${obs.cama}`
        if (!summary.has(key)) {
            summary.set(key, new Map())
        }
        const stages = summary.get(key)!
        stages.set(obs.stage, (stages.get(obs.stage) || 0) + obs.value)
    }
    
    return summary
}