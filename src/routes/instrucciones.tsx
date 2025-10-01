import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/instrucciones')({
  component: () => <div>Instrucciones</div>,
})
