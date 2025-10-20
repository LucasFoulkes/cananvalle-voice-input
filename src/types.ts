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
// PINCHE FIELD CONFIGURATION
// ============================================
export const PINCHE_CONFIG = {
    location: ['finca', 'bloque', 'variedad'] as const,
    tipos: ['apertura', 'programado', 'sanitario'] as const,
} as const

export const ALL_PINCHE_FIELDS = [
    ...PINCHE_CONFIG.location,
    ...PINCHE_CONFIG.tipos
] as const

export type PincheTipo = 'pinche apertura' | 'pinche programado' | 'pinche sanitario'

// ============================================
// TYPES
// ============================================

// -------- User Types --------
export type UserRole =
    | 'sudo'                          // Full system access
    | 'control_de_calidad'            // Quality control - same as sudo
    | 'jefe_finca'                    // Farm manager - sees everything
    | 'supervisor_estados_fenologicos' // Only estados fenológicos
    | 'supervisor_sensores'            // Only sensores
    | 'supervisor_pinches'             // Only pinches
    | 'operario'                       // Basic worker - records only

export type Usuario = {
    id_usuario: number
    nombres: string
    apellidos: string | null
    cedula: string | null
    rol: UserRole
    pin: string
    nombre_usuario?: string | null
    creado_en?: string
}

export type CreateUsuarioInput = {
    nombres: string
    apellidos?: string
    cedula?: string
    rol: UserRole
    pin: string
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
    finca: string  // Finca ID (e.g., "1" for finca with id_finca=1), not name
    bloque: string  // Bloque name (e.g., "A")
    cama: string  // Cama name (e.g., "1")
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
    mode?: 'estados' | 'sensores' | 'pinches'
}

// -------- Pinche Types --------
export type VariedadOption = {
    id: number
    nombre: string
    color: string | null
    bloqueId: number | null
}

export type Pinche = {
    fecha: string
    finca: string  // Finca ID (e.g., "1" for finca with id_finca=1), not name
    bloque: string  // Bloque nombre (e.g., "A")
    variedadId: number | null
    variedad: string  // Variedad nombre selecionado
    variedadColor?: string | null
    tipo: PincheTipo
    cantidad: number
    gps?: GpsLocation  // For timezone only, not synced to DB
    userId?: number | null  // For quality control only, not synced to DB
    syncStatus?: 'pending' | 'success' | 'error'
    pincheId?: number
}

export type PincheWithMeta = Pinche & {
    originalArr?: any[]
    globalIndex?: number
}

export type GroupedPinches = Record<string, Record<string, PincheWithMeta[]>>

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

export interface UsePinchesReturn {
    // Current pinche being entered
    pinche: string[]
    // All saved pinches
    pinches: string[][]
    // Field configuration
    items: readonly string[]
    locationFieldCount: number
    selectedVariedad: VariedadOption | null
    selectVariedad: (option: VariedadOption | null) => void
    // Actions
    save: (index: number, value: string) => Promise<void>
    getSum: (pincheIndex: number, location: [string, string, string], date: string) => number
}

export type UseVoskOptions = {
    onResult?: (text: string, isFinal: boolean) => void
}
