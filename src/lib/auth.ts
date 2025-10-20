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

export function isSudo(): boolean {
  return hasRole(['sudo', 'control_de_calidad'])
}

export function canAccessEstados(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_estados_fenologicos', 'operario'])
}

export function canAccessSensores(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_sensores', 'operario'])
}

export function canAccessPinches(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_pinches', 'operario'])
}

export function canViewObservaciones(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_estados_fenologicos', 'supervisor_sensores'])
}

export function canViewPinches(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_pinches'])
}

export function canViewQualityControl(): boolean {
  return hasRole(['sudo', 'control_de_calidad', 'jefe_finca', 'supervisor_estados_fenologicos', 'supervisor_sensores', 'supervisor_pinches'])
}

export function isOperarioOnly(): boolean {
  return hasRole(['operario'])
}
