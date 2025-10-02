import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Observation } from '@/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useVosk } from '@/hooks/useVosk'
import TileButton from '@/components/TileButton'
import { interpretVoiceText } from '@/lib/commandEngine'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {

    const [finca, setFinca] = useState('')
    const [bloque, setBloque] = useState('')
    const [cama, setCama] = useState('')
    const [observaciones, setObservaciones] = useState<Observation[]>([])
    const [command, setCommand] = useState('')
    const [pendingEstado, setPendingEstado] = useState<{ estado: string, cantidad: number } | null>(null)

    // Auto-apply pending estado when context completes
    useEffect(() => {
        if (pendingEstado && finca && bloque && cama) {
            setObservaciones(prev => [...prev, {
                fecha: new Date().toISOString(),
                finca, bloque, cama,
                estado: pendingEstado.estado,
                cantidad: pendingEstado.cantidad,
            }])
            setPendingEstado(null)
            setCommand('')
        }
    }, [pendingEstado, finca, bloque, cama])

    const onVoiceText = useCallback((text: string, isFinal: boolean) => {
        if (!isFinal) return
        const { buffer, event } = interpretVoiceText(command, text)
        setCommand(buffer)

        if (!event) return

        if (event.type === 'context') {
            if (event.key === 'finca') {
                setFinca(String(event.value))
                setBloque('')
                setCama('')
            } else if (event.key === 'bloque') {
                setBloque(String(event.value))
                setCama('')
            } else if (event.key === 'cama') {
                setCama(String(event.value).padStart(2, '0'))
            }
            setCommand('')
            return
        }

        if (event.type === 'estado') {
            if (finca && bloque && cama) {
                setObservaciones(prev => [...prev, {
                    fecha: new Date().toISOString(),
                    finca, bloque, cama,
                    estado: event.estado,
                    cantidad: Number(event.cantidad)
                }])
            } else {
                setPendingEstado({ estado: event.estado, cantidad: Number(event.cantidad) })
            }
            setCommand('')
        }
    }, [command, finca, bloque, cama])

    const { isListening, start, stop, partialTranscript, transcript } = useVosk({ onResult: onVoiceText })

    // Today's sums for selected location
    const sums = observaciones.reduce((acc, o) => {
        if (o.finca === finca && o.bloque === bloque && o.cama === cama &&
            new Date(o.fecha).toDateString() === new Date().toDateString()) {
            if (o.estado in acc) acc[o.estado as keyof typeof acc] += o.cantidad
        }
        return acc
    }, { arroz: 0, arveja: 0, garbanzo: 0, color: 0, abierto: 0 })

    return (
        <div className='flex flex-col gap-1 p-1 h-full'>
            <Button
                className='w-full h-24 text-left text-2xl bg-blue-500 text-white border-none px-3'
                onClick={isListening ? stop : start}
            >
                <div className='w-full'>
                    <div className='truncate'>
                        {isListening ? (partialTranscript || 'Hable') : (transcript || 'Toca para hablar…')}
                    </div>
                </div>
            </Button>
            <div className='grid grid-cols-3 gap-1'>
                <TileButton label='FINCA' value={finca || '-'} square />
                <TileButton label='BLOQUE' value={bloque || '-'} square labelClassName='relative top-1' />
                <TileButton label='CAMA' value={cama || '-'} square />
            </div>
            <div className='grid grid-cols-2 gap-1'>
                <TileButton label='ARROZ' value={sums.arroz} />
                <TileButton label='ARVEJA' value={sums.arveja} />
                <TileButton label='GARBANZO' value={sums.garbanzo} />
                <TileButton label='COLOR' value={sums.color} />
                <TileButton label='ABIERTO' value={sums.abierto} />
            </div>
            <div className='overflow-hidden bg-zinc-900 flex flex-1 flex-col h-full p-1 rounded-lg h-full'>
                <Table>
                    <TableHeader>
                        <TableRow className='capitalize'>
                            <TableHead className='text-white'>fecha</TableHead>
                            <TableHead className='text-white'>finca</TableHead>
                            <TableHead className='text-white'>bloque</TableHead>
                            <TableHead className='text-white'>cama</TableHead>
                            <TableHead className='text-white'>estado</TableHead>
                            <TableHead className='text-white'>#</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {observaciones.map((o, i) => (
                            <TableRow key={`${o.fecha}-${i}`} className='capitalize'>
                                <TableCell>{new Date(o.fecha).toLocaleString()}</TableCell>
                                <TableCell>{o.finca}</TableCell>
                                <TableCell>{o.bloque}</TableCell>
                                <TableCell>{o.cama}</TableCell>
                                <TableCell>{o.estado}</TableCell>
                                <TableCell>{o.cantidad}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div >
    )
}