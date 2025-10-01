import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/observaciones')({
    component: () => <div>Observaciones</div>,
})
