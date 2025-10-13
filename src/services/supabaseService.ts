import { supabase } from '../lib/supabase'
import type { Observation } from '../types'

// Map client estado names to database tipo_observacion names
const estadoToTipoObservacion: Record<string, string> = {
  // Estados fenológicos
  'color': 'rayando_color',
  'abierto': 'sepalos_abiertos',
  // Sensores (pass through as-is, but explicit for clarity)
  'conductividad_suelo': 'conductividad_suelo',
  'humedad': 'humedad',
  'temperatura_suelo': 'temperatura_suelo'
}

export async function syncObservationToSupabase(observation: Observation) {
  console.log('=== Syncing observation ===')
  console.log('observation:', observation)
  console.log('observation.fecha:', observation.fecha)
  console.log('observation.gps:', observation.gps)
  console.log('typeof observation.gps:', typeof observation.gps)

  // STEP 1: Insert GPS punto (if exists and has valid data)
  let gpsId: string | null = null
  if (observation.gps) {
    // Parse GPS if it's a string (shouldn't happen, but just in case)
    let gpsData: any = observation.gps
    if (typeof gpsData === 'string') {
      console.log('GPS is a string, parsing...')
      try {
        gpsData = JSON.parse(gpsData)
        console.log('Parsed GPS:', gpsData)
      } catch (e) {
        console.error('Failed to parse GPS data:', gpsData)
        gpsData = null
      }
    }

    if (gpsData) {
      // Transform GPS from local storage format to Supabase format
      // Local format: { latitude, longitude, accuracy, altitude, timestamp }
      // Supabase format: { latitud, longitud, precision, altitud, creado_en, usuario_id }
      const latitud = gpsData.latitud ?? gpsData.latitude
      const longitud = gpsData.longitud ?? gpsData.longitude

      console.log('GPS coordinates:', { latitud, longitud })
      console.log('creado_en will be:', observation.fecha)

      if (latitud != null && longitud != null) {
        const gpsInsertData = {
          latitud: latitud,
          longitud: longitud,
          precision: gpsData.precision ?? gpsData.accuracy,
          altitud: gpsData.altitud ?? gpsData.altitude,
          creado_en: observation.fecha,  // Use observation's fecha, not GPS timestamp
          usuario_id: observation.userId ? String(observation.userId) : null
        }

        console.log('Inserting GPS with data:', gpsInsertData)

        const { data: gpsInsert, error: gpsError } = await supabase
          .from('punto_gps')
          .insert(gpsInsertData)
          .select('id')
          .single()

        if (gpsError) {
          console.error('GPS insert error:', gpsError)
          throw gpsError
        }
        gpsId = gpsInsert.id
        console.log('GPS inserted with id:', gpsId)
      }
    }
  }

  // STEP 2: Map estado to tipo_observacion
  const tipoObservacion = estadoToTipoObservacion[observation.estado.toLowerCase()] || observation.estado

  if (!tipoObservacion || tipoObservacion.trim() === '') {
    throw new Error(`Tipo de observación inválido: "${observation.estado}"`)
  }

  // STEP 3: Get id_cama with ONE query (validates finca → bloque → grupo_cama → cama)
  const { data: camaData, error: camaError } = await supabase
    .from('cama')
    .select('id_cama, grupo_cama!inner(id_bloque, bloque!inner(id_finca))')
    .eq('nombre', observation.cama)
    .eq('grupo_cama.bloque.id_finca', parseInt(observation.finca))
    .eq('grupo_cama.bloque.nombre', observation.bloque)
    .limit(1)
    .single()

  if (camaError || !camaData) {
    throw new Error(`Cama "${observation.cama}" no encontrada en finca ${observation.finca}, bloque ${observation.bloque}`)
  }

  // STEP 4: Insert observacion
  const { data: obsData, error: obsError } = await supabase
    .from('observacion')
    .insert({
      id_cama: camaData.id_cama,
      id_usuario: observation.userId || null,
      tipo_observacion: tipoObservacion,
      cantidad: observation.cantidad,
      id_punto_gps: gpsId,
      creado_en: observation.fecha
    })
    .select('id_observacion')
    .single()

  if (obsError) throw obsError
  return obsData.id_observacion
}

/**
 * Fetch all observations for a single day
 * @param date - Date object or ISO string for the day to fetch
 * @returns Array of observations with related data (cama, bloque, finca, GPS, usuario)
 */
export async function getObservationsForDay(date: Date | string) {
  // Convert date to start and end of day in ISO format
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const startOfDay = new Date(dateObj)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(dateObj)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('observacion')
    .select(`
      id_observacion,
      id_usuario,
      tipo_observacion,
      cantidad,
      creado_en,
      usuario:id_usuario(
        id_usuario,
        nombres,
        apellidos
      ),
      cama!inner(
        id_cama,
        nombre,
        grupo_cama!inner(
          bloque!inner(
            id_finca,
            nombre
          )
        )
      ),
      punto_gps:id_punto_gps(
        id,
        latitud,
        longitud,
        precision,
        altitud,
        creado_en
      )
    `)
    .gte('creado_en', startOfDay.toISOString())
    .lte('creado_en', endOfDay.toISOString())
    .order('creado_en', { ascending: true })

  if (error) throw error
  return data
}
