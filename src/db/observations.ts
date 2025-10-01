import Dexie, { type Table } from 'dexie'

export type ObservationRecord = {
    id?: number
    at: number
    finca: string
    bloque: string
    cama: string
    stage: string
    value: number
}

class ObservationsDB extends Dexie {
    observations!: Table<ObservationRecord, number>
    constructor() {
        super('roseTrackerDB')
        this.version(1).stores({
            observations: '++id, at, [finca+bloque+cama], finca, bloque, cama, stage',
        })
    }
}

export const db = new ObservationsDB()

export async function addObservations(rows: ObservationRecord[]) {
    if (!rows.length) return
    await db.observations.bulkAdd(rows.map(({ id, ...r }) => r))
}

export async function getAllObservations(): Promise<ObservationRecord[]> {
    return db.observations.toArray()
}

export async function deleteObservationsByAt(at: number): Promise<number> {
    // Delete all observations matching the timestamp 'at'. Returns count deleted.
    const coll = db.observations.where('at').equals(at)
    const toDelete = await coll.primaryKeys()
    if (!toDelete.length) return 0
    await db.observations.bulkDelete(toDelete)
    return toDelete.length
}
