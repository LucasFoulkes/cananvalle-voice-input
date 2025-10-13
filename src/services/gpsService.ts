import { supabase } from '@/lib/supabase'
import type { GpsPoint } from '@/types'

export async function getGpsPointsForDate(date: string): Promise<GpsPoint[]> {
  const startOfDay = `${date}T00:00:00.000`
  const endOfDay = `${date}T23:59:59.999`

  const { data, error } = await supabase
    .from('punto_gps')
    .select('id, latitud, longitud, precision, altitud, usuario_id, creado_en')
    .gte('creado_en', startOfDay)
    .lte('creado_en', endOfDay)
    .order('creado_en', { ascending: true })

  if (error) {
    console.error('Error fetching GPS points:', error)
    return []
  }

  return data || []
}
