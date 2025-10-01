const generateSpanishNumbers = (): string[] => {
    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
        'diecisiete', 'dieciocho', 'diecinueve'];
    const twenties = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
        'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const tens = ['', '', '', 'treinta', 'cuarenta', 'cincuenta',
        'sesenta', 'setenta', 'ochenta', 'noventa'];

    const numbers: string[] = [];

    // 1-9
    for (let i = 1; i <= 9; i++) {
        numbers.push(units[i]);
    }

    // 10-19
    numbers.push(...teens);

    // 20-29
    numbers.push(...twenties);

    // 30-99
    for (let i = 3; i <= 9; i++) {
        numbers.push(tens[i]);
        for (let j = 1; j <= 9; j++) {
            numbers.push(`${tens[i]} y ${units[j]}`);
        }
    }

    // 100
    numbers.push('cien');

    return numbers;
};

export const vocabulary = {
    // Location hierarchy
    locationKeywords: ['finca', 'bloque', 'cama'],

    // Phenological stages
    stages: ['espiga', 'arroz', 'arveja', 'garbanzo', 'uva', 'color', 'abierto', 'cosecha'],

    // Numbers in Spanish
    numbers: generateSpanishNumbers(),

    // Letters
    letters: ['a', 'b', 'c'],

    // Commands
    commands: ['borrar', 'ultimo', 'total'],

    // Get all words as flat array for Vosk grammar
    getAllWords(): string[] {
        return [
            ...this.locationKeywords,
            ...this.stages,
            ...this.numbers,
            ...this.letters,
            ...this.commands
        ];
    },

    // Get words as JSON array string for Vosk
    getGrammarJSON(): string {
        return JSON.stringify(this.getAllWords());
    }
};

// Map finca numbers to names
export const FINCA_MAP: Record<string, string> = {
    '1': 'cananvalle',
    'uno': 'cananvalle',
    '2': 'santamaria',
    'dos': 'santamaria'
};

// Reverse map for display
export const FINCA_NAMES: Record<string, string> = {
    'cananvalle': 'Cananvalle (Finca 1)',
    'santamaria': 'Santa María (Finca 2)'
};