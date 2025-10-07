import { createFileRoute, useNavigate } from '@tanstack/react-router'
import TileButton from '@/components/TileButton'

export const Route = createFileRoute('/configuracion')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  return (
    <div className='flex items-center justify-center h-full p-2'>
      <div className='grid grid-cols-2 gap-2 w-full max-w-2xl aspect-square p-4'>
        <TileButton
          label='FINCAS'
          value=''
          square
          onClick={() => navigate({ to: '/fincas' })}
        />
        <TileButton
          label='USUARIOS'
          value=''
          square
          onClick={() => navigate({ to: '/usuarios' })}
        />
      </div>
    </div>
  )
}
