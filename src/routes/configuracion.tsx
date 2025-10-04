import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/configuracion')({
  component: RouteComponent,
})

type Finca = {
  id_finca: number
  nombre: string
  alias: string | null
}

type Bloque = {
  id_bloque: number
  id_finca: number
  nombre: string
}

type GrupoCama = {
  id_grupo: number
  id_bloque: number
  id_variedad: number
  fecha_siembra: string
  estado: string
  patron: string
  tipo_planta: string
  total_plantas: number
  variedad?: {
    nombre: string
    color: string
  }
}

type Cama = {
  id_cama: number
  id_grupo: number
  nombre: string
  largo_metros: number
  ancho_metros: number
  plantas_totales: number
}

function RouteComponent() {
  const [fincas, setFincas] = useState<Finca[]>([])
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [grupos, setGrupos] = useState<GrupoCama[]>([])
  const [camas, setCamas] = useState<Cama[]>([])
  const [selectedFinca, setSelectedFinca] = useState<number | null>(null)
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null)
  const [fincaOpen, setFincaOpen] = useState(false)
  const [bloqueOpen, setBloqueOpen] = useState(false)
  const [selectedCamas, setSelectedCamas] = useState<Set<number>>(new Set())
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [targetGrupo, setTargetGrupo] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [lastTouchMidpoint, setLastTouchMidpoint] = useState<{ x: number, y: number } | null>(null)

  // Fetch fincas on mount
  useEffect(() => {
    const fetchFincas = async () => {
      const { data, error } = await supabase
        .from('finca')
        .select('id_finca, nombre, alias')
        .is('eliminado_en', null)
        .order('nombre')

      if (error) {
        console.error('Error fetching fincas:', error)
        return
      }

      setFincas(data || [])
    }

    fetchFincas()
  }, [])

  // Fetch bloques when finca is selected
  useEffect(() => {
    if (!selectedFinca) {
      setBloques([])
      setSelectedBloque(null)
      return
    }

    const fetchBloques = async () => {
      const { data, error } = await supabase
        .from('bloque')
        .select('id_bloque, id_finca, nombre')
        .eq('id_finca', selectedFinca)
        .is('eliminado_en', null)

      if (error) {
        console.error('Error fetching bloques:', error)
        return
      }

      // Sort numerically with proper handling of alphanumeric values
      const sorted = (data || []).sort((a, b) => {
        const aNum = parseInt(a.nombre, 10)
        const bNum = parseInt(b.nombre, 10)

        // If both are numbers, compare numerically
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }

        // If one is a number and the other isn't, number comes first
        if (!isNaN(aNum)) return -1
        if (!isNaN(bNum)) return 1

        // Otherwise, use natural string comparison
        return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
      })

      setBloques(sorted)
    }

    fetchBloques()
  }, [selectedFinca])

  // Fetch grupos when bloque is selected
  useEffect(() => {
    if (!selectedBloque) {
      setGrupos([])
      return
    }

    const fetchGrupos = async () => {
      const { data, error } = await supabase
        .from('grupo_cama')
        .select(`
          id_grupo,
          id_bloque,
          id_variedad,
          fecha_siembra,
          estado,
          patron,
          tipo_planta,
          total_plantas,
          variedad:id_variedad (
            nombre,
            color
          )
        `)
        .eq('id_bloque', selectedBloque)
        .is('eliminado_en', null)

      if (error) {
        console.error('Error fetching grupos:', error)
        return
      }

      // Transform data to match GrupoCama type (variedad comes as array but we need single object)
      const transformedData = (data || []).map(grupo => ({
        ...grupo,
        variedad: Array.isArray(grupo.variedad) ? grupo.variedad[0] : grupo.variedad
      }))

      setGrupos(transformedData)
    }

    fetchGrupos()
  }, [selectedBloque])

  // Fetch camas when bloque is selected
  useEffect(() => {
    if (!selectedBloque) {
      setCamas([])
      return
    }

    const fetchCamas = async () => {
      const { data, error } = await supabase
        .from('cama')
        .select(`
          id_cama,
          id_grupo,
          nombre,
          largo_metros,
          ancho_metros,
          plantas_totales,
          grupo_cama!inner(id_bloque)
        `)
        .eq('grupo_cama.id_bloque', selectedBloque)
        .is('eliminado_en', null)

      if (error) {
        console.error('Error fetching camas:', error)
        return
      }

      // Sort camas numerically
      const sorted = (data || []).sort((a, b) => {
        const aNum = parseInt(a.nombre, 10)
        const bNum = parseInt(b.nombre, 10)
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
        return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
      })

      setCamas(sorted)
    }

    fetchCamas()
  }, [selectedBloque])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getGroupColor = (index: number) => {
    const colors = [
      'bg-blue-700 hover:bg-blue-600',
      'bg-green-700 hover:bg-green-600',
      'bg-purple-700 hover:bg-purple-600',
      'bg-orange-700 hover:bg-orange-600',
      'bg-pink-700 hover:bg-pink-600',
      'bg-teal-700 hover:bg-teal-600',
      'bg-yellow-700 hover:bg-yellow-600',
      'bg-red-700 hover:bg-red-600',
      'bg-indigo-700 hover:bg-indigo-600',
      'bg-cyan-700 hover:bg-cyan-600',
    ]
    return colors[index % colors.length]
  }

  const getCanvasGroupColor = (index: number) => {
    const colors = [
      'rgba(59, 130, 246, 0.4)',   // blue
      'rgba(34, 197, 94, 0.4)',    // green
      'rgba(168, 85, 247, 0.4)',   // purple
      'rgba(249, 115, 22, 0.4)',   // orange
      'rgba(236, 72, 153, 0.4)',   // pink
      'rgba(20, 184, 166, 0.4)',   // teal
      'rgba(234, 179, 8, 0.4)',    // yellow
      'rgba(239, 68, 68, 0.4)',    // red
      'rgba(99, 102, 241, 0.4)',   // indigo
      'rgba(6, 182, 212, 0.4)',    // cyan
    ]
    return colors[index % colors.length]
  }

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || camas.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pixelsPerMeter = 8
    const rowHeight = 10
    const maxLength = Math.max(...camas.map(c => c.largo_metros))
    const numRows = Math.ceil(camas.length / 2)
    const numberWidth = 40 // Space for bed numbers in the middle
    const padding = 10 // Minimal padding on edges

    // Calculate canvas dimensions based on content
    const centerX = maxLength * pixelsPerMeter + numberWidth / 2 + padding
    const canvasWidth = centerX * 2
    const canvasHeight = numRows * rowHeight + padding * 2
    const startY = padding

    // Update canvas size
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const draw = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Save context and apply transform
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)

      // Draw camas
      camas.forEach((cama, i) => {
        const row = Math.floor(i / 2)
        const isOdd = i % 2 === 0
        const length = cama.largo_metros
        const grupoIndex = grupos.findIndex(g => g.id_grupo === cama.id_grupo)
        const isSelected = selectedCamas.has(cama.id_cama)

        const y = startY + row * rowHeight
        const bedWidth = length * pixelsPerMeter
        const x = isOdd ? centerX - numberWidth / 2 - bedWidth : centerX + numberWidth / 2

        // Background color by grupo
        if (grupoIndex !== -1) {
          ctx.fillStyle = getCanvasGroupColor(grupoIndex)
          ctx.fillRect(x, y - 4, bedWidth, 8)
        }

        // Bed line
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + bedWidth, y)
        ctx.stroke()

        // Dots
        ctx.fillStyle = '#999'
        for (let m = 0; m <= length; m++) {
          const size = m % 10 === 0 ? 3 : m % 5 === 0 ? 2 : 1.5
          ctx.beginPath()
          const dotX = isOdd ? x + bedWidth - (m * pixelsPerMeter) : x + m * pixelsPerMeter
          ctx.arc(dotX, y, size, 0, Math.PI * 2)
          ctx.fill()
        }

        // Cama number
        ctx.fillStyle = isSelected ? '#fff' : '#ccc'
        ctx.font = isSelected ? 'bold 11px Arial' : '11px Arial'
        ctx.textAlign = 'center'
        const numX = isOdd ? centerX - numberWidth / 4 : centerX + numberWidth / 4
        ctx.fillText(cama.nombre, numX, y + 4)
      })

      // Draw selection highlight
      if (selectedCamas.size > 0) {
        selectedCamas.forEach(camaId => {
          const camaIndex = camas.findIndex(c => c.id_cama === camaId)
          if (camaIndex === -1) return

          const cama = camas[camaIndex]
          const row = Math.floor(camaIndex / 2)
          const isOdd = camaIndex % 2 === 0
          const length = cama.largo_metros
          const y = startY + row * rowHeight
          const bedWidth = length * pixelsPerMeter
          const x = isOdd ? centerX - numberWidth / 2 - bedWidth : centerX + numberWidth / 2

          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.fillRect(x - 2, y - 6, bedWidth + 4, 12)
        })
      }

      // Restore context
      ctx.restore()
    }

    draw()
  }, [camas, selectedCamas, grupos, bloques, selectedBloque, scale, offset])

  const getCamaAtPosition = (x: number, y: number): number | null => {
    const pixelsPerMeter = 8
    const rowHeight = 10
    const maxLength = Math.max(...camas.map(c => c.largo_metros))
    const numberWidth = 40
    const padding = 10
    const centerX = maxLength * pixelsPerMeter + numberWidth / 2 + padding
    const startY = padding

    for (let i = 0; i < camas.length; i++) {
      const cama = camas[i]
      const row = Math.floor(i / 2)
      const isOdd = i % 2 === 0
      const bedY = startY + row * rowHeight
      const length = cama.largo_metros
      const bedWidth = length * pixelsPerMeter
      const bedX = isOdd ? centerX - numberWidth / 2 - bedWidth : centerX + numberWidth / 2

      const numX = isOdd ? centerX - numberWidth / 4 : centerX + numberWidth / 4
      const onNumber = x >= numX - 15 && x <= numX + 15 && y >= bedY - 6 && y <= bedY + 6
      const onBed = x >= bedX && x <= bedX + bedWidth && y >= bedY - 6 && y <= bedY + 6

      if (onNumber || onBed) {
        return cama.id_cama
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const camaId = getCamaAtPosition(x, y)

    if (camaId) {
      setDragStart(camaId)
      setSelectedCamas(new Set([camaId]))
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Account for canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const camaId = getCamaAtPosition(x, y)

    if (camaId) {
      const startIndex = camas.findIndex(c => c.id_cama === dragStart)
      const currentIndex = camas.findIndex(c => c.id_cama === camaId)

      if (startIndex !== -1 && currentIndex !== -1) {
        const startRow = Math.floor(startIndex / 2)
        const currentRow = Math.floor(currentIndex / 2)
        const minRow = Math.min(startRow, currentRow)
        const maxRow = Math.max(startRow, currentRow)

        const startIsOdd = startIndex % 2 === 0
        const currentIsOdd = currentIndex % 2 === 0

        const newSelected = new Set<number>()

        // If on same row, check if we should include both sides
        if (startRow === currentRow) {
          // Same row - include only the beds between start and current
          const minIndex = Math.min(startIndex, currentIndex)
          const maxIndex = Math.max(startIndex, currentIndex)
          for (let i = minIndex; i <= maxIndex; i++) {
            if (i < camas.length) newSelected.add(camas[i].id_cama)
          }
        } else {
          // Different rows - include beds based on which columns are touched
          const includeOdd = startIsOdd || currentIsOdd
          const includeEven = !startIsOdd || !currentIsOdd

          for (let row = minRow; row <= maxRow; row++) {
            const oddIndex = row * 2
            const evenIndex = row * 2 + 1
            if (includeOdd && oddIndex < camas.length) newSelected.add(camas[oddIndex].id_cama)
            if (includeEven && evenIndex < camas.length) newSelected.add(camas[evenIndex].id_cama)
          }
        }

        setSelectedCamas(newSelected)
      }
    }
  }

  const handleMouseUp = () => {
    setDragStart(null)
  }

  // Helper function to calculate distance between two touches
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Helper function to get midpoint between two touches
  const getTouchMidpoint = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Two-finger gesture for zoom/pan
    if (e.touches.length === 2) {
      e.preventDefault()
      setLastTouchDistance(getTouchDistance(e.touches))
      setLastTouchMidpoint(getTouchMidpoint(e.touches))
      setDragStart(null) // Cancel any selection
      return
    }

    // Single finger for selection
    if (e.touches.length === 1) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]

      // Account for canvas scaling and transform
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = ((touch.clientX - rect.left) * scaleX - offset.x) / scale
      const y = ((touch.clientY - rect.top) * scaleY - offset.y) / scale

      const camaId = getCamaAtPosition(x, y)

      if (camaId) {
        setDragStart(camaId)
        setSelectedCamas(new Set([camaId]))
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    // Two-finger gesture for zoom/pan
    if (e.touches.length === 2) {
      if (lastTouchDistance && lastTouchMidpoint) {
        const newDistance = getTouchDistance(e.touches)
        const newMidpoint = getTouchMidpoint(e.touches)

        // Calculate zoom
        const zoomDelta = newDistance / lastTouchDistance
        const newScale = Math.min(Math.max(scale * zoomDelta, 0.5), 5) // Limit scale between 0.5x and 5x

        // Calculate pan
        const dx = (newMidpoint.x - lastTouchMidpoint.x)
        const dy = (newMidpoint.y - lastTouchMidpoint.y)

        setScale(newScale)
        setOffset({
          x: offset.x + dx,
          y: offset.y + dy
        })

        setLastTouchDistance(newDistance)
        setLastTouchMidpoint(newMidpoint)
      }
      return
    }

    // Single finger for selection
    if (e.touches.length === 1 && dragStart) {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]

      // Account for canvas scaling and transform
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = ((touch.clientX - rect.left) * scaleX - offset.x) / scale
      const y = ((touch.clientY - rect.top) * scaleY - offset.y) / scale

      const camaId = getCamaAtPosition(x, y)

      if (camaId) {
        const startIndex = camas.findIndex(c => c.id_cama === dragStart)
        const currentIndex = camas.findIndex(c => c.id_cama === camaId)

        if (startIndex !== -1 && currentIndex !== -1) {
          const startRow = Math.floor(startIndex / 2)
          const currentRow = Math.floor(currentIndex / 2)
          const minRow = Math.min(startRow, currentRow)
          const maxRow = Math.max(startRow, currentRow)

          const startIsOdd = startIndex % 2 === 0
          const currentIsOdd = currentIndex % 2 === 0

          const newSelected = new Set<number>()

          // If on same row, check if we should include both sides
          if (startRow === currentRow) {
            // Same row - include only the beds between start and current
            const minIndex = Math.min(startIndex, currentIndex)
            const maxIndex = Math.max(startIndex, currentIndex)
            for (let i = minIndex; i <= maxIndex; i++) {
              if (i < camas.length) newSelected.add(camas[i].id_cama)
            }
          } else {
            // Different rows - include beds based on which columns are touched
            const includeOdd = startIsOdd || currentIsOdd
            const includeEven = !startIsOdd || !currentIsOdd

            for (let row = minRow; row <= maxRow; row++) {
              const oddIndex = row * 2
              const evenIndex = row * 2 + 1
              if (includeOdd && oddIndex < camas.length) newSelected.add(camas[oddIndex].id_cama)
              if (includeEven && evenIndex < camas.length) newSelected.add(camas[evenIndex].id_cama)
            }
          }

          setSelectedCamas(newSelected)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    setDragStart(null)
    setLastTouchDistance(null)
    setLastTouchMidpoint(null)
  }

  const handleAssignToGrupo = (grupoId: number) => {
    setTargetGrupo(grupoId)
    setShowConfirmDialog(true)
  }

  const confirmReassign = async () => {
    if (!targetGrupo || selectedCamas.size === 0) return

    try {
      // Update all selected camas to the new grupo
      const updates = Array.from(selectedCamas).map(camaId =>
        supabase
          .from('cama')
          .update({ id_grupo: targetGrupo })
          .eq('id_cama', camaId)
      )

      await Promise.all(updates)

      // Refresh camas
      const { data, error } = await supabase
        .from('cama')
        .select(`
          id_cama,
          id_grupo,
          nombre,
          largo_metros,
          ancho_metros,
          plantas_totales,
          grupo_cama!inner(id_bloque)
        `)
        .eq('grupo_cama.id_bloque', selectedBloque)
        .is('eliminado_en', null)

      if (!error && data) {
        const sorted = data.sort((a, b) => {
          const aNum = parseInt(a.nombre, 10)
          const bNum = parseInt(b.nombre, 10)
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
          return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
        })
        setCamas(sorted)
      }

      setSelectedCamas(new Set())
      setShowConfirmDialog(false)
      setTargetGrupo(null)
    } catch (error) {
      console.error('Error reassigning camas:', error)
    }
  }

  return (
    <div className='flex flex-1 flex-col h-full p-2 gap-1 overflow-hidden'>
      <div className='grid grid-cols-2 gap-1'>
        {/* Finca Combobox */}
        <div className='flex flex-col gap-1'>
          <Popover open={fincaOpen} onOpenChange={setFincaOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={fincaOpen}
                className='w-full justify-between bg-zinc-800 border-0 text-white hover:bg-zinc-700 hover:text-white'
              >
                {selectedFinca
                  ? fincas.find((f) => f.id_finca === selectedFinca)?.nombre
                  : 'Seleccionar finca...'}
                <ChevronsUpDownIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[200px] p-0 bg-zinc-800 border-0'>
              <Command className='bg-zinc-800'>
                <CommandInput
                  placeholder='Buscar finca...'
                  className='text-white'
                />
                <CommandList>
                  <CommandEmpty className='text-white text-sm py-6 text-center'>
                    No se encontró finca.
                  </CommandEmpty>
                  <CommandGroup>
                    {fincas.map((finca) => (
                      <CommandItem
                        key={finca.id_finca}
                        value={finca.nombre}
                        onSelect={() => {
                          setSelectedFinca(finca.id_finca === selectedFinca ? null : finca.id_finca)
                          setFincaOpen(false)
                        }}
                        className='text-white hover:bg-zinc-700'
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedFinca === finca.id_finca ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {finca.nombre}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Bloque Combobox */}
        <div className='flex flex-col gap-1'>
          <Popover open={bloqueOpen} onOpenChange={setBloqueOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={bloqueOpen}
                disabled={!selectedFinca}
                className='w-full justify-between bg-zinc-800 border-0 text-white hover:bg-zinc-700 hover:text-white disabled:opacity-50'
              >
                {selectedBloque
                  ? bloques.find((b) => b.id_bloque === selectedBloque)?.nombre
                  : 'Seleccionar bloque...'}
                <ChevronsUpDownIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[200px] p-0 bg-zinc-800 border-0'>
              <Command className='bg-zinc-800'>
                <CommandInput
                  placeholder='Buscar bloque...'
                  className='text-white'
                />
                <CommandList>
                  <CommandEmpty className='text-white text-sm py-6 text-center'>
                    No se encontró bloque.
                  </CommandEmpty>
                  <CommandGroup>
                    {bloques.map((bloque) => (
                      <CommandItem
                        key={bloque.id_bloque}
                        value={bloque.nombre}
                        onSelect={() => {
                          setSelectedBloque(bloque.id_bloque === selectedBloque ? null : bloque.id_bloque)
                          setBloqueOpen(false)
                        }}
                        className='text-white hover:bg-zinc-700'
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedBloque === bloque.id_bloque ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {bloque.nombre}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Grupos display */}
      {selectedBloque && grupos.length > 0 && (
        <div className='flex flex-col gap-1'>
          <div className='flex gap-1 overflow-x-auto'>
            {grupos.map((grupo, index) => {
              const hasCamasInGrupo = camas.some(c => selectedCamas.has(c.id_cama) && c.id_grupo === grupo.id_grupo)

              return (
                <Button
                  key={grupo.id_grupo}
                  onClick={() => selectedCamas.size > 0 && handleAssignToGrupo(grupo.id_grupo)}
                  disabled={selectedCamas.size === 0}
                  className={`flex-shrink-0 flex flex-col items-start p-2 w-fit h-fit ${getGroupColor(index)} text-white disabled:opacity-50 disabled:cursor-not-allowed ${hasCamasInGrupo ? 'ring ring-white ring-inset-2' : ''}`}
                >
                  <div className='flex flex-col gap-1 w-full text-left'>
                    <div className='text-xs font-semibold text-zinc-400'>Variedad</div>
                    <div className='text-sm font-medium'>
                      {grupo.variedad?.nombre || `ID: ${grupo.id_variedad}`}
                    </div>

                    <div className='text-xs font-semibold text-zinc-400 '>Fecha Siembra</div>
                    <div className='text-sm'>{formatDate(grupo.fecha_siembra)}</div>

                    <div className='text-xs font-semibold text-zinc-400 '>Estado</div>
                    <div className='text-sm'>{grupo.estado}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Canvas visualization */}
      {selectedBloque && camas.length > 0 && (
        <div className='flex flex-col gap-1 flex-1 min-h-0'>
          <div className='flex justify-center items-center bg-zinc-900 rounded-lg w-full flex-1 overflow-hidden'>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className='cursor-pointer touch-none w-full h-full object-contain'
            />
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='bg-zinc-900 text-white border-0'>
          <DialogHeader>
            <DialogTitle className='text-center'>Confirmar Reasignación</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-1 pt-4'>
            <p className='text-center text-sm'>
              ¿Está seguro que desea reasignar {selectedCamas.size} cama{selectedCamas.size > 1 ? 's' : ''} al grupo{' '}
              <span className='font-semibold'>
                {grupos.find(g => g.id_grupo === targetGrupo)?.variedad?.nombre || `Grupo ${targetGrupo}`}
              </span>?
            </p>
          </div>
          <DialogFooter className='flex gap-1 pt-4'>
            <Button
              onClick={() => setShowConfirmDialog(false)}
              className='bg-zinc-700 hover:bg-zinc-600'
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmReassign}
              className='bg-indigo-600 hover:bg-indigo-700'
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
