import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'
import { useRegisterSW } from 'virtual:pwa-register/react'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  // PWA: register SW and auto-refresh on updates
  useRegisterSW({ immediate: true })
  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
