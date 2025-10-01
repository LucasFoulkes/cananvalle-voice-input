const normalizeBase = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

const createNumbers = () => {
    const lookups: Record<string, number> = {}
    const words = new Set<string>()

    const register = (word: string, value: number) => {
        if (!word) return
        words.add(word)
        lookups[normalizeBase(word)] = value
    }

    const baseWords: Array<[string, number]> = [
        ['uno', 1],
        ['dos', 2],
        ['tres', 3],
        ['cuatro', 4],
        ['cinco', 5],
        ['seis', 6],
        ['siete', 7],
        ['ocho', 8],
        ['nueve', 9],
        ['diez', 10],
        ['once', 11],
        ['doce', 12],
        ['trece', 13],
        ['catorce', 14],
        ['quince', 15],
        ['dieciseis', 16],
        ['diecisiete', 17],
        ['dieciocho', 18],
        ['diecinueve', 19],
        ['veinte', 20],
        ['veintiuno', 21],
        ['veintidos', 22],
        ['veintitres', 23],
        ['veinticuatro', 24],
        ['veinticinco', 25],
        ['veintiseis', 26],
        ['veintisiete', 27],
        ['veintiocho', 28],
        ['veintinueve', 29],
        ['treinta', 30],
        ['cuarenta', 40],
        ['cincuenta', 50],
        ['sesenta', 60],
        ['setenta', 70],
        ['ochenta', 80],
        ['noventa', 90],
        ['cien', 100],
    ]

    const accentVariants: Record<string, string> = {
        'diecis\u00e9is': 'dieciseis',
        'veintid\u00f3s': 'veintidos',
        'veintitr\u00e9s': 'veintitres',
        'veintis\u00e9is': 'veintiseis',
    }

    for (const [word, value] of baseWords) {
        register(word, value)
    }

    for (const [accented, plain] of Object.entries(accentVariants)) {
        register(accented, lookups[plain])
    }

    const tens: Array<{ word: string; base: number }> = [
        { word: 'treinta', base: 30 },
        { word: 'cuarenta', base: 40 },
        { word: 'cincuenta', base: 50 },
        { word: 'sesenta', base: 60 },
        { word: 'setenta', base: 70 },
        { word: 'ochenta', base: 80 },
        { word: 'noventa', base: 90 },
    ]

    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']

    for (const { word, base } of tens) {
        register(word, base)
        for (let i = 1; i <= 9; i++) {
            register(`${word} y ${units[i]}`, base + i)
        }
    }

    return {
        numberWords: Array.from(words),
        lookups,
    }
}

const { numberWords, lookups: spanishToNumber } = createNumbers()

export const vocabulary = {
    locationKeywords: ['finca', 'bloque', 'cama'],
    stages: ['espiga', 'arroz', 'arveja', 'garbanzo', 'uva', 'color', 'abierto', 'cosecha'],
    numbers: numberWords,
    letters: ['a', 'b', 'c'],
    commands: ['borrar', 'ultimo', 'total'],
    voice: ['masculino', 'masculina', 'hombre', 'varon', 'var\u00f3n', 'femenino', 'femenina', 'mujer'],
    getAllWords(): string[] {
        return [
            ...this.locationKeywords,
            ...this.stages,
            ...this.numbers,
            ...this.letters,
            ...this.commands,
            ...this.voice,
        ]
    },
}

export const FINCA_MAP: Record<string, string> = {
    '1': 'cananvalle',
    'uno': 'cananvalle',
    '2': 'santamaria',
    'dos': 'santamaria',
}

export const normalizeSpanish = (value: string) => normalizeBase(value)

export const parseNumber = (wordOrPhrase: string): number | null => {
    if (!wordOrPhrase) return null
    const token = normalizeSpanish(wordOrPhrase)

    if (/^\d{1,3}$/.test(token)) {
        const digit = parseInt(token, 10)
        return Number.isNaN(digit) ? null : digit
    }

    const direct = spanishToNumber[token]
    if (typeof direct === 'number') {
        return direct
    }

    const parts = token.split(/\s+/)
    if (parts.length === 3 && parts[1] === 'y') {
        const tens = spanishToNumber[parts[0]] || 0
        const ones = spanishToNumber[parts[2]] || 0
        if (tens >= 30 && tens <= 90 && ones >= 1 && ones <= 9) {
            return tens + ones
        }
    }

    return null
}

