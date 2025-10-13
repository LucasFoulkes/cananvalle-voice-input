import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
    readonly platforms: string[]
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    prompt: () => Promise<void>
}

const PWA_INSTALLED_KEY = 'pwa_installed'

function isAndroidDevice(): boolean {
    if (typeof navigator === 'undefined') return false
    return /android/i.test(navigator.userAgent)
}

function isPwaAlreadyInstalled(): boolean {
    if (typeof window === 'undefined') return false
    const mediaQueryMatch = window.matchMedia?.('(display-mode: standalone)')?.matches
    const iosStandalone = (window.navigator as any).standalone === true
    const storedFlag = window.localStorage.getItem(PWA_INSTALLED_KEY) === 'true'
    return Boolean(mediaQueryMatch || iosStandalone || storedFlag)
}

export function PwaInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showInstallDialog, setShowInstallDialog] = useState(false)

    useEffect(() => {
        if (!isAndroidDevice() || isPwaAlreadyInstalled()) {
            if (isPwaAlreadyInstalled()) {
                window.localStorage.setItem(PWA_INSTALLED_KEY, 'true')
            }
            return
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault()
            const promptEvent = event as BeforeInstallPromptEvent
            setInstallPrompt(promptEvent)
            setShowInstallDialog(true)
        }

        const handleAppInstalled = () => {
            window.localStorage.setItem(PWA_INSTALLED_KEY, 'true')
            setInstallPrompt(null)
            setShowInstallDialog(false)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!installPrompt) return
        await installPrompt.prompt()
        const choice = await installPrompt.userChoice
        if (choice.outcome === 'accepted') {
            window.localStorage.setItem(PWA_INSTALLED_KEY, 'true')
        }
        setShowInstallDialog(false)
        setInstallPrompt(null)
    }

    return (
        <Dialog open={showInstallDialog} onOpenChange={(open) => setShowInstallDialog(open && Boolean(installPrompt))}>
            <DialogContent className='bg-zinc-900 text-white border-zinc-700'>
                <DialogHeader>
                    <DialogTitle className='text-center'>Instala la aplicación</DialogTitle>
                </DialogHeader>
                <p className='text-sm text-center text-zinc-300'>Agrega esta app a tu pantalla de inicio para un acceso más rápido sin conexión.</p>
                <div className='flex flex-col gap-2 pt-4'>
                    <Button onClick={handleInstallClick} disabled={!installPrompt} className='bg-emerald-600 hover:bg-emerald-700'>
                        <Download className='mr-2 h-4 w-4' />
                        Instalar ahora
                    </Button>
                    <Button variant='outline' className='bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800' onClick={() => setShowInstallDialog(false)}>
                        Más tarde
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
