import { supabase } from '../lib/supabase'
import type { Usuario } from '../types'

const USUARIOS_KEY = 'usuarios'
const LAST_SYNC_KEY = 'usuarios_last_sync'
const SYNC_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

export async function syncUsuarios(): Promise<Usuario[]> {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombres, clave_pin')

    if (error) throw error

    if (data) {
      localStorage.setItem(USUARIOS_KEY, JSON.stringify(data))
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
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
  const lastSync = localStorage.getItem(LAST_SYNC_KEY)
  const shouldSync = !lastSync || (Date.now() - parseInt(lastSync, 10)) > SYNC_INTERVAL

  if (shouldSync) {
    return await syncUsuarios()
  }

  return getLocalUsuarios()
}

export function validatePin(pin: string): Usuario | null {
  const usuarios = getLocalUsuarios()
  return usuarios.find(u => u.clave_pin === pin) || null
}
