// Utilities to normalize and parse Spanish number phrases (0..400)

export function normalizeSpanish(text: string) {
    return text
        .toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .trim()
}

export function parseSpanishNumber(text: string): number | null {
    const t = normalizeSpanish(text)

    const units: Record<string, number> = {
        cero: 0,
        uno: 1,
        un: 1,
        una: 1,
        dos: 2,
        tres: 3,
        cuatro: 4,
        cinco: 5,
        seis: 6,
        siete: 7,
        ocho: 8,
        nueve: 9,
    }
    const teens: Record<string, number> = {
        diez: 10,
        once: 11,
        doce: 12,
        trece: 13,
        catorce: 14,
        quince: 15,
        dieciseis: 16,
        diecisiete: 17,
        dieciocho: 18,
        diecinueve: 19,
    }
    const tens: Record<string, number> = {
        veinte: 20,
        treinta: 30,
        cuarenta: 40,
        cincuenta: 50,
        sesenta: 60,
        setenta: 70,
        ochenta: 80,
        noventa: 90,
    }
    const hundreds: Record<string, number> = {
        cien: 100,
        ciento: 100,
        doscientos: 200,
        trescientos: 300,
        cuatrocientos: 400,
    }
    const fused20s: Record<string, number> = {
        veintiuno: 21,
        veintiun: 21,
        veintiuna: 21,
        veintidos: 22,
        veintitres: 23,
        veinticuatro: 24,
        veinticinco: 25,
        veintiseis: 26,
        veintisiete: 27,
        veintiocho: 28,
        veintinueve: 29,
    }

    if (t in fused20s) return fused20s[t]
    if (t in teens) return teens[t]
    if (t in units) return units[t]
    if (t in tens) return tens[t]
    if (t in hundreds) return hundreds[t]

    const tokens = t.split(/\s+/).filter(Boolean)
    const readUnit = (w?: string) => (w && w in units ? units[w] : 0)
    const readTens = (w?: string) => (w && w in tens ? tens[w] : 0)
    const readTeen = (w?: string) => (w && w in teens ? teens[w] : null)
    const readHundreds = (w?: string) => (w && w in hundreds ? hundreds[w] : 0)

    // hundreds + remainder
    const firstHundreds = readHundreds(tokens[0])
    if (firstHundreds) {
        const rest = tokens.slice(1)
        if (rest.length === 0) return firstHundreds
        const asTeen = readTeen(rest.join(' '))
        if (asTeen !== null) return firstHundreds + asTeen
        const tVal = readTens(rest[0])
        if (tVal) {
            if (rest.length >= 3 && rest[1] === 'y') return firstHundreds + tVal + readUnit(rest[2])
            return firstHundreds + tVal
        }
        const uVal = readUnit(rest[0])
        if (uVal) return firstHundreds + uVal
    }

    // tens + y + unit
    if (tokens.length >= 3 && tokens[1] === 'y' && tokens[0] in tens && tokens[2] in units) {
        return tens[tokens[0]] + units[tokens[2]]
    }
    // tens + unit without 'y'
    if (tokens.length === 2 && tokens[0] in tens && tokens[1] in units) {
        return tens[tokens[0]] + units[tokens[1]]
    }

    return null
}
