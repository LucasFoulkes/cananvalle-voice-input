import { supabase } from '../lib/supabase'
import type { Observation } from '../types'

// Remove leading zeros from numeric strings
const cleanNumericString = (value: string): string => {
  const num = parseInt(value, 10)
  return isNaN(num) ? value : num.toString()
}

// Map client estado names to database tipo_observacion names
const estadoToTipoObservacion: Record<string, string> = {
  'color': 'rayando_color',
  'abierto': 'sepalos_abiertos'
}

export async function syncObservationToSupabase(observation: Observation) {
  let gpsId: string | null = null

  // Upload GPS point if available
  if (observation.gps) {
    const { data: gpsData, error: gpsError } = await supabase
      .from('puntos_gps')
      .insert({
        latitud: observation.gps.latitud,
        longitud: observation.gps.longitud,
        precision: observation.gps.precision,
        altitud: observation.gps.altitud,
        creado_en: observation.gps.creado_en,
        usuario_id: null
      })
      .select('id')
      .single()

    if (gpsError) throw gpsError
    gpsId = gpsData.id
  }

  // Clean values (remove leading zeros)
  const fincaId = parseInt(cleanNumericString(observation.finca), 10)
  const bloqueNombre = cleanNumericString(observation.bloque)
  const camaNombre = cleanNumericString(observation.cama)

  // Map estado name to database tipo_observacion
  const tipoObservacion = estadoToTipoObservacion[observation.estado.toLowerCase()] || observation.estado

  // Get finca by id_finca (NEVER INSERT)
  const { data: finca, error: fincaError } = await supabase
    .from('finca')
    .select('id_finca:id_finca')
    .eq('id_finca', fincaId)
    .single()

  if (fincaError || !finca) {
    throw new Error(`Finca ${fincaId} no encontrada`)
  }

  // Get bloque by nombre (NEVER INSERT)
  const { data: bloque, error: bloqueError } = await supabase
    .from('bloque')
    .select('id_bloque:id_bloque')
    .eq('nombre', bloqueNombre)
    .eq('id_finca', finca.id_finca)
    .single()

  if (bloqueError || !bloque) {
    throw new Error(`Bloque "${bloqueNombre}" no encontrado en finca ${fincaId}`)
  }

  // Find cama by nombre and through grupo_cama -> bloque relationship (NEVER INSERT)
  const { data: camas, error: camaError } = await supabase
    .from('cama')
    .select('id_cama:id_cama, grupo_cama!inner(id_bloque)')
    .eq('nombre', camaNombre)
    .eq('grupo_cama.id_bloque', bloque.id_bloque)
    .limit(1)

  if (camaError) throw camaError

  if (!camas || camas.length === 0) {
    throw new Error(`Cama "${camaNombre}" no encontrada en bloque "${bloqueNombre}"`)
  }

  const cama = camas[0]

  // Insert observation
  const { data: obsData, error: obsError } = await supabase
    .from('observacion')
    .insert({
      id_cama: cama.id_cama,
      tipo_observacion: tipoObservacion,
      cantidad: observation.cantidad,
      id_punto_gps: gpsId,
      creado_en: observation.fecha
    })
    .select('id_observacion')
    .single()

  if (obsError) throw obsError
  if (!obsData) throw new Error('No se recibió ID de observación')

  // Add sync entry
  const modifiedTables = ['observacion']
  if (gpsId) modifiedTables.push('puntos_gps')

  const { error: syncError } = await supabase
    .from('sync')
    .insert({
      tables: modifiedTables
    })

  if (syncError) console.warn('Sync table entry failed:', syncError)

  return obsData.id_observacion
}
