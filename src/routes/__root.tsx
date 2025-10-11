import { Outlet, createRootRoute, useNavigate, useLocation, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Link } from "@tanstack/react-router";
import { Pencil, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'
import { logout, isControlCalidad, isAuthenticated } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'

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

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  // Don't show nav on login page
  if (location.pathname === '/login') {
    return (
      <div className='h-screen bg-black text-white'>
        <Outlet />
      </div>
    )
  }

  const hasControlCalidadAccess = isControlCalidad()

  const navItems = [
    { to: '/', Icon: Pencil },
    { to: '/observaciones', Icon: ClipboardList },
    ...(hasControlCalidadAccess ? [{ to: '/control-calidad', Icon: ShieldCheck }] : []),
  ]

  return (
    <div className='h-screen grid grid-rows-[1fr_auto] bg-black text-white'>
      <main className='min-h-0 overflow-y-auto'>
        <Outlet />
      </main>

      {/* navbar */}
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
    </div >
  )
}