import lookup from '@/data/variedades.json'
import type { VariedadOption } from '@/types'

export type VariedadesLookup = typeof lookup

export function getVariedades(fincaId: string | number | null | undefined, bloqueNombre: string | number | null | undefined): VariedadOption[] {
    if (fincaId == null || bloqueNombre == null) return []

    const fincaKey = String(fincaId)
    const bloqueKey = String(bloqueNombre)

    const fincaData = lookup[fincaKey as keyof VariedadesLookup]
    if (!fincaData) return []

    const bloqueData = fincaData[bloqueKey as keyof (typeof fincaData)]
    if (!Array.isArray(bloqueData)) return []

    return bloqueData as VariedadOption[]
}

export function findVariedad(fincaId: string | number | null | undefined, bloqueNombre: string | number | null | undefined, variedadId: number | string | null | undefined): VariedadOption | null {
    if (variedadId == null) return null
    const idNumber = typeof variedadId === 'string' ? parseInt(variedadId, 10) : variedadId
    if (Number.isNaN(idNumber)) return null

    const variedades = getVariedades(fincaId, bloqueNombre)
    return variedades.find(option => option.id === idNumber) ?? null
}

export function findVariedadByNombre(fincaId: string | number | null | undefined, bloqueNombre: string | number | null | undefined, variedadNombre: string | null | undefined): VariedadOption | null {
    if (!variedadNombre) return null
    const normalized = variedadNombre.trim().toLowerCase()
    if (!normalized) return null

    const variedades = getVariedades(fincaId, bloqueNombre)
    return variedades.find(option => option.nombre.trim().toLowerCase() === normalized) ?? null
}
