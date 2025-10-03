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
