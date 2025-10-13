import { supabase } from '../lib/supabase'
import type { Usuario } from '../types'

const USUARIOS_KEY = 'usuarios'

export async function syncUsuarios(): Promise<Usuario[]> {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombres, apellidos, cedula, rol, pin, nombre_usuario, creado_en')

    if (error) throw error

    if (data) {
      localStorage.setItem(USUARIOS_KEY, JSON.stringify(data))
      return data
    }

    return getLocalUsuarios()
  } catch (error) {
    console.warn('Failed to sync usuarios from Supabase:', error)
    return getLocalUsuarios()
  }
}

export function getLocalUsuarios(): Usuario[] {
  try {
    const raw = localStorage.getItem(USUARIOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function getUsuarios(): Promise<Usuario[]> {
  // Always try to sync when online, fallback to local if offline
  return await syncUsuarios()
}

export function validatePin(pin: string): Usuario | null {
  const usuarios = getLocalUsuarios()
  return usuarios.find(u => u.pin === pin) || null
}
