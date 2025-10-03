import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ButtonBaseProps = React.ComponentProps<typeof Button>

export type TileButtonProps = Omit<ButtonBaseProps, 'children'> & {
    label: string
    value?: React.ReactNode
    square?: boolean
    labelClassName?: string
    valueClassName?: string
    isActive?: boolean
    isReady?: boolean
}

export function TileButton({
    label,
    value,
    className,
    square,
    labelClassName,
    valueClassName,
    isActive,
    isReady,
    ...buttonProps
}: TileButtonProps) {
    const [isFlashing, setIsFlashing] = React.useState(false)
    const prevValueRef = React.useRef(value)

    React.useEffect(() => {
        if (prevValueRef.current !== value && prevValueRef.current !== undefined) {
            setIsFlashing(true)
            const timer = setTimeout(() => setIsFlashing(false), 500)
            return () => clearTimeout(timer)
        }
        prevValueRef.current = value
    }, [value])

    return (
        <Button
            className={cn(
                'flex flex-col justify-center items-center h-fit py-1 gap-1 transition-colors duration-500 text-white',
                square && 'aspect-square',
                isFlashing && 'bg-blue-500',
                isActive && 'bg-green-500 hover:bg-green-600',
                isReady && 'bg-emerald-500 hover:bg-emerald-600',
                className,
            )}
            {...buttonProps}
        >
            <Label className={cn('text-xs text-white', labelClassName)}>{label}</Label>
            {value !== undefined && (
                <span className={cn('text-4xl text-white', valueClassName)}>{value}</span>
            )}
        </Button>
    )
}

export default TileButton
