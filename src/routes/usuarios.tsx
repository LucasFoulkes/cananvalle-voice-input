import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Loader2 } from 'lucide-react'
import { createUsuario, getAllUsuarios, type CreateUsuarioInput } from '@/services/usuarioManagementService'
import type { Usuario } from '@/types'

export const Route = createFileRoute('/usuarios')({
  component: UsuariosComponent,
})

function UsuariosComponent() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [formData, setFormData] = useState<CreateUsuarioInput>({
    nombres: '',
    apellidos: '',
    cedula: '',
    rol: 'conteos',
    clave_pin: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

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

  return (
    <div className='h-full flex flex-col p-2 gap-1'>
      <Card className='bg-zinc-900 border-none text-white'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              Usuarios
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
    </div>
  )
}
