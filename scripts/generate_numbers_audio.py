"""Generate MP3 files for Spanish numbers 0..300 using ElevenLabs.

Outputs to public/audio/numbers/<n>.mp3 (e.g. 175.mp3 -> "ciento setenta y cinco").

Optional: --components flag creates reusable segments (tens, tens + ' y', units)
inside public/audio/numbers/components/ (still limited to 30..90 tens + units).

Examples:
    python scripts/generate_numbers_audio.py                # 0..300 (skip existing)
    python scripts/generate_numbers_audio.py --force        # overwrite all 0..300
    python scripts/generate_numbers_audio.py --start 150 --end 200
    python scripts/generate_numbers_audio.py --components
"""
from __future__ import annotations
import os
from pathlib import Path
import argparse
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
try:
    # When run as a module: python -m scripts.generate_numbers_audio
    from scripts.spanish_numbers import number_to_spanish  # type: ignore
except ModuleNotFoundError:
    # When run directly: python scripts/generate_numbers_audio.py
    from spanish_numbers import number_to_spanish  # type: ignore

VOICE_ID = "xBQhWSfOLmqtKUe8AGj8"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio" / "numbers"
COMPONENT_DIR = AUDIO_DIR / "components"


def ensure_dirs():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    COMPONENT_DIR.mkdir(parents=True, exist_ok=True)


def get_client() -> ElevenLabs:
    load_dotenv()
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit("Set ELEVENLABS_API_KEY in your environment or .env file")
    return ElevenLabs(api_key=api_key)


def save_audio(binary_iterable, path: Path, force: bool):
    if path.exists() and not force:
        return False
    with open(path, "wb") as f:
        for chunk in binary_iterable:
            f.write(chunk)
    return True


def generate_number_audio(client: ElevenLabs, n: int, force: bool):
    text = number_to_spanish(n)
    path = AUDIO_DIR / f"{n}.mp3"
    audio = client.text_to_speech.convert(
        text=text,
        voice_id=VOICE_ID,
        model_id=MODEL_ID,
        output_format=OUTPUT_FORMAT,
    )
    wrote = save_audio(audio, path, force)
    return wrote, path, text


# Optional component strategy for future concatenation approach.
TENS = [30, 40, 50, 60, 70, 80, 90]
UNITS = list(range(1, 10))


def generate_components(client: ElevenLabs, force: bool):
    # Generate tens words alone
    for t in TENS:
        text = number_to_spanish(t)
        path = COMPONENT_DIR / f"{t}.mp3"
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=VOICE_ID,
            model_id=MODEL_ID,
            output_format=OUTPUT_FORMAT,
        )
        save_audio(audio, path, force)

    # Generate 'treinta y', 'cuarenta y', etc. for 30..90 to splice with units
    for t in TENS:
        text = number_to_spanish(t) + " y"
        path = COMPONENT_DIR / f"{t}_y.mp3"
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=VOICE_ID,
            model_id=MODEL_ID,
            output_format=OUTPUT_FORMAT,
        )
        save_audio(audio, path, force)

    # Unit words 1..9
    for u in UNITS:
        text = number_to_spanish(u)
        path = COMPONENT_DIR / f"u{u}.mp3"
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=VOICE_ID,
            model_id=MODEL_ID,
            output_format=OUTPUT_FORMAT,
        )
        save_audio(audio, path, force)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--force", action="store_true", help="Overwrite existing files")
    p.add_argument(
        "--components",
        action="store_true",
        help="Also generate component segments (tens, tens+' y', units)",
    )
    p.add_argument(
        "--start", type=int, default=0, help="Start number (inclusive, default 0)"
    )
    p.add_argument(
        "--end", type=int, default=300, help="End number (inclusive, default 300)"
    )
    return p.parse_args()


def main():
    args = parse_args()
    ensure_dirs()
    client = get_client()

    # Clamp to supported range 0..300
    start = max(0, args.start)
    end = min(300, args.end)
    if start > end:
        raise SystemExit("Start cannot be greater than end")
    for n in range(start, end + 1):
        wrote, path, text = generate_number_audio(client, n, args.force)
        status = "wrote" if wrote else "skip"
        print(f"{status:5} {path.name:<8} <- {text}")

    if args.components:
        print("Generating component segments...")
        generate_components(client, args.force)
        print("Component generation done.")

    print("Done.")


if __name__ == "__main__":
    main()
