import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Form } from "@/types"
import { SquareTile } from '@/components/square-tile'
import { CommandInput } from "@/components/command-input"

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {
    const [form, setForm] = useState<Form>({ finca: '', bloque: '', cama: '', estado: '', cantidad: '' })
    // dialog state managed by SquareTile
    const [rev, setRev] = useState(0)
    // command input moved into component

    const fields = [
        { key: 'finca', placeholder: 'Finca' },
        { key: 'bloque', placeholder: 'Bloque' },
        { key: 'cama', placeholder: 'Cama' },
    ] as const

    const stages = [
        { key: 'arroz', label: 'Arroz' },
        { key: 'arveja', label: 'Arveja' },
        { key: 'garbanzo', label: 'Garbanzo' },
        { key: 'color', label: 'Color' },
        { key: 'abiertos', label: 'Abiertos' },
    ] as const

    // Totals per stage from persisted observations
    const stageTotals = useMemo(() => {
        // If no selection at all, show zeros by returning an empty map
        if (!form.finca && !form.bloque && !form.cama) {
            return new Map<string, number>()
        }
        try {
            type Row = { estado: string; cantidad: number; finca?: string; bloque?: string; cama?: string }
            const arr: Row[] = JSON.parse(localStorage.getItem('observaciones') || '[]')
            const map = new Map<string, number>()
            for (const { estado, cantidad, finca, bloque, cama } of arr) {
                // Filter by current selection; only compare non-empty form fields
                if (form.finca && finca !== form.finca) continue
                if (form.bloque && bloque !== form.bloque) continue
                if (form.cama && cama !== form.cama) continue
                map.set(estado, (map.get(estado) ?? 0) + Number(cantidad || 0))
            }
            return map
        } catch {
            return new Map<string, number>()
        }
    }, [rev, form.finca, form.bloque, form.cama])

    return (
        <div className='flex flex-col w-full gap-1 pt-1'>
            <CommandInput
                className='h-32 bg-blue-600 roundedlg border-none'
                form={form}
                onFormChange={setForm}
                onSaved={() => setRev((x) => x + 1)}
            />
            <div className='flex flex-row gap-1'>
                {fields.map((f) => (
                    <SquareTile
                        key={f.key}
                        label={f.placeholder}
                        valueText={(form as any)[f.key] || '-'}
                        inputType='text'
                        onSave={(val) => setForm((prev) => {
                            // Cascading resets when changing location via tiles
                            if (f.key === 'finca') {
                                return { ...prev, finca: val, bloque: '', cama: '' }
                            }
                            if (f.key === 'bloque') {
                                return { ...prev, bloque: val, cama: '' }
                            }
                            return { ...prev, [f.key]: val } as Form
                        })}
                        className='h-full aspect-square flex-1 bg-lime-500 text-black'
                    />
                ))}
            </div>
            <div className='grid grid-cols-3 gap-1'>
                {stages.map((s) => (
                    <SquareTile
                        key={s.key}
                        label={s.label}
                        valueText={<span className='text-xl font-semibold'>{stageTotals.get(s.key) ?? 0}</span>}
                        inputType='number'
                        onSave={(val) => {
                            const n = Number(val)
                            const next = [
                                ...JSON.parse(localStorage.getItem('observaciones') || '[]'),
                                {
                                    fecha: new Date().toLocaleString(),
                                    finca: form.finca,
                                    bloque: form.bloque,
                                    cama: form.cama,
                                    estado: s.key,
                                    cantidad: n,
                                },
                            ]
                            localStorage.setItem('observaciones', JSON.stringify(next))
                            setRev((x) => x + 1)
                        }}
                        className='aspect-square h-full'
                    />
                ))}
            </div>
        </div>
    )
}
