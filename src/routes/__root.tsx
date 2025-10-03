import * as React from 'react'
import { Outlet, createRootRoute, useNavigate, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Link } from "@tanstack/react-router";
import { Pencil, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'
import { isAuthenticated, logout, getCurrentUser, isControlCalidad } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)
  const currentUser = getCurrentUser()
  const hasControlCalidadAccess = isControlCalidad()

  React.useEffect(() => {
    if (!isAuthenticated() && !isLoginPage) {
      navigate({ to: '/login' })
    }
  }, [location.pathname, isLoginPage])

  const handleLogout = () => {
    logout()
    setShowLogoutDialog(false)
    navigate({ to: '/login' })
  }

  const baseNavItems = [
    { to: '/', label: 'Entrada', Icon: Pencil },
    { to: '/observaciones', label: 'Observaciones', Icon: ClipboardList },
  ]

  const navItems = hasControlCalidadAccess
    ? [...baseNavItems, { to: '/control-calidad', label: 'Control', Icon: ShieldCheck }]
    : baseNavItems

  // Don't show nav on login page
  if (isLoginPage) {
    return <Outlet />
  }

  const gridCols = hasControlCalidadAccess ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <React.Fragment>
      <div className='h-screen grid grid-rows-[1fr_auto] bg-black text-white'>
        <main className='min-h-0 overflow-y-auto'>
          <Outlet />
        </main>
        <nav className={`grid ${gridCols} w-full pb-5 px-3 bg-indigo-600 rounded-t-lg items-center gap-1 p-1`}>
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className='group'
              activeProps={{ 'data-active': true, 'aria-current': 'page' }}
              activeOptions={{ exact: to === '/' }}
            >
              <Button
                className='
                      bg-indigo-500 text-white transition-colors w-full group-data-[active=true]:bg-indigo-400 flex flex-col gap-1 h-auto py-2'
                aria-label={label}
              >
                <Icon />
                <span className='text-[10px]'>{label}</span>
              </Button>
            </Link>
          ))}
          <Button
            onClick={() => setShowLogoutDialog(true)}
            className='bg-indigo-500 text-white hover:bg-indigo-600 transition-colors w-full flex flex-col gap-1 h-auto py-2'
            aria-label='Cerrar sesión'
          >
            <LogOut />
            <span className='text-[10px]'>{currentUser?.nombres || 'Salir'}</span>
          </Button>
        </nav>

        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
            <DialogHeader>
              <DialogTitle className='text-center'>Cerrar Sesión</DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-4 pt-4'>
              <p className='text-center text-sm'>
                ¿Está seguro que desea cerrar sesión?
              </p>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  onClick={() => setShowLogoutDialog(false)}
                  className='bg-zinc-700 hover:bg-zinc-600'
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleLogout}
                  className='bg-red-600 hover:bg-red-700'
                >
                  Salir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </React.Fragment>
  )
}