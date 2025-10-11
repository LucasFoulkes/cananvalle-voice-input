// ============================================
// OBSERVATION FIELD CONFIGURATION
// ============================================
export const OBSERVATION_CONFIG = {
    location: ['finca', 'bloque', 'cama'] as const,
    status: ['arroz', 'arveja', 'garbanzo', 'color', 'abierto', 'conductividad_suelo', 'humedad', 'temperatura_suelo'] as const,
} as const

export const ALL_OBSERVATION_FIELDS = [
    ...OBSERVATION_CONFIG.location,
    ...OBSERVATION_CONFIG.status
] as const

// ============================================
// TYPES
// ============================================

// -------- User Types --------
export type Usuario = {
    id_usuario: number
    nombres: string
    apellidos: string | null
    cedula: string | null
    rol: string
    clave_pin: string
    creado_en?: string
}

export type CreateUsuarioInput = {
    nombres: string
    apellidos?: string
    cedula?: string
    rol: 'conteos' | 'control_de_calidad'
    clave_pin: string
}

export type UserInfo = {
    id_usuario: string
    nombres: string
    apellidos: string | null
}

// -------- GPS Types --------
export type GpsCoordinates = {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    timestamp: number
}

export type GpsLocation = {
    usuario_id: string | null
    latitud: number
    longitud: number
    precision: number
    altitud: number | null
    creado_en: string
}

export type GpsPoint = {
    id: string
    latitud: number
    longitud: number
    precision: number
    altitud: number | null
    usuario_id: string | null
    creado_en: string
}

// -------- Observation Types --------
export type Observation = {
    fecha: string
    finca: string
    bloque: string
    cama: string
    estado: string
    cantidad: number
    gps?: GpsLocation
    userId?: number | null
    syncStatus?: 'pending' | 'success' | 'error'
    observacionId?: number
}

export type ObservationWithMeta = Observation & {
    originalArr?: any[]
    globalIndex?: number
}

export type GroupedObservations = Record<string, Record<string, ObservationWithMeta[]>>

export type ObservationCommand = {
    index: number
    value: string
}

export type ProcessCommandOptions = {
    items: string[]
    onSave: (index: number, value: string) => void
    mode?: 'estados' | 'sensores'
}

// -------- Timeline Types --------
export type CamaTimelineSegment = {
    id_cama: number
    finca: string
    bloque: string
    cama: string
    first_observation: string
    last_observation: string
    observation_count: number
    color: string
    first_gps?: GpsLocation | null
    last_gps?: GpsLocation | null
}

export type UserTimeline = {
    id_usuario: number
    nombres: string
    apellidos: string | null
    tipo?: 'estados' | 'sensores'
    segments: CamaTimelineSegment[]
}

// -------- Hook Return Types --------
export interface UseObservationsReturn {
    // Current observation being entered
    observacion: string[]
    // All saved observations
    observaciones: string[][]
    // Field configuration
    items: readonly string[]
    locationFieldCount: number
    // Actions
    save: (index: number, value: string) => Promise<void>
    getSum: (obsIndex: number, location: [string, string, string], date: string, mode?: 'estados' | 'sensores') => number
}

export type UseVoskOptions = {
    onResult?: (text: string, isFinal: boolean) => void
}
