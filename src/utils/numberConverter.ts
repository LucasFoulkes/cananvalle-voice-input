// Spanish number words to digits
export const numberToSpanish: Record<number, string> = {
    1: 'uno',
    2: 'dos',
    3: 'tres',
    4: 'cuatro',
    5: 'cinco',
    6: 'seis',
    7: 'siete',
    8: 'ocho',
    9: 'nueve',
    10: 'diez',
    11: 'once',
    12: 'doce',
    13: 'trece',
    14: 'catorce',
    15: 'quince',
    16: 'dieciséis',
    17: 'diecisiete',
    18: 'dieciocho',
    19: 'diecinueve',
    20: 'veinte',
    // Add more as needed
};

export const spanishToNumber: Record<string, number> = {
    'uno': 1,
    'dos': 2,
    'tres': 3,
    'cuatro': 4,
    'cinco': 5,
    'seis': 6,
    'siete': 7,
    'ocho': 8,
    'nueve': 9,
    'diez': 10,
    'once': 11,
    'doce': 12,
    'trece': 13,
    'catorce': 14,
    'quince': 15,
    'dieciséis': 16, 'dieciseis': 16,
    'diecisiete': 17,
    'dieciocho': 18,
    'diecinueve': 19,
    'veinte': 20,
    'veintiuno': 21,
    'veintidós': 22, 'veintidos': 22,
    'veintitrés': 23, 'veintitres': 23,
    'veinticuatro': 24,
    'veinticinco': 25,
    'veintiséis': 26, 'veintiseis': 26,
    'veintisiete': 27,
    'veintiocho': 28,
    'veintinueve': 29,
    'treinta': 30,
    'cuarenta': 40,
    'cincuenta': 50,
    'sesenta': 60,
    'setenta': 70,
    'ochenta': 80,
    'noventa': 90,
    'cien': 100,
};

// Parse Spanish number words to digits
export const parseNumberFromWords = (words: string[]): number | null => {
    if (words.length === 0) return null;

    // Single word numbers
    if (words.length === 1) {
        const word = words[0].toLowerCase();
        return spanishToNumber[word] || null;
    }

    // Compound numbers like "treinta y cinco" (30 + 5 = 35)
    if (words.length === 3 && words[1] === 'y') {
        const tens = spanishToNumber[words[0].toLowerCase()] || 0;
        const ones = spanishToNumber[words[2].toLowerCase()] || 0;
        return tens + ones;
    }

    return null;
};

// Normalize Spanish text: lowercase and remove diacritics
export const normalizeSpanish = (s: string) =>
    s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]+/g, '')
        .toLowerCase()
        .trim();

// Parse a number from a single token or a compound phrase (e.g., "treinta y cinco")
export const parseNumber = (wordOrPhrase: string): number | null => {
    if (!wordOrPhrase) return null;
    const token = normalizeSpanish(wordOrPhrase);

    // Digits
    if (/^\d{1,3}$/.test(token)) {
        const n = parseInt(token, 10);
        if (!Number.isNaN(n)) return n;
    }

    const parts = token.split(/\s+/);
    if (parts.length === 1) {
        const n = spanishToNumber[token];
        return typeof n === 'number' ? n : null;
    }

    return parseNumberFromWords(parts);
};