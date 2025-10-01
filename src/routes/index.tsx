import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Form } from "@/types"
import { SquareTile } from '@/components/square-tile'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {
    const [form, setForm] = useState<Form>({ finca: '', bloque: '', cama: '', estado: '', cantidad: '' })
    // dialog state managed by SquareTile
    const [rev, setRev] = useState(0)

    const fields = [
        // { key: 'finca', placeholder: 'Finca' },
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
        try {
            const arr: Array<{ estado: string; cantidad: number }> = JSON.parse(localStorage.getItem('observaciones') || '[]')
            const map = new Map<string, number>()
            for (const { estado, cantidad } of arr) {
                map.set(estado, (map.get(estado) ?? 0) + Number(cantidad || 0))
            }
            return map
        } catch {
            return new Map<string, number>()
        }
    }, [rev])

    return (
        <div className='flex flex-col w-full gap-1 pt-1'>
            <div className='h-32 bg-blue-600 rounded-lg'> </div>
            <div className='flex flex-row items-stretch gap-1'>
                <div className='flex-1'>
                    <SquareTile
                        label='Finca'
                        valueText={form.finca || '-'}
                        inputType='text'
                        onSave={(val) => setForm((prev) => ({ ...prev, finca: val }))}
                        className='w-full h-full aspect-square bg-lime-500 text-black'
                    />
                </div>
                {fields.map((f) => (
                    <div key={f.key} className='w-1/4'>
                        <SquareTile
                            label={f.placeholder}
                            valueText={(form as any)[f.key] || '-'}
                            inputType='text'
                            onSave={(val) => setForm((prev) => ({ ...prev, [f.key]: val }))}
                            className='bg-lime-500 text-black w-full h-full'
                        />
                    </div>
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
