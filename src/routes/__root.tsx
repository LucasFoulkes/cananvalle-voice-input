import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Mic, ListOrdered, Settings, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Escuchar', Icon: Mic },
  { to: '/observaciones', label: 'Observaciones', Icon: ListOrdered },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
  { to: '/instrucciones', label: 'Instrucciones', Icon: BookOpen },
] as const


export const Route = createRootRoute({
  component: () => {
    return (
      <div className='h-screen flex flex-col'>
        <div className='h-full'>
          <Outlet />
        </div>
        <nav className="py-4 flex border-t justify-between justify-center">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className=" w-full text-center text-gray-500"
              activeProps={{ className: 'font-bold text-black' }}
              title={item.label}
            >
              <item.Icon className="mx-auto" size={22} aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    )
  },
})
