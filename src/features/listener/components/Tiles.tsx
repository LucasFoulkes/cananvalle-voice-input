import { type ReactNode } from 'react'

type TileProps = {
    label: string
    value: ReactNode
    className?: string
    bgClass?: string
    textClass?: string
    labelClassName?: string
    valueClassName?: string
    highlight?: boolean
    highlightBgClass?: string
    onClick?: () => void
}

export function Tile({
    label,
    value,
    className = '',
    bgClass = 'bg-black',
    textClass = 'text-white',
    labelClassName = 'text-black opacity-80 text-[15px] leading-none absolute top-2 left-0 right-0 text-center pointer-events-none',
    valueClassName = 'text-2xl font-bold',
    highlight = false,
    highlightBgClass = 'bg-indigo-500',
    onClick
}: TileProps) {
    return (
        <div
            className={`relative uppercase rounded-xl overflow-hidden ${bgClass} ${textClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {/* highlight overlay */}
            <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-200 ${highlight ? 'opacity-100' : 'opacity-0'} ${highlightBgClass}`} />
            <div className={`${labelClassName} z-10`}>{label}</div>
            <div className='absolute inset-0 flex items-center justify-center z-20'>
                <div className={valueClassName}>{value}</div>
            </div>
        </div>
    )
}

type LocationTileProps = {
    type: 'finca' | 'bloque' | 'cama'
    value: string
    className?: string
}

export function LocationTile({ type, value, className = '' }: LocationTileProps) {
    const isSet = value && value !== '-'
    return (
        <Tile
            label={type}
            value={value}
            className={className}
            bgClass={isSet ? 'bg-green-400' : 'bg-gray-400'}
            textClass='text-black'
        />
    )
}

type StageTileProps = {
    stage: string
    count: number
    isActive: boolean
    isFlashing?: boolean
}

export function StageTile({ stage, count, isActive, isFlashing = false }: StageTileProps) {
    return (
        <Tile
            label={stage}
            value={count}
            className={`h-full transition-[box-shadow,transform] duration-200 ${isFlashing ? 'ring-4 ring-indigo-500 scale-[1.02]' : ''}`}
            bgClass={isActive ? 'bg-emerald-400' : 'bg-gray-400'}
            textClass='text-black'
            valueClassName='text-[54px] leading-none font-extrabold'
            highlight={isFlashing}
            highlightBgClass='bg-indigo-500'
        />
    )
}