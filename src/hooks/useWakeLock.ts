import { useEffect, useRef, useState } from 'react'

/**
 * Hook to keep the screen awake using the Screen Wake Lock API
 * Prevents the device from going to sleep while the app is active
 */
export function useWakeLock() {
    const [isSupported, setIsSupported] = useState(false)
    const [isActive, setIsActive] = useState(false)
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)

    useEffect(() => {
        // Check if Wake Lock API is supported
        if ('wakeLock' in navigator) {
            setIsSupported(true)
        }
    }, [])

    useEffect(() => {
        if (!isSupported) return

        const requestWakeLock = async () => {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen')
                setIsActive(true)
                console.log('Wake Lock activated')

                // Re-acquire wake lock when visibility changes (e.g., user returns to tab)
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('Wake Lock released')
                    setIsActive(false)
                })
            } catch (err: any) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`)
                setIsActive(false)
            }
        }

        // Request wake lock on mount
        requestWakeLock()

        // Re-request wake lock when page becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
                requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (wakeLockRef.current) {
                wakeLockRef.current.release()
                wakeLockRef.current = null
            }
        }
    }, [isSupported])

    return { isSupported, isActive }
}
