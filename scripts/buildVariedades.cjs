const fs = require('fs');
const path = require('path');

const RAW_PATH = path.resolve(__dirname, '../src/data/variedades-raw.json');
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/variedades.json');

function readRawData() {
    const raw = fs.readFileSync(RAW_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
        throw new Error('Expected an array in variedades-raw.json');
    }
    if (data.length === 1 && Array.isArray(data[0])) {
        return data[0];
    }
    return data;
}

function buildLookup(entries) {
    const lookup = {};

    for (const entry of entries) {
        const {
            fincaId,
            bloqueId,
            bloqueNombre,
            variedadId,
            variedadNombre,
            variedadColor,
        } = entry;

        if (fincaId == null || !bloqueNombre || variedadId == null || !variedadNombre) {
            continue;
        }

        const fincaKey = String(fincaId);
        const bloqueKey = String(bloqueNombre);

        if (!lookup[fincaKey]) {
            lookup[fincaKey] = {};
        }

        if (!lookup[fincaKey][bloqueKey]) {
            lookup[fincaKey][bloqueKey] = [];
        }

        const list = lookup[fincaKey][bloqueKey];
        const already = list.find((item) => item.id === variedadId);
        if (!already) {
            list.push({
                id: variedadId,
                nombre: variedadNombre,
                color: variedadColor || null,
                bloqueId: bloqueId ?? null,
            });
        }
    }

    for (const fincaKey of Object.keys(lookup)) {
        const bloques = lookup[fincaKey];
        for (const bloqueKey of Object.keys(bloques)) {
            bloques[bloqueKey].sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
    }

    return lookup;
}

function main() {
    const entries = readRawData();
    const lookup = buildLookup(entries);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lookup, null, 2) + '\n');
    console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
