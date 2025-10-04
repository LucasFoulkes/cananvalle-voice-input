import { supabase } from '../lib/supabase'

export type CamaTimelineSegment = {
  id_cama: number
  finca: string
  bloque: string
  cama: string
  first_observation: string
  last_observation: string
  observation_count: number
  color: string
}

export type UserTimeline = {
  id_usuario: number
  nombres: string
  apellidos: string | null
  segments: CamaTimelineSegment[]
}

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

export async function getUserTimelines(date: string = new Date().toISOString().split('T')[0]): Promise<UserTimeline[]> {
  // Get users with rol conteo
  const { data: users, error: usersError } = await supabase
    .from('usuario')
    .select('id_usuario, nombres, apellidos')
    .eq('rol', 'conteos')

  if (usersError) throw usersError
  if (!users || users.length === 0) return []

  const startOfDay = `${date}T00:00:00.000`
  const endOfDay = `${date}T23:59:59.999`

  // Get observations for the day grouped by user and cama
  const { data: observations, error: obsError } = await supabase
    .from('observacion')
    .select(`
      id_usuario,
      id_cama,
      creado_en,
      cama!inner(
        id_cama,
        nombre,
        grupo_cama!inner(
          bloque!inner(
            nombre,
            finca!inner(
              id_finca
            )
          )
        )
      )
    `)
    .in('id_usuario', users.map(u => u.id_usuario))
    .gte('creado_en', startOfDay)
    .lte('creado_en', endOfDay)
    .is('eliminado_en', null)
    .order('creado_en', { ascending: true })

  if (obsError) throw obsError

  // Process observations into timeline segments
  const userTimelines: UserTimeline[] = users.map(user => {
    const userObservations = observations?.filter(o => o.id_usuario === user.id_usuario) || []

    // Group by cama
    const camaMap = new Map<number, any[]>()
    userObservations.forEach(obs => {
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
      const finca = camaData.grupo_cama.bloque.finca.id_finca
      const bloque = camaData.grupo_cama.bloque.nombre
      const cama = camaData.nombre

      return {
        id_cama,
        finca: String(finca),
        bloque: String(bloque),
        cama: String(cama),
        first_observation: firstObs.creado_en,
        last_observation: lastObs.creado_en,
        observation_count: obs.length,
        color: generateColor(index)
      }
    })

    return {
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      segments: segments.sort((a, b) =>
        new Date(a.first_observation).getTime() - new Date(b.first_observation).getTime()
      )
    }
  })

  // Filter out users with no observations
  return userTimelines.filter(ut => ut.segments.length > 0)
}
