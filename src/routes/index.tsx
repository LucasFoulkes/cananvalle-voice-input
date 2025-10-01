import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import type { Form, Observation } from "@/types"

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {
    const [form, setForm] = useState<Form>({ finca: '', bloque: '', cama: '', estado: '', cantidad: '' })
    const [observaciones, setObservaciones] = useState<Observation[]>([])

    const fields = [
        { key: 'finca', placeholder: 'Finca' },
        { key: 'bloque', placeholder: 'Bloque' },
        { key: 'cama', placeholder: 'Cama' },
        { key: 'estado', placeholder: 'Estado' },
        { key: 'cantidad', placeholder: 'Cantidad', type: 'number' as const },
    ] as const

    return (
        <div className='flex flex-col w-full gap-1 p-1'>
            <div className='flex flex-col gap-2'>
                {fields.map((f) => (
                    <Input
                        key={f.key}
                        placeholder={f.placeholder}
                        type={(f as any).type ?? 'text'}
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                ))}
            </div>

            <Button
                className="w-full"
                disabled={!(Object.values(form).every((v) => v.trim() !== '') && !Number.isNaN(Number(form.cantidad)))}
                onClick={() => {
                    if (!(Object.values(form).every((v) => v.trim() !== '') && !Number.isNaN(Number(form.cantidad)))) return
                    const cantidadNum = Number(form.cantidad)

                    setObservaciones((prev) => [
                        ...prev,
                        {
                            fecha: new Date().toLocaleString(),
                            finca: form.finca,
                            bloque: form.bloque,
                            cama: form.cama,
                            estado: form.estado,
                            cantidad: cantidadNum,
                        },
                    ])

                    // Keep location; clear only observation inputs
                    setForm((prev) => ({ ...prev, estado: '', cantidad: '' }))
                    localStorage.setItem("observaciones", JSON.stringify(observaciones));
                }}
            >
                Agregar observación
            </Button>
        </div>
    )
}
