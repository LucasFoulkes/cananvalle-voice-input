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
}

export function TileButton({
    label,
    value,
    className,
    square,
    labelClassName,
    valueClassName,
    ...buttonProps
}: TileButtonProps) {
    return (
        <Button
            className={cn(
                'flex flex-col justify-center items-center h-fit py-1 gap-1',
                square && 'aspect-square',
                className,
            )}
            {...buttonProps}
        >
            <Label className={cn('text-xs', labelClassName)}>{label}</Label>
            {value !== undefined && (
                <span className={cn('text-4xl', valueClassName)}>{value}</span>
            )}
        </Button>
    )
}

export default TileButton
