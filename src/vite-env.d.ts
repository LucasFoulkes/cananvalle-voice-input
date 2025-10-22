/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

// Screen Wake Lock API types
interface WakeLockSentinel extends EventTarget {
    readonly released: boolean
    readonly type: 'screen'
    release(): Promise<void>
}

interface Navigator {
    wakeLock?: {
        request(type: 'screen'): Promise<WakeLockSentinel>
    }
}
