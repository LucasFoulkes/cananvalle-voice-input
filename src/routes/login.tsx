import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { validatePin, getUsuarios } from '@/services/usuarioService'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    // If already authenticated, redirect to home
    if (isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
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
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white flex items-center justify-center p-4'>
      <Card className='w-full max-w-md bg-zinc-900 border-zinc-700 text-white'>
        <CardContent className='pt-6'>
          <form onSubmit={handleLogin} className='space-y-6'>
            <div className='flex flex-col items-center space-y-4'>
              <label className='text-sm text-zinc-400'>Ingrese su PIN</label>
              <Input
                type='password'
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className='bg-zinc-800 border-zinc-700 text-white'
                disabled={loading}
                autoFocus
                autoComplete='off'
              />
            </div>
            {error && (
              <p className='text-red-400 text-sm text-center'>{error}</p>
            )}
            <Button
              type='submit'
              className='w-full bg-indigo-600 hover:bg-indigo-700'
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
