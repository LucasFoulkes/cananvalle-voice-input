import { supabase } from '@/lib/supabase'

export type ObservationType = {
    codigo: string
    orden: number | null
}

type CachedObservationTypes = {
    data: ObservationType[]
    timestamp: number
}

type SupabaseObservationRow = {
    codigo: string
    estado_fenologico_orden?: { orden: number } | { orden: number }[] | null
}

const CACHE_STORAGE_KEY = 'observation_types_cache_v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

const DEFAULT_OBSERVATION_TYPES: ObservationType[] = [
    { codigo: 'brotacion', orden: 1 },
    { codigo: 'primera_hoja', orden: 2 },
    { codigo: 'cincuenta_mm', orden: 3 },
    { codigo: 'quince_cm', orden: 4 },
    { codigo: 'veinte_cm', orden: 5 },
    { codigo: 'espiga', orden: 6 },
    { codigo: 'arroz', orden: 7 },
    { codigo: 'arveja', orden: 8 },
    { codigo: 'garbanzo', orden: 9 },
    { codigo: 'uva', orden: 10 },
    { codigo: 'rayando_color', orden: 11 },
    { codigo: 'sepalos_abiertos', orden: 12 },
    { codigo: 'cosecha', orden: 13 },
]

let inMemoryCache: ObservationType[] | null = null

function normalizeRow(row: SupabaseObservationRow): ObservationType {
    const ordenCandidate = Array.isArray(row.estado_fenologico_orden)
        ? row.estado_fenologico_orden[0]?.orden
        : row.estado_fenologico_orden?.orden

    return {
        codigo: row.codigo,
        orden: typeof ordenCandidate === 'number' ? ordenCandidate : null,
    }
}

function sortObservationTypes(types: ObservationType[]): ObservationType[] {
    const withOrder = types.filter(type => typeof type.orden === 'number').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const withoutOrder = types.filter(type => type.orden === null).sort((a, b) => a.codigo.localeCompare(b.codigo))
    return [...withOrder, ...withoutOrder]
}

function readLocalCache(): ObservationType[] | null {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
        if (!raw) return null

        const parsed = JSON.parse(raw) as CachedObservationTypes
        if (!parsed?.data || !Array.isArray(parsed.data)) return null

        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null

        return parsed.data
    } catch (error) {
        console.warn('Failed to read observation types cache:', error)
        return null
    }
}

function writeLocalCache(data: ObservationType[]): void {
    if (typeof window === 'undefined') return

    try {
        const payload: CachedObservationTypes = {
            data,
            timestamp: Date.now(),
        }
        window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
        console.warn('Failed to write observation types cache:', error)
    }
}

export function formatObservationType(code: string): string {
    const friendly = code.replace(/_/g, ' ')
    return friendly.replace(/\b\w/g, char => char.toUpperCase())
}

export async function getObservationTypes(options: { forceRefresh?: boolean } = {}): Promise<ObservationType[]> {
    if (!options.forceRefresh && inMemoryCache) {
        return inMemoryCache
    }

    if (!options.forceRefresh) {
        const cached = readLocalCache()
        if (cached) {
            inMemoryCache = cached
            return cached
        }
    }

    try {
        const { data, error } = await supabase
            .from('observaciones_tipo')
            .select('codigo, estado_fenologico_orden!left(orden)')
            .order('codigo', { ascending: true })

        if (error) throw error

        if (data) {
            const normalized = sortObservationTypes(data.map(normalizeRow))
            inMemoryCache = normalized
            writeLocalCache(normalized)
            return normalized
        }
    } catch (error) {
        console.warn('Failed to load observation types from Supabase, falling back to cache/default:', error)
    }

    inMemoryCache = DEFAULT_OBSERVATION_TYPES
    return DEFAULT_OBSERVATION_TYPES
}

export async function ensureObservationType(code: string): Promise<boolean> {
    const types = await getObservationTypes()
    return types.some(type => type.codigo === code)
}

export function getCachedObservationTypes(): ObservationType[] {
    return inMemoryCache ?? DEFAULT_OBSERVATION_TYPES
}
