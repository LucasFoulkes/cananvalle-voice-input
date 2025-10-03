export type Usuario = {
    id_usuario: number
    nombres: string
    apellidos: string | null
    cedula: string | null
    rol: string
    clave_pin: string
    creado_en?: string
}

export type GpsLocation = {
    id: string
    usuario_id: string | null
    latitud: number
    longitud: number
    precision: number
    altitud: number | null
    creado_en: string
}

export type Observation = {
    fecha: string
    finca: string
    bloque: string
    cama: string
    estado: string
    cantidad: number
    gps?: GpsLocation
    synced?: boolean
    syncError?: string
    syncing?: boolean
    observacionId?: number
}
