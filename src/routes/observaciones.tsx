import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useVoiceDispatch, useVoiceState } from '@/state/VoiceContext'
import { useMemo, useState } from 'react'
import { vocabulary } from '@/utils/vocabulary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { deleteObservationsByAt, getAllObservations } from '@/db/observations'

export const Route = createFileRoute('/observaciones')({
    component: Observaciones,
})

function Observaciones() {
    const { observations } = useVoiceState()
    const dispatch = useVoiceDispatch()
    const stages = vocabulary.stages
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

    const groups = useMemo(() => {
        const dateKey = (ms: number) => {
            const d = new Date(ms)
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const da = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${da}`
        }
        type Row = {
            key: string
            finca: string
            bloque: string
            cama: string
            day: string
            totals: Record<string, number>
            items: typeof observations
        }
        const map = new Map<string, Row>()
        for (const o of observations) {
            const day = dateKey(o.at)
            const key = `${o.finca}|${o.bloque}|${o.cama}|${day}`
            let row = map.get(key)
            if (!row) {
                const newRow: Row = {
                    key,
                    finca: o.finca,
                    bloque: o.bloque,
                    cama: o.cama,
                    day,
                    totals: Object.fromEntries(stages.map((s) => [s, 0])) as Record<string, number>,
                    items: [],
                }
                map.set(key, newRow)
                row = newRow
            }
            row.items.push(o)
            // accumulate stage total
            if (stages.includes(o.stage as any)) {
                row.totals[o.stage] = (row.totals[o.stage] ?? 0) + o.value
            }
        }
        // Sort by finca, bloque, cama, then day desc (most recent first)
        return Array.from(map.values()).sort((a, b) =>
            a.finca.localeCompare(b.finca) || a.bloque.localeCompare(b.bloque) || a.cama.localeCompare(b.cama) || b.day.localeCompare(a.day)
        )
    }, [observations, stages])

    const toggle = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const ab2 = (s: string) => String(s || '').slice(0, 2).toUpperCase()

    return (
        <div className='w-full h-full flex flex-col p-2 space-y-2 bg-black'>
            <div className='uppercase rounded-xl overflow-hidden bg-green-400 text-black px-3 py-2 text-center font-semibold'>
                Observaciones (Resumen por ubicación)
            </div>
            <div className='bg-white/5 rounded-xl p-2 overflow-hidden'>
                <Table className='text-white text-xs'>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='text-gray-100 text-xs'>Fe</TableHead>
                            <TableHead className='text-gray-100 text-xs'>Fi</TableHead>
                            <TableHead className='text-gray-100 text-xs'>Bl</TableHead>
                            <TableHead className='text-gray-100 text-xs'>Ca</TableHead>
                            {stages.map((s) => {
                                const abbr2 = s.slice(0, 2).toUpperCase()
                                return (
                                    <TableHead key={s} className='text-gray-100 text-xs'>{abbr2}</TableHead>
                                )
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4 + stages.length} className='text-center text-gray-300'>
                                    Sin observaciones aún
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((g) => (
                                <React.Fragment key={g.key}>
                                    <TableRow className='cursor-pointer' onClick={() => toggle(g.key)}>
                                        <TableCell className='text-gray-200 text-xs'>{g.day}</TableCell>
                                        <TableCell className='text-gray-200 text-xs'>{ab2(g.finca)}</TableCell>
                                        <TableCell className='text-gray-200 text-xs'>{ab2(g.bloque)}</TableCell>
                                        <TableCell className='text-gray-200 text-xs'>{ab2(g.cama)}</TableCell>
                                        {stages.map((s) => (
                                            <TableCell key={`${g.key}-${s}`} className='text-gray-200 text-xs'>{g.totals[s] ?? 0}</TableCell>
                                        ))}
                                    </TableRow>
                                    {expanded.has(g.key) && (
                                        <TableRow>
                                            <TableCell colSpan={4 + stages.length} className='bg-white/5 rounded-md'>
                                                <div className='text-gray-200 text-xs'>
                                                    <div className='font-semibold mb-2'>Detalles</div>
                                                    <div className='overflow-x-auto'>
                                                        <table className='w-full text-left text-xs'>
                                                            <thead>
                                                                <tr className='text-gray-300'>
                                                                    <th className='px-2 py-1'>Fecha/Hora</th>
                                                                    <th className='px-2 py-1'>Etapa</th>
                                                                    <th className='px-2 py-1'>Cantidad</th>
                                                                    <th className='px-2 py-1 text-right'>Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {g.items
                                                                    .slice()
                                                                    .sort((a, b) => b.at - a.at)
                                                                    .map((o, idx) => (
                                                                        <tr key={`${o.at}-${o.stage}-${o.value}-${idx}`}>
                                                                            <td className='px-2 py-1'>{new Date(o.at).toLocaleString()}</td>
                                                                            <td className='px-2 py-1 capitalize'>{String(o.stage).slice(0, 2).toUpperCase()}</td>
                                                                            <td className='px-2 py-1'>{o.value}</td>
                                                                            <td className='px-2 py-1 text-right'>
                                                                                <RowDeleteButton at={o.at} onDeleted={async () => {
                                                                                    const rows = await getAllObservations()
                                                                                    dispatch({ type: 'hydrateObservations', items: rows.map(r => ({ at: r.at, finca: r.finca, bloque: r.bloque, cama: r.cama, stage: r.stage, value: r.value })) })
                                                                                }} />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function RowDeleteButton({ at, onDeleted }: { at: number; onDeleted?: () => void | Promise<void> }) {
    const [open, setOpen] = useState(false)
    const handleConfirm = async () => {
        await deleteObservationsByAt(at)
        setOpen(false)
        await onDeleted?.()
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant='destructive' size='sm'>Eliminar</Button>
            </DialogTrigger>
            <DialogContent className='bg-black text-white border border-white/10'>
                <DialogHeader>
                    <DialogTitle>Confirmar eliminación</DialogTitle>
                    <DialogDescription>¿Eliminar esta observación? Esta acción no se puede deshacer.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant='destructive' size='sm' onClick={handleConfirm}>Eliminar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

