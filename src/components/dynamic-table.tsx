import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type DynamicTableProps<T extends object> = {
    data: T[]
}

export function DynamicTable<T extends object>({ data }: DynamicTableProps<T>) {
    if (!data?.length) return null
    const keys = Object.keys(data[0] as object)
    return (
        <div className='overflow-hidden bg-zinc-900 flex flex-1 flex-col h-full p-1 rounded-lg'>
            <Table>
                <TableHeader >
                    <TableRow className='capitalize'>
                        {keys.map((k) => (
                            <TableHead key={k} className='text-white'>{k}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, i) => (
                        <TableRow key={i} className='capitalize'>
                            {keys.map((k) => (
                                <TableCell key={k}>
                                    {formatValue((row as any)[k], k)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function formatValue(val: any, key: string) {
    if (key === 'fecha' && typeof val === 'string') {
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d.toLocaleString()
    }
    return String(val)
}

export default DynamicTable
