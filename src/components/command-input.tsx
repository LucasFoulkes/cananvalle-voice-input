import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Form } from '@/types'
import { parseCommand } from '@/lib/command'

type Props = {
    form: Form
    onFormChange: (next: Form) => void
    onSaved?: (savedCount: number) => void
    className?: string
}

export function CommandInput({ form, onFormChange, onSaved, className }: Props) {
    const [value, setValue] = useState('')

    return (
        <Input
            className={className}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={'Ej: finca 1 bloque 2 cama 3 garbanzo 5'}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    const { nextForm, adds } = parseCommand(value, form)

                    if (adds.length) {
                        const existing = JSON.parse(localStorage.getItem('observaciones') || '[]')
                        const appended = [
                            ...existing,
                            ...adds.map((a) => ({
                                fecha: new Date().toLocaleString(),
                                finca: a.form.finca,
                                bloque: a.form.bloque,
                                cama: a.form.cama,
                                estado: a.estado,
                                cantidad: a.cantidad,
                            })),
                        ]
                        localStorage.setItem('observaciones', JSON.stringify(appended))
                    }

                    onFormChange(nextForm)
                    setValue('')
                    // Always notify parent to allow totals recompute; pass count for potential UX
                    onSaved?.(adds.length)
                }
            }}
        />
    )
}
