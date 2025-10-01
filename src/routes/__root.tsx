import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { VoiceProvider } from '@/state/VoiceContext'
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
      <VoiceProvider>
        <div className='h-screen flex flex-col bg-black overflow-hidden'>
          <div className='flex-1 overflow-hidden'>
            <Outlet />
          </div>
          <nav className="py-4 flex bg-indigo-500 pb-8 justify-between justify-center mx-1 rounded-t-2xl shadow-lg">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className=" w-full text-center text-gray-500"
                activeProps={{ className: 'font-bold text-black' }}
                title={item.label}
              >
                <item.Icon className="mx-auto text-white" size={22} aria-hidden="true" />
                <span className="sr-only">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </VoiceProvider>
    )
  },
})
