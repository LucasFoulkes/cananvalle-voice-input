
# TODO
1. voice recognition with vocabulary
npm install vosk-browser
pip install gtts
2. give it tts, so record and then recording go up. also make sure we can control speed. 
**ice** 
1. maybe give it my own voice?

---

``` bash
Remove-Item * -Recurse -Force; npm create @vite-pwa/pwa@latest . -- --template react-ts; npm install; npm install tailwindcss @tailwindcss/vite; npm install @tanstack/react-router @tanstack/react-router-devtools; npm install -D @tanstack/router-plugin @types/node; Set-Content -Path src/index.css -Value '@import "tailwindcss";'; New-Item -ItemType Directory -Force -Path src/routes; @'
import path from "path"
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false
    })
  ],
})
'@ | Set-Content vite.config.ts; @'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
'@ | Set-Content tsconfig.json; @'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
'@ | Set-Content tsconfig.app.json; npx shadcn@latest init -d; npx shadcn@latest add button card; @'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-4 flex gap-4 border-b">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
        <Link to="/posts" className="[&.active]:font-bold">
          Posts
        </Link>
      </div>
      <div className="p-4">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  ),
})
'@ | Set-Content src/routes/__root.tsx; @'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold">Welcome Home!</h1>
      <Card>
        <CardHeader>
          <CardTitle>React PWA with TanStack Router</CardTitle>
          <CardDescription>Built with Vite, Tailwind CSS, and shadcn/ui</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This is a fully configured PWA with file-based routing.</p>
          <Button>Click me!</Button>
        </CardContent>
      </Card>
    </div>
  )
}
'@ | Set-Content src/routes/index.tsx; @'
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
'@ | Set-Content src/routes/about.tsx; @'
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
'@ | Set-Content src/routes/posts.tsx; @'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
'@ | Set-Content src/main.tsx; npm run dev
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
