import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { useState } from 'react'

type TileButtonProps = {
    label: string
    value: string
    onSave: (val: string) => void
}

export function TileButton({ label, value, onSave }: TileButtonProps) {
    const [open, setOpen] = useState(false)

    const handleSave = (input: HTMLInputElement) => {
        if (input.value) {
            onSave(input.value)
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="aspect-square bg-zinc-800 rounded-xl flex items-center relative cursor-pointer">
                    <span className='uppercase font-medium text-center absolute top-0 w-full'>{label}</span>
                    <span className='text-center text-5xl font-regular w-full'>{value || '-'}</span>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className='uppercase'>{label}</DialogTitle>
                </DialogHeader>
                <Input autoFocus onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                        handleSave(e.currentTarget)
                    }
                }} />
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <DialogClose asChild>
                        <Button onClick={(e) => {
                            const dialogContent = e.currentTarget.closest('[role="dialog"]')
                            const input = dialogContent?.querySelector('input') as HTMLInputElement
                            if (input) handleSave(input)
                        }}>Guardar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
