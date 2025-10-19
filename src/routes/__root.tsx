import { Outlet, createRootRoute, useNavigate, useLocation, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Link } from "@tanstack/react-router";
import { Pencil, ClipboardList, LogOut, ShieldCheck, Scissors } from 'lucide-react'
import { logout, isAuthenticated, canViewObservaciones, canViewPinches, canViewQualityControl } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt'
import { useWakeLock } from '@/hooks/useWakeLock'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname !== '/login' && !isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const location = useLocation()
  const navigate = useNavigate()

  // Keep screen awake while app is open (like Netflix)
  useWakeLock()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  if (location.pathname === '/login') {
    return (
      <div className='h-screen bg-black text-white'>
        <Outlet />
      </div>
    )
  }


  const navItems = [
    { to: '/', Icon: Pencil, show: true },
    { to: '/observaciones', Icon: ClipboardList, show: canViewObservaciones() },
    { to: '/pinches', Icon: Scissors, show: canViewPinches() },
    { to: '/control-calidad', Icon: ShieldCheck, show: canViewQualityControl() }
  ].filter(item => item.show)

  return (
    <div className='h-screen grid grid-rows-[1fr_auto] bg-black text-white overflow-hidden'>
      <main className='min-h-0 overflow-hidden'>
        <Outlet />
      </main>

      <nav className='flex pb-5 pt-1 px-5 bg-zinc-800 rounded-t-xl items-stretch gap-1'>
        {navItems.map(({ to, Icon }) => (
          <Link
            key={to}
            to={to}
            className='flex-1 group'
            activeProps={{ 'data-active': true, 'aria-current': 'page' }}
            activeOptions={{ exact: to === '/' }}
          >
            <Button className='w-full h-full bg-zinc-800 group-data-[active=true]:bg-zinc-900 rounded-full'>
              <Icon className='size-8' />
            </Button>
          </Link>
        ))}

        <div className='flex-1'>
          <Dialog>
            <DialogTrigger asChild>
              <Button className='w-full h-full bg-zinc-800 '>
                <LogOut className='size-8' />
              </Button>
            </DialogTrigger>
            <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
              <DialogHeader>
                <DialogTitle className='text-center'>Cerrar Sesión</DialogTitle>
              </DialogHeader>
              <div className='flex flex-col gap-4 pt-4'>
                <p className='text-center text-sm'>
                  ¿Está seguro que desea cerrar sesión?
                </p>
                <div className='grid grid-cols-2 gap-2'>
                  <DialogClose asChild>
                    <Button className='bg-zinc-700'>
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button onClick={handleLogout} className='bg-red-600'>
                    Salir
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav >
      <PwaInstallPrompt />
    </div >
  )
}