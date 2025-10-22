import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import { formatTimeInRecordedTimezone } from '@/lib/gpsTimezone'
import type { UserQualityData } from '@/hooks/useQualityControlData'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface UserQualityCardProps {
    data: UserQualityData
}

export function UserQualityCard({ data }: UserQualityCardProps) {
    const { usuario, observations, camaData, dayStart, totalMs, totalTallos } = data

    return (
        <div className='bg-zinc-800 p-3 rounded-lg'>
            <div className='flex justify-between items-center mb-3'>
                <div>
                    <span className='text-white font-semibold'>
                        {usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Usuario desconocido'}
                    </span>
                    <span className='text-zinc-400 text-sm ml-2'>
                        ({observations.length} obs)
                    </span>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className='h-8 w-8 p-0'>
                            <Eye className='h-4 w-4 text-blue-400' />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-[calc(100vw-1rem)] w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-auto bg-zinc-900 text-white border-zinc-700'>
                        <DialogHeader>
                            <DialogTitle className='text-center'>
                                Detalle - {usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Usuario desconocido'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className='space-y-4'>
                            {(() => {
                                // Group by finca, then bloque
                                const byFincaBloque: any = {}

                                observations.forEach((obs: any) => {
                                    const finca = obs.cama?.grupo_cama?.bloque?.id_finca || 'N/A'
                                    const bloque = obs.cama?.grupo_cama?.bloque?.nombre || 'N/A'
                                    const cama = obs.cama?.nombre || 'N/A'

                                    if (!byFincaBloque[finca]) {
                                        byFincaBloque[finca] = {}
                                    }
                                    if (!byFincaBloque[finca][bloque]) {
                                        byFincaBloque[finca][bloque] = {}
                                    }
                                    if (!byFincaBloque[finca][bloque][cama]) {
                                        byFincaBloque[finca][bloque][cama] = []
                                    }
                                    byFincaBloque[finca][bloque][cama].push(obs)
                                })

                                return Object.entries(byFincaBloque).map(([finca, bloques]: [string, any]) => (
                                    <div key={finca} className='space-y-2'>
                                        <h3 className='text-lg font-semibold text-white'>Finca {finca}</h3>
                                        {Object.entries(bloques).map(([bloque, camas]: [string, any]) => (
                                            <div key={bloque} className='space-y-1'>
                                                <h4 className='text-md font-semibold text-zinc-300'>Bloque {bloque}</h4>
                                                {Object.entries(camas).map(([cama, obs]: [string, any]) => {
                                                    const sorted = obs.sort((a: any, b: any) =>
                                                        new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
                                                    )
                                                    const startTime = new Date(sorted[0].creado_en).getTime()
                                                    const endTime = new Date(sorted[sorted.length - 1].creado_en).getTime()
                                                    const durationMin = Math.round((endTime - startTime) / 60000)

                                                    // Calculate total tallos for this cama
                                                    const camaTallos = sorted.reduce((sum: number, o: any) =>
                                                        sum + (parseInt(o.cantidad) || 0), 0
                                                    )
                                                    const tallosPorMin = durationMin > 0 ? (camaTallos / durationMin).toFixed(1) : '0'

                                                    return (
                                                        <Dialog key={cama}>
                                                            <DialogTrigger asChild>
                                                                <div className='flex flex-wrap gap-x-4 gap-y-1 text-sm bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 cursor-pointer transition-colors border border-zinc-700'>
                                                                    <span className='text-zinc-400'>Cama {cama}:</span>
                                                                    <span className='text-white'>{durationMin}m</span>
                                                                    <span className='text-zinc-400'>|</span>
                                                                    <span className='text-white'>{camaTallos} tallos</span>
                                                                    <span className='text-zinc-400'>|</span>
                                                                    <span className='text-white'>{tallosPorMin} t/min</span>
                                                                </div>
                                                            </DialogTrigger>
                                                            <DialogContent className='max-w-[calc(100vw-1rem)] w-full sm:max-w-xl max-h-[calc(100vh-2rem)] overflow-auto bg-zinc-900 text-white border-zinc-700'>
                                                                <DialogHeader>
                                                                    <DialogTitle className='text-center'>
                                                                        Observaciones - Finca {finca} / Bloque {bloque} / Cama {cama}
                                                                    </DialogTitle>
                                                                </DialogHeader>
                                                                <div className='space-y-2'>
                                                                    {sorted.map((observation: any) => (
                                                                        <div key={observation.id_observacion} className='bg-zinc-900 p-3 rounded text-sm flex gap-4 items-center'>
                                                                            <span className='text-emerald-400 font-semibold'>
                                                                                {formatTimeInRecordedTimezone(observation.creado_en, observation.punto_gps)}
                                                                            </span>
                                                                            <span className='text-white'>
                                                                                {observation.tipo_observacion}: {observation.cantidad}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                ))
                            })()}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Single horizontal timeline bar */}
            <div className='bg-zinc-900 h-6 rounded relative'>
                {camaData.map((cama, idx) => {
                    const startPercent = ((cama.start - dayStart) / totalMs) * 100
                    const widthPercent = ((cama.end - cama.start) / totalMs) * 100
                    const durationMin = Math.round((cama.end - cama.start) / 60000)
                    const isFirst = idx === 0
                    const isLast = idx === camaData.length - 1

                    return (
                        <div
                            key={cama.label}
                            className='absolute h-full'
                            style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                                borderTopLeftRadius: isFirst ? '0.375rem' : '0',
                                borderBottomLeftRadius: isFirst ? '0.375rem' : '0',
                                borderTopRightRadius: isLast ? '0.375rem' : '0',
                                borderBottomRightRadius: isLast ? '0.375rem' : '0',
                            }}
                            title={`${cama.label} - ${durationMin}m`}
                        />
                    )
                })}
            </div>

            {/* Metrics */}
            <div className='flex flex-wrap gap-x-6 gap-y-2 mt-3'>
                <div className='text-sm'>
                    <span className='text-zinc-400'>Tallos: </span>
                    <span className='text-white font-semibold'>
                        {totalTallos}
                    </span>
                </div>
                <div className='text-sm'>
                    <span className='text-zinc-400'>Tallos/min: </span>
                    <span className='text-white font-semibold'>
                        {(() => {
                            // Calculate tallos per minute for each cama
                            const tallosPorMinArray = camaData.map(cama => {
                                const durationMin = (cama.end - cama.start) / 60000
                                return durationMin > 0 ? cama.totalTallos / durationMin : 0
                            }).sort((a, b) => a - b)

                            // Calculate median
                            const mid = Math.floor(tallosPorMinArray.length / 2)
                            const median = tallosPorMinArray.length % 2 === 0
                                ? (tallosPorMinArray[mid - 1] + tallosPorMinArray[mid]) / 2
                                : tallosPorMinArray[mid]

                            return median.toFixed(1)
                        })()}
                    </span>
                </div>
                <div className='text-sm'>
                    <span className='text-zinc-400'>Tiempo/cama: </span>
                    <span className='text-white font-semibold'>
                        {(() => {
                            // Calculate duration for each cama in minutes
                            const durationsMin = camaData.map(cama =>
                                (cama.end - cama.start) / 60000
                            ).sort((a, b) => a - b)

                            // Calculate median
                            const mid = Math.floor(durationsMin.length / 2)
                            const medianMin = durationsMin.length % 2 === 0
                                ? (durationsMin[mid - 1] + durationsMin[mid]) / 2
                                : durationsMin[mid]

                            return `${Math.round(medianMin)}m`
                        })()}
                    </span>
                </div>
            </div>
        </div>
    )
}
