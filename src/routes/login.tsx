import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Card, CardContent } from '@/components/ui/card'
import { validatePin, getUsuarios } from '@/services/usuarioService'

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

  useEffect(() => {
    // Auto-submit when PIN is complete (4 digits)
    if (pin.length === 4) {
      handleLogin()
    }
  }, [pin])

  const handleLogin = async () => {
    if (pin.length !== 4) return

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
        <CardContent>
          <div className='space-y-6'>
            <div className='flex flex-col items-center space-y-4'>
              <label className='text-sm text-zinc-400'>Ingrese su PIN</label>
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value) => setPin(value)}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className='bg-zinc-800 border-zinc-700 text-white text-2xl w-14 h-14' />
                  <InputOTPSlot index={1} className='bg-zinc-800 border-zinc-700 text-white text-2xl w-14 h-14' />
                  <InputOTPSlot index={2} className='bg-zinc-800 border-zinc-700 text-white text-2xl w-14 h-14' />
                  <InputOTPSlot index={3} className='bg-zinc-800 border-zinc-700 text-white text-2xl w-14 h-14' />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && (
              <p className='text-red-400 text-sm text-center'>{error}</p>
            )}
            {loading && (
              <p className='text-zinc-400 text-sm text-center'>Verificando...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
