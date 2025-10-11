import { supabase } from '../lib/supabase'
import type { Usuario, CreateUsuarioInput } from '../types'

export async function createUsuario(input: CreateUsuarioInput): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuario')
    .insert({
      nombres: input.nombres,
      apellidos: input.apellidos || null,
      cedula: input.cedula || null,
      rol: input.rol,
      clave_pin: input.clave_pin
    })
    .select('id_usuario, nombres, apellidos, cedula, rol, clave_pin, creado_en')
    .single()

  if (error) throw error
  if (!data) throw new Error('No se recibió respuesta del servidor')

  return data
}

export async function getAllUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nombres, apellidos, cedula, rol, clave_pin, creado_en')
    .in('rol', ['conteos', 'control_de_calidad'])
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data || []
}
