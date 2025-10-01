import * as React from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <React.Fragment>
      <div className='h-screen w-screen grid grid-rows-[1fr_auto]'>
        <main className='min-h-0 overflow-y-auto'>
          <Outlet />
        </main>
        <nav className='flex w-full gap-2 p-2 border-t'>
          <Link to="/" className="flex-1">
            <Button className='w-full'>Nueva Observación</Button>
          </Link>
          <Link to="/observaciones" className="flex-1">
            <Button className='w-full'>Ver Observaciones</Button>
          </Link>
        </nav>
      </div>
    </React.Fragment>
  )
}