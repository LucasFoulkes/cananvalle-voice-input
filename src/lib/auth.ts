import type { Usuario } from '../types'

const CURRENT_USER_KEY = 'current_user'

export function getCurrentUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getCurrentUserId(): number | null {
  const user = getCurrentUser()
  return user?.id_usuario || null
}

export function setCurrentUser(usuario: Usuario | null) {
  if (usuario) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function hasRole(allowedRoles: string[]): boolean {
  const user = getCurrentUser()
  if (!user) return false
  return allowedRoles.includes(user.rol)
}

export function isControlCalidad(): boolean {
  return hasRole(['control de calidad', 'sudo'])
}

export function isSudo(): boolean {
  return hasRole(['sudo'])
}
