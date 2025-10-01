import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold">About</h1>
      <Card>
        <CardHeader>
          <CardTitle>About This App</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a demo app showcasing TanStack Router with shadcn/ui components.</p>
        </CardContent>
      </Card>
    </div>
  )
}
