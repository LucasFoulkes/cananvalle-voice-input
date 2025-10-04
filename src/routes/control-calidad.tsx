import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { isControlCalidad } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ShieldCheck, UserPlus, Loader2, ChevronDown, ChevronLeft, ChevronRight, Map } from 'lucide-react'
import { createUsuario, getAllUsuarios, type CreateUsuarioInput } from '@/services/usuarioManagementService'
import { getUserTimelines, type UserTimeline } from '@/services/timelineService'
import { getGpsPointsForDate, type GpsPoint } from '@/services/gpsService'
import { UserTimelineView } from '@/components/UserTimeline'
import { GpsMap } from '@/components/GpsMap'
import type { Usuario } from '@/types'

export const Route = createFileRoute('/control-calidad')({
  component: ControlCalidadComponent,
})

// Get local date as YYYY-MM-DD string (without timezone conversion)
function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ControlCalidadComponent() {
  const navigate = useNavigate()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [error, setError] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isUsersOpen, setIsUsersOpen] = useState(false)
  const [timelines, setTimelines] = useState<UserTimeline[]>([])
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [showMapDialog, setShowMapDialog] = useState(false)
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([])
  const [loadingGps, setLoadingGps] = useState(false)

  const [formData, setFormData] = useState<CreateUsuarioInput>({
    nombres: '',
    apellidos: '',
    cedula: '',
    rol: 'conteos',
    clave_pin: ''
  })

  useEffect(() => {
    if (!isControlCalidad()) {
      navigate({ to: '/' })
      return
    }
    loadTimeline()
  }, [])

  useEffect(() => {
    if (isUsersOpen && usuarios.length === 0) {
      loadUsers()
    }
  }, [isUsersOpen])

  useEffect(() => {
    loadTimeline()
  }, [selectedDate])

  const loadTimeline = async () => {
    try {
      setLoadingTimeline(true)
      const data = await getUserTimelines(selectedDate)
      setTimelines(data)
    } catch (err) {
      console.error('Error loading timeline:', err)
    } finally {
      setLoadingTimeline(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const users = await getAllUsuarios()
      setUsuarios(users)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Error al cargar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }

  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T00:00:00')
    date.setDate(date.getDate() - 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T00:00:00')
    date.setDate(date.getDate() + 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const nextDate = `${year}-${month}-${day}`
    const today = getLocalDateString()

    // Only allow moving forward if next date is not in the future
    if (nextDate <= today) {
      setSelectedDate(nextDate)
    }
  }

  const isToday = () => {
    const today = getLocalDateString()
    return selectedDate === today
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${dayName} ${day}/${month}/${year}`
  }

  const loadGpsPoints = async () => {
    try {
      setLoadingGps(true)
      const points = await getGpsPointsForDate(selectedDate)
      setGpsPoints(points)
    } catch (err) {
      console.error('Error loading GPS points:', err)
    } finally {
      setLoadingGps(false)
    }
  }

  const handleOpenMap = () => {
    setShowMapDialog(true)
    loadGpsPoints()
  }

  // Generate colors for users
  const userColors: Record<string, string> = {}
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  timelines.forEach((timeline, index) => {
    if (timeline.id_usuario) {
      userColors[String(timeline.id_usuario)] = colors[index % colors.length]
    }
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await createUsuario(formData)
      setShowCreateDialog(false)
      setFormData({
        nombres: '',
        apellidos: '',
        cedula: '',
        rol: 'conteos',
        clave_pin: ''
      })
      await loadUsers()
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!isControlCalidad()) {
    return null
  }

  return (
    <div className='h-full flex flex-col p-2 gap-1'>
      <Card className='bg-zinc-900 border-none text-white'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <ShieldCheck className='text-green-400' />
              Control de Calidad
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className='bg-green-600 hover:bg-green-700'
            >
              <UserPlus className='mr-2' size={16} />
              Crear Usuario
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      <Collapsible open={isUsersOpen} onOpenChange={setIsUsersOpen}>
        <Card className='bg-zinc-900 border-none text-white'>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                className='w-full justify-between p-0 hover:bg-transparent'
              >
                <CardTitle>Usuarios</CardTitle>
                <ChevronDown className={`transition-transform ${isUsersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {loadingUsers ? (
                <div className='flex justify-center py-8'>
                  <Loader2 className='animate-spin text-zinc-400' size={32} />
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='border-zinc-700'>
                        <TableHead className='text-zinc-400'>Nombres</TableHead>
                        <TableHead className='text-zinc-400'>Apellidos</TableHead>
                        <TableHead className='text-zinc-400'>Cédula</TableHead>
                        <TableHead className='text-zinc-400'>Rol</TableHead>
                        <TableHead className='text-zinc-400'>PIN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuarios.map((user) => (
                        <TableRow key={user.id_usuario} className='border-zinc-700'>
                          <TableCell>{user.nombres}</TableCell>
                          <TableCell>{user.apellidos || '-'}</TableCell>
                          <TableCell>{user.cedula || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${user.rol === 'sudo' ? 'bg-purple-600' :
                              user.rol === 'control_de_calidad' ? 'bg-blue-600' :
                                'bg-zinc-600'
                              }`}>
                              {user.rol}
                            </span>
                          </TableCell>
                          <TableCell>{user.clave_pin}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className='bg-zinc-900 border-none text-white flex-1 min-h-0 flex flex-col'>
        <CardContent className='flex-1 min-h-0 flex flex-col gap-2 px-2'>
          <div className='flex items-center justify-between flex-shrink-0'>
            <Button
              onClick={goToPreviousDay}
              variant='outline'
              size='icon'
              className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
            >
              <ChevronLeft />
            </Button>
            <div className='flex items-center gap-2'>
              <span className='text-lg font-medium text-center capitalize flex-shrink-0'>
                {formatDisplayDate(selectedDate)}
              </span>
              <Button
                onClick={handleOpenMap}
                variant='outline'
                size='icon'
                className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 flex-shrink-0'
              >
                <Map />
              </Button>
            </div>
            <Button
              onClick={goToNextDay}
              variant='outline'
              size='icon'
              disabled={isToday()}
              className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed'
            >
              <ChevronRight />
            </Button>
          </div>
          <div className='flex-1 min-h-0'>
            {loadingTimeline ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='animate-spin text-zinc-400' size={32} />
              </div>
            ) : (
              <UserTimelineView timelines={timelines} />
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='nombres'>Nombres *</Label>
              <Input
                id='nombres'
                value={formData.nombres}
                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                className='bg-zinc-800 border-zinc-700 text-white'
                required
                autoFocus
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='apellidos'>Apellidos</Label>
              <Input
                id='apellidos'
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                className='bg-zinc-800 border-zinc-700 text-white'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='cedula'>Cédula</Label>
              <Input
                id='cedula'
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className='bg-zinc-800 border-zinc-700 text-white'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='rol'>Rol *</Label>
              <select
                id='rol'
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value as 'conteos' | 'control_de_calidad' })}
                className='flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400'
                required
              >
                <option value='conteos'>Conteos</option>
                <option value='control_de_calidad'>Control de Calidad</option>
              </select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='clave_pin'>PIN (4 dígitos) *</Label>
              <Input
                id='clave_pin'
                type='password'
                inputMode='numeric'
                pattern='[0-9]{4}'
                maxLength={4}
                value={formData.clave_pin}
                onChange={(e) => setFormData({ ...formData, clave_pin: e.target.value })}
                className='bg-zinc-800 border-zinc-700 text-white text-center tracking-widest'
                required
              />
            </div>

            {error && (
              <p className='text-red-400 text-sm text-center'>{error}</p>
            )}

            <div className='grid grid-cols-2 gap-2'>
              <Button
                type='button'
                onClick={() => setShowCreateDialog(false)}
                className='bg-zinc-700 hover:bg-zinc-600'
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                className='bg-green-600 hover:bg-green-700'
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700 p-0 overflow-hidden'>
          {loadingGps ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='animate-spin text-zinc-400' size={32} />
            </div>
          ) : (
            <GpsMap points={gpsPoints} userColors={userColors} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
