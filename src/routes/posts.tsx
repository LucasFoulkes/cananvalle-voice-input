import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/posts')({
  component: Posts,
})

const posts = [
  { id: 1, title: 'First Post', excerpt: 'This is the first post' },
  { id: 2, title: 'Second Post', excerpt: 'This is the second post' },
  { id: 3, title: 'Third Post', excerpt: 'This is the third post' },
]

function Posts() {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold">Posts</h1>
      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>Post #{post.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{post.excerpt}</p>
              <Button variant="outline">Read more</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
