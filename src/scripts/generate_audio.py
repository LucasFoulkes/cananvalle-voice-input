import os
import asyncio
from typing import List, Tuple

try:
    import edge_tts  # type: ignore
except Exception as e:
    raise SystemExit("Edge TTS no está instalado. Ejecuta: pip install edge-tts")

# Create audio directory
os.makedirs('public/audio', exist_ok=True)

# Your complete vocabulary
words = {
    # Location
    'finca': 'finca',
    'bloque': 'bloque', 
    'cama': 'cama',
    
    # Stages
    'espiga': 'espiga',
    'arroz': 'arroz',
    'arveja': 'arveja',
    'garbanzo': 'garbanzo',
    'uva': 'uva',
    'color': 'color',
    'abierto': 'abierto',
    'cosecha': 'cosecha',
    
    # Commands
    'borrar': 'borrar',
    'ultimo': 'último',
    'total': 'total',
    
    # Letters
    'a': 'a',
    'b': 'b',
    'c': 'c',

    # names
    'cananvalle': 'cananvalle',
    'santamaria': 'santamaria',

    # genders
    'masculino': 'masculino',
    'femenino': 'femenino',
}

# Numbers 1-100 in Spanish
numbers = {
    1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
    21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco',
    26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve', 30: 'treinta',
    31: 'treinta y uno', 32: 'treinta y dos', 33: 'treinta y tres', 34: 'treinta y cuatro',
    35: 'treinta y cinco', 36: 'treinta y seis', 37: 'treinta y siete', 38: 'treinta y ocho',
    39: 'treinta y nueve', 40: 'cuarenta', 41: 'cuarenta y uno', 42: 'cuarenta y dos',
    43: 'cuarenta y tres', 44: 'cuarenta y cuatro', 45: 'cuarenta y cinco', 46: 'cuarenta y seis',
    47: 'cuarenta y siete', 48: 'cuarenta y ocho', 49: 'cuarenta y nueve', 50: 'cincuenta',
    51: 'cincuenta y uno', 52: 'cincuenta y dos', 53: 'cincuenta y tres', 54: 'cincuenta y cuatro',
    55: 'cincuenta y cinco', 56: 'cincuenta y seis', 57: 'cincuenta y siete', 58: 'cincuenta y ocho',
    59: 'cincuenta y nueve', 60: 'sesenta', 61: 'sesenta y uno', 62: 'sesenta y dos',
    63: 'sesenta y tres', 64: 'sesenta y cuatro', 65: 'sesenta y cinco', 66: 'sesenta y seis',
    67: 'sesenta y siete', 68: 'sesenta y ocho', 69: 'sesenta y nueve', 70: 'setenta',
    71: 'setenta y uno', 72: 'setenta y dos', 73: 'setenta y tres', 74: 'setenta y cuatro',
    75: 'setenta y cinco', 76: 'setenta y seis', 77: 'setenta y siete', 78: 'setenta y ocho',
    79: 'setenta y nueve', 80: 'ochenta', 81: 'ochenta y uno', 82: 'ochenta y dos',
    83: 'ochenta y tres', 84: 'ochenta y cuatro', 85: 'ochenta y cinco', 86: 'ochenta y seis',
    87: 'ochenta y siete', 88: 'ochenta y ocho', 89: 'ochenta y nueve', 90: 'noventa',
    91: 'noventa y uno', 92: 'noventa y dos', 93: 'noventa y tres', 94: 'noventa y cuatro',
    95: 'noventa y cinco', 96: 'noventa y seis', 97: 'noventa y siete', 98: 'noventa y ocho',
    99: 'noventa y nueve', 100: 'cien'
}

EDGE_RATE = "+25%"  # same speed as interactive TTS
FEMALE_PREFIX = "f_"  # female variants: e.g., f_finca.mp3, f_1.mp3


async def pick_edge_voices() -> Tuple[str, str]:
    """Return (male_short_name, female_short_name) for Spanish voices based on locale prefs."""
    voices = await edge_tts.list_voices()
    prefs = ["es-EC", "es-MX", "es-CO", "es-PE", "es-ES", "es-AR", "es-US"]
    rank = {loc: i for i, loc in enumerate(prefs)}

    def pick(gender: str) -> str:
        pool = [v for v in voices if str(v.get("Locale", "")).startswith("es") and str(v.get("Gender", "")).lower() == gender]
        if not pool:
            raise RuntimeError(f"No hay voces en español disponibles en Edge TTS para género: {gender}.")
        pool.sort(key=lambda v: rank.get(str(v.get("Locale", "")), 999))
        return str(pool[0].get("ShortName"))

    return pick("male"), pick("female")


async def synth_one(voice: str, text: str, outfile: str) -> bool:
    try:
        communicate = edge_tts.Communicate(text, voice=voice, rate=EDGE_RATE)
        await communicate.save(outfile)
        return True
    except Exception as e:
        print(f"✗ Error: {outfile} - {e}")
        return False


async def main_async():
    os.makedirs('public/audio', exist_ok=True)
    print('Seleccionando voces en español…')
    male_voice, female_voice = await pick_edge_voices()
    print(f"Usando voces -> Masculina: {male_voice} | Femenina: {female_voice} (rate {EDGE_RATE})")

    items: List[Tuple[str, str]] = []
    # Words
    for key, text in words.items():
        items.append((f'public/audio/{key}.mp3', text))
    # Numbers
    for num, text in numbers.items():
        items.append((f'public/audio/{num}.mp3', text))

    # Generate MALE set (no prefix)
    print(f'Generando {len(items)} archivos (voz masculina)…')
    ok_m = 0
    skipped_m = 0
    for outfile, text in items:
        if os.path.exists(outfile):
            skipped_m += 1
            print(f'⏭️  Ya existe, se omite: {os.path.basename(outfile)}')
            continue
        success = await synth_one(male_voice, text, outfile)
        if success:
            ok_m += 1
            print(f'✓ {os.path.basename(outfile)}')

    total = len(items)
    print(f"\n✅ Masculina: Generados {ok_m}/{total} · ⏭️ Omitidos: {skipped_m}")
    if ok_m + skipped_m < total:
        print("Algunos archivos fallaron en la voz masculina. Verifica tu conexión.")

    # Prepare FEMALE set with prefix
    female_items: List[Tuple[str, str]] = []
    for outfile, text in items:
        dirname = os.path.dirname(outfile)
        base = os.path.basename(outfile)
        female_out = os.path.join(dirname, f"{FEMALE_PREFIX}{base}")
        female_items.append((female_out, text))

    print(f"\nGenerando {len(female_items)} archivos (voz femenina, prefijo '{FEMALE_PREFIX}')…")
    ok_f = 0
    skipped_f = 0
    for outfile, text in female_items:
        if os.path.exists(outfile):
            skipped_f += 1
            print(f'⏭️  Ya existe, se omite: {os.path.basename(outfile)}')
            continue
        success = await synth_one(female_voice, text, outfile)
        if success:
            ok_f += 1
            print(f'✓ {os.path.basename(outfile)}')

    total_f = len(female_items)
    print(f"\n✅ Femenina: Generados {ok_f}/{total_f} (prefijo '{FEMALE_PREFIX}') · ⏭️ Omitidos: {skipped_f}")
    if ok_f + skipped_f < total_f:
        print("Algunos archivos fallaron en la voz femenina. Verifica tu conexión.")

if __name__ == '__main__':
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\nCancelado por el usuario")