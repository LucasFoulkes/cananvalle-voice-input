import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Props = {
    label: string
    valueText: React.ReactNode
    inputType?: 'text' | 'number'
    onSave: (value: string) => void
    className?: string
}


export function SquareTile({
    label,
    valueText,
    inputType = 'text',
    onSave,
    className,
}: Props) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState('')

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className={['relative grid place-items-center text-center', className].filter(Boolean).join(' ')}
                    onClick={() => {
                        setValue('')
                        setOpen(true)
                    }}
                >
                    <Label
                        className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-xs "
                    >
                        {label}
                    </Label>
                    <span className='text-base'>
                        {valueText}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className='p-4 sm:max-w-sm' showCloseButton>
                <DialogHeader>
                    <DialogTitle>{label}</DialogTitle>
                </DialogHeader>
                <div className='flex flex-col items-center gap-2'>
                    <Input
                        autoFocus
                        type={inputType}
                        inputMode={inputType === 'number' ? 'numeric' : undefined}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <Button
                        className='w-full'
                        onClick={() => {
                            onSave(value)
                            setOpen(false)
                            setValue('')
                        }}
                    >
                        Guardar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
