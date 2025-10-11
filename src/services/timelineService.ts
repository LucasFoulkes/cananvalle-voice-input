import { supabase } from '../lib/supabase'
import type { CamaTimelineSegment, UserTimeline } from '../types'

function generateColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]
  return colors[index % colors.length]
}

export async function getUserTimelines(date: string): Promise<UserTimeline[]> {
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('usuario')
    .select('id_usuario, nombres, apellidos')

  if (usersError) throw usersError
  if (!users || users.length === 0) return []

  const startOfDay = `${date}T00:00:00.000`
  const endOfDay = `${date}T23:59:59.999`

  // Estado observation types
  const estadoTypes = ['arroz', 'arveja', 'garbanzo', 'color', 'abierto']
  // Sensor observation types
  const sensorTypes = ['conductividad_suelo', 'humedad', 'temperatura_suelo']

  // Get observations for the day grouped by user and cama
  const { data: observations, error: obsError } = await supabase
    .from('observacion')
    .select(`
      id_usuario,
      id_cama,
      tipo_observacion,
      creado_en,
      id_punto_gps,
      id_punto_gps:puntos_gps(latitud, longitud, precision, altitud, creado_en),
      cama!inner(
        id_cama,
        nombre,
        grupo_cama!inner(
          bloque!inner(
            id_finca,
            nombre
          )
        )
      )
    `)
    .in('id_usuario', users.map(u => u.id_usuario))
    .gte('creado_en', startOfDay)
    .lte('creado_en', endOfDay)
    .order('creado_en', { ascending: true })

  if (obsError) throw obsError

  // Process observations into timeline segments
  const userTimelines: UserTimeline[] = []

  users.forEach(user => {
    const userObservations = observations?.filter(o => o.id_usuario === user.id_usuario) || []

    // Split observations by type
    const estadoObservations = userObservations.filter(o => estadoTypes.includes(o.tipo_observacion))
    const sensorObservations = userObservations.filter(o => sensorTypes.includes(o.tipo_observacion))

    // Process estados
    if (estadoObservations.length > 0) {
      const segments = processObservationsToSegments(estadoObservations)
      if (segments.length > 0) {
        userTimelines.push({
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          tipo: 'estados',
          segments
        })
      }
    }

    // Process sensores
    if (sensorObservations.length > 0) {
      const segments = processObservationsToSegments(sensorObservations)
      if (segments.length > 0) {
        userTimelines.push({
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          tipo: 'sensores',
          segments
        })
      }
    }
  })

  return userTimelines
}

// Helper function to process observations into segments
function processObservationsToSegments(observations: any[]): CamaTimelineSegment[] {
  // Group by cama
  const camaMap = new Map<number, any[]>()
  observations.forEach(obs => {
    if (!camaMap.has(obs.id_cama)) {
      camaMap.set(obs.id_cama, [])
    }
    camaMap.get(obs.id_cama)!.push(obs)
  })

  // Create segments
  const segments: CamaTimelineSegment[] = Array.from(camaMap.entries()).map(([id_cama, obs], index) => {
    const sortedObs = obs.sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime())
    const firstObs = sortedObs[0]
    const lastObs = sortedObs[sortedObs.length - 1]

    // Extract cama details
    const camaData = firstObs.cama
    const bloqueData = camaData.grupo_cama?.bloque
    const finca = bloqueData?.id_finca != null ? String(bloqueData.id_finca) : ''
    const bloque = bloqueData?.nombre ?? ''
    const cama = camaData.nombre ?? ''

    // Extract GPS data
    const firstGpsData = firstObs.id_punto_gps
    const lastGpsData = lastObs.id_punto_gps

    const firstGps = firstGpsData ? {
      latitud: firstGpsData.latitud,
      longitud: firstGpsData.longitud,
      precision: firstGpsData.precision,
      altitud: firstGpsData.altitud,
      usuario_id: null,
      creado_en: firstGpsData.creado_en
    } : null

    const lastGps = lastGpsData ? {
      latitud: lastGpsData.latitud,
      longitud: lastGpsData.longitud,
      precision: lastGpsData.precision,
      altitud: lastGpsData.altitud,
      usuario_id: null,
      creado_en: lastGpsData.creado_en
    } : null

    return {
      id_cama,
      finca,
      bloque,
      cama: String(cama),
      first_observation: firstObs.creado_en,
      last_observation: lastObs.creado_en,
      observation_count: obs.length,
      color: generateColor(index),
      first_gps: firstGps,
      last_gps: lastGps
    }
  })

  return segments.sort((a, b) =>
    new Date(a.first_observation).getTime() - new Date(b.first_observation).getTime()
  )
}
