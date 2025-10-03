import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Observation } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/observaciones')({
  component: RouteComponent,
})

type SummaryRow = {
  finca: string
  bloque: string
  cama: string
  fecha: string
  arroz: number
  arveja: number
  garbanzo: number
  color: number
  abierto: number
  entries: Observation[]
}

function RouteComponent() {
  const observaciones: Observation[] = JSON.parse(localStorage.getItem("observaciones") || "[]")
  const [selectedSummary, setSelectedSummary] = useState<SummaryRow | null>(null)

  // Group observations by finca/bloque/cama/day
  const summaries: SummaryRow[] = Object.values(
    observaciones.reduce((acc, obs) => {
      const d = new Date(obs.fecha)
      const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
      const key = `${obs.finca}-${obs.bloque}-${obs.cama}-${date}`

      if (!acc[key]) {
        acc[key] = {
          finca: obs.finca,
          bloque: obs.bloque,
          cama: obs.cama,
          fecha: date,
          arroz: 0,
          arveja: 0,
          garbanzo: 0,
          color: 0,
          abierto: 0,
          entries: []
        }
      }

      acc[key][obs.estado as keyof Pick<SummaryRow, 'arroz' | 'arveja' | 'garbanzo' | 'color' | 'abierto'>] += obs.cantidad
      acc[key].entries.push(obs)

      return acc
    }, {} as Record<string, SummaryRow>)
  )

  // Group summaries by date
  const groupedByDate = summaries.reduce((acc, summary) => {
    if (!acc[summary.fecha]) {
      acc[summary.fecha] = []
    }
    acc[summary.fecha].push(summary)
    return acc
  }, {} as Record<string, SummaryRow[]>)

  return (
    <>
      <div className='overflow-y-auto bg-zinc-900 flex flex-1 flex-col h-full p-2 rounded-lg gap-4'>
        {Object.entries(groupedByDate).map(([fecha, rows]) => (
          <div key={fecha} className='flex flex-col gap-1'>
            <h2 className='text-white text-xl text-center'>{fecha}</h2>
            <Card className='overflow-hidden max-h-full bg-zinc-800 p-1 text-white border-none'>
              <Table >
                <TableHeader className='text-xs'>
                  <TableRow>
                    <TableHead className='text-white'>F</TableHead>
                    <TableHead className='text-white'>B</TableHead>
                    <TableHead className='text-white'>C</TableHead>
                    <TableHead className='text-white text-right'>Arr</TableHead>
                    <TableHead className='text-white text-right'>Arv</TableHead>
                    <TableHead className='text-white text-right'>Gar</TableHead>
                    <TableHead className='text-white text-right'>Col</TableHead>
                    <TableHead className='text-white text-right'>Abi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className='cursor-pointer hover:bg-zinc-800'
                      onClick={() => setSelectedSummary(row)}
                    >
                      <TableCell>{row.finca}</TableCell>
                      <TableCell>{row.bloque}</TableCell>
                      <TableCell>{row.cama}</TableCell>
                      <TableCell className='text-right'>{row.arroz || '-'}</TableCell>
                      <TableCell className='text-right'>{row.arveja || '-'}</TableCell>
                      <TableCell className='text-right'>{row.garbanzo || '-'}</TableCell>
                      <TableCell className='text-right'>{row.color || '-'}</TableCell>
                      <TableCell className='text-right'>{row.abierto || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedSummary} onOpenChange={(open) => !open && setSelectedSummary(null)}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle>
              Detalles: Finca {selectedSummary?.finca} / Bloque {selectedSummary?.bloque} / Cama {selectedSummary?.cama} - {selectedSummary?.fecha}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-auto max-h-96'>
            <Table>
              <TableHeader className='text-xs'>
                <TableRow>
                  <TableHead className='text-white'>Hora</TableHead>
                  <TableHead className='text-white'>Estado</TableHead>
                  <TableHead className='text-white text-right'>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-xs'>
                {selectedSummary?.entries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(entry.fecha).toLocaleTimeString()}</TableCell>
                    <TableCell className='capitalize'>{entry.estado}</TableCell>
                    <TableCell className='text-right'>{entry.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
