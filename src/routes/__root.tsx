import * as React from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Link } from "@tanstack/react-router";
import { Pencil, ClipboardList } from 'lucide-react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navItems = [
    { to: '/', label: 'Entrada', Icon: Pencil },
    { to: '/observaciones', label: 'Observaciones', Icon: ClipboardList },
  ] as const
  return (
    <React.Fragment>
      <div className='h-screen  grid grid-rows-[1fr_auto] bg-black text-white '>
        <main className='min-h-0 overflow-y-auto'>
          <Outlet />
        </main>
        <nav className='flex w-full pb-5 bg-indigo-600 rounded-t-lg justify-center items-center gap-1 p-1'>
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className='group flex-1'
              activeProps={{ 'data-active': true, 'aria-current': 'page' }}
              activeOptions={{ exact: to === '/' }}
            >
              <Button
                className='
                      bg-indigo-500 text-white transition-colors w-full group-data-[active=true]:bg-indigo-400 '
                aria-label={label}
              >
                <Icon />
                <span className='sr-only'>{label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </React.Fragment>
  )
}