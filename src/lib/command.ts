import type { Form } from "@/types"

export type StageKey = "arroz" | "arveja" | "garbanzo" | "color" | "abiertos"

type AddItem = {
    estado: StageKey
    cantidad: number
    form: Form // snapshot of the form when the add was parsed
}

export type ParseResult = {
    nextForm: Form
    adds: AddItem[]
}

const fieldKeys = new Set<[keyof Form] | any>(["finca", "bloque", "cama"]) as unknown as Set<keyof Form>
const stageKeys = new Set<StageKey>(["arroz", "arveja", "garbanzo", "color", "abiertos"])

/**
 * Very small DSL parser.
 * Examples:
 * - "finca 1 bloque 2 cama 3 garbanzo 5"
 * - "arroz 10 arveja 4" (uses current form)
 * Order matters: fields set before a stage apply to that stage's add.
 */
export function parseCommand(input: string, initialForm: Form): ParseResult {
    const tokens = input.trim().toLowerCase().split(/\s+/).filter(Boolean)
    let i = 0
    const nextForm: Form = { ...initialForm }
    const adds: AddItem[] = []

    while (i < tokens.length) {
        const tok = tokens[i]!

        // Field assignment: finca|bloque|cama <value>
        if ((fieldKeys as any).has(tok)) {
            const key = tok as keyof Form
            const val = tokens[i + 1] ?? ""
            if (val) {
                // Cascading resets: higher level clears lower levels
                if (key === 'finca') {
                    nextForm.finca = val
                    nextForm.bloque = ''
                    nextForm.cama = ''
                } else if (key === 'bloque') {
                    nextForm.bloque = val
                    nextForm.cama = ''
                } else if (key === 'cama') {
                    nextForm.cama = val
                } else {
                    ; (nextForm as any)[key] = val
                }
                i += 2
                continue
            }
            i += 1
            continue
        }

        // Stage add: <stage> <number>
        if (stageKeys.has(tok as StageKey)) {
            const amountToken = tokens[i + 1]
            const n = amountToken != null ? Number(amountToken) : NaN
            if (!Number.isNaN(n)) {
                adds.push({
                    estado: tok as StageKey,
                    cantidad: n,
                    form: { ...nextForm },
                })
                i += 2
                continue
            } else {
                // If amount missing, skip just the stage token
                i += 1
                continue
            }
        }

        // Unknown token: skip
        i += 1
    }

    return { nextForm, adds }
}
