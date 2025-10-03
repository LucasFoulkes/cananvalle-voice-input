import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validatePin, getUsuarios } from '@/services/usuarioService'
import { LogIn } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Sync usuarios on mount
    getUsuarios().catch(console.error)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const usuario = validatePin(pin)

      if (usuario) {
        localStorage.setItem('current_user', JSON.stringify(usuario))
        navigate({ to: '/' })
      } else {
        setError('PIN incorrecto')
        setPin('')
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white flex items-center justify-center p-4'>
      <Card className='w-full max-w-md bg-zinc-900 border-zinc-700 text-white'>
        <CardHeader>
          <CardTitle className='text-center text-2xl'>
            <LogIn className='inline-block mr-2' size={28} />
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-2'>
              <Input
                id='pin'
                type='password'
                inputMode='numeric'
                pattern='[0-9]*'
                placeholder='Ingrese su PIN'
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className='bg-zinc-800 border-zinc-700 text-white text-lg text-center tracking-widest'
                autoComplete='off'
                autoFocus
                disabled={loading}
              />
            </div>
            {error && (
              <p className='text-red-400 text-sm text-center'>{error}</p>
            )}
            <Button
              type='submit'
              className='w-full bg-indigo-600 hover:bg-indigo-700'
              disabled={loading || !pin}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
