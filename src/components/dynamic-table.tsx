import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Props<T extends Record<string, unknown>> = {
    data: T[]
    labels?: Partial<Record<keyof T & string, string>>
    rightAlignKeys?: Array<keyof T & string>
    emptyText?: string
}

function humanize(key: string) {
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/^\p{L}/u, (c) => c.toUpperCase())
}

export function DynamicTable<T extends Record<string, unknown>>({ data, labels, rightAlignKeys = [], emptyText = 'Sin datos' }: Props<T>) {
    if (!data || data.length === 0) {
        return <div className='text-muted-foreground text-sm'>{emptyText}</div>
    }

    const keys = Object.keys(data[0]) as Array<keyof T & string>

    const alignKeys = rightAlignKeys

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {keys.map((k) => (
                        <TableHead key={k} className={alignKeys.includes(k) ? 'text-right' : undefined}>
                            {labels?.[k] ?? humanize(k)}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, idx) => (
                    <TableRow key={idx}>
                        {keys.map((k) => (
                            <TableCell key={k} className={alignKeys.includes(k) ? 'text-right' : undefined}>
                                {(row as any)[k] ?? '-'}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
