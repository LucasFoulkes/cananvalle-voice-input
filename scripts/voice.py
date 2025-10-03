"""Simple ad‑hoc test script for ElevenLabs TTS.

Usage:
  1. Create a .env file with ELEVENLABS_API_KEY=.... (see .env.example)
  2. Run:  python scripts/voice.py

This script intentionally only produces an in‑memory playback sample.
For bulk generation (1..100 numbers) use scripts/generate_numbers_audio.py
"""

from pathlib import Path
import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play


load_dotenv()  # Loads ELEVENLABS_API_KEY if present

API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not API_KEY:
    raise SystemExit(
        "Missing ELEVENLABS_API_KEY environment variable. Set it in a .env file or your shell."  # noqa: E501
    )

client = ElevenLabs(api_key=API_KEY)

DEFAULT_VOICE_ID = "xBQhWSfOLmqtKUe8AGj8"  # TODO: make configurable if needed

def demo_phrase():
    audio = client.text_to_speech.convert(
        text="El primer movimiento es lo que pone todo en marcha.",
        voice_id=DEFAULT_VOICE_ID,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    play(audio)


if __name__ == "__main__":
    demo_phrase()