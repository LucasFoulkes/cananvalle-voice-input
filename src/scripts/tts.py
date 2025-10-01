"""
Simple console TTS (online, male Spanish only): type a phrase, it speaks; Enter on empty line to quit.

Defaults (fixed):
    - Voice provider: Edge TTS (online)
    - Voice: es-EC-DiegoNeural (male, Spanish Ecuador)
    - Playback rate: +25%

Notes:
    - Requires 'edge-tts' to be installed.
    - Playback stays in the terminal (no windows). On Windows we prefer MCI/playsound for in-process playback.

Install:
    pip install edge-tts playsound==1.2.2

Run:
    python src/scripts/tts.py
"""

import os
import platform
import subprocess
import sys
import tempfile
from typing import Optional


def _windows_play_wmplayer(path: str) -> bool:
    """Try to play via Windows Media Player in blocking mode.
    Returns True if the call was executed (blocking), False otherwise.
    """
    # Common install locations
    candidates = [
        os.path.join(os.environ.get("ProgramFiles(x86)", ""), "Windows Media Player", "wmplayer.exe"),
        os.path.join(os.environ.get("ProgramFiles", ""), "Windows Media Player", "wmplayer.exe"),
        "wmplayer.exe",
    ]
    for exe in candidates:
        if not exe:
            continue
        try:
            # /play starts playback, /close closes player when finished
            subprocess.run([exe, "/play", "/close", path], check=True)
            return True
        except Exception:
            continue
    return False


def _windows_play_mci(path: str, verbose: bool = True, speed_multiplier: float = 1.0) -> bool:
    """Play MP3 using Windows MCI (Media Control Interface) via winmm.
    This is in-process and blocks until finished. No external window.
    Returns True if playback succeeded.
    """
    try:
        import ctypes

        if verbose:
            print("Reproduciendo (MCI)…")
        mci = ctypes.windll.winmm.mciSendStringW  # type: ignore[attr-defined]
        alias = f"tts_{os.getpid()}"
        # Open with alias, then play and wait, then close
        mci(f'open "{path}" type mpegvideo alias {alias}', None, 0, None)
        try:
            # Attempt to set playback speed (1000 is normal). Ignore if unsupported.
            try:
                speed = max(100, min(4000, int(1000 * float(speed_multiplier))))
                mci(f'set {alias} speed {speed}', None, 0, None)
            except Exception:
                pass
            # 'wait' makes it blocking
            mci(f'play {alias} wait', None, 0, None)
        finally:
            mci(f'close {alias}', None, 0, None)
        return True
    except Exception:
        return False


def _convert_mp3_to_wav_ffmpeg(mp3_path: str, verbose: bool = True) -> Optional[str]:
    """Convert MP3 to WAV using ffmpeg on PATH. Returns path to wav file or None.
    The caller is responsible for deleting the returned temp file.
    """
    try:
        # Check ffmpeg availability quickly
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception:
        if verbose:
            print("ffmpeg no está disponible en PATH; omitiendo conversión a WAV.")
        return None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            wav_path = tmp.name
        if verbose:
            print("Convirtiendo MP3 a WAV (ffmpeg)…")
        # -y overwrite, PCM S16LE mono
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            mp3_path,
            "-ac",
            "1",
            "-ar",
            "22050",
            "-c:a",
            "pcm_s16le",
            wav_path,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return wav_path
    except Exception:
        try:
            os.remove(wav_path)  # type: ignore[name-defined]
        except Exception:
            pass
        return None


    # Deprecated: pitch-preserving speed change no longer needed (Edge TTS supports rate directly)


def _normalize_langs(langs) -> str:
    return ""


def _guess_gender_from_voice(voice) -> Optional[str]:
    return None


def play_mp3(path: str, verbose: bool = True, prefer_inprocess: bool = True, speed_multiplier: float = 1.0) -> bool:
    """Play an MP3 file cross-platform.
    Returns True if playback was blocking (safe to delete immediately), False if non-blocking.
    """
    # All inputs are pre-generated with desired rate; play as-is
    def _cleanup_stretched():
        return None

    # If user prefers in-process/no-window playback, try those first
    if prefer_inprocess:
        # 1) playsound (pure Python, blocking, no window)
        try:
            from playsound import playsound  # type: ignore

            if verbose:
                print("Reproduciendo (playsound)…")
            # playsound doesn't change speed; still OK as fallback
            playsound(path)
            return True
        except Exception:
            pass

        # 2) Windows: MCI (no external window). Speed set via atempo above, so play at normal rate.
        if platform.system() == "Windows":
            if _windows_play_mci(path, verbose=verbose, speed_multiplier=1.0):
                return True

            # 3) Try converting to WAV and use winsound (still in-process)
            try:
                import winsound  # type: ignore

                wav_path = _convert_mp3_to_wav_ffmpeg(path, verbose=verbose)
                if wav_path:
                    try:
                        if verbose:
                            print("Reproduciendo (winsound)…")
                        winsound.PlaySound(wav_path, winsound.SND_FILENAME | winsound.SND_SYNC)
                        # Delete the temporary wav file right away
                        os.remove(wav_path)
                        return True
                    except Exception:
                        try:
                            os.remove(wav_path)
                        except Exception:
                            pass
            except Exception:
                pass

        # If we get here with prefer_inprocess=True, avoid opening external apps
        print("No se pudo reproducir en proceso. Instala 'playsound==1.2.2'.")
        return False

    sysname = platform.system()
    try:
        if sysname == "Windows":
            # Try playsound (if installed) even when not forcing in-process
            try:
                from playsound import playsound  # type: ignore
                if verbose:
                    print("Reproduciendo (playsound)…")
                playsound(path)
                return True
            except Exception:
                pass
            # Prefer WMP in blocking mode if available
            if _windows_play_wmplayer(path):
                return True
            # Fallback: try cmd start (likely non-blocking)
            try:
                if verbose:
                    print("Reproduciendo (cmd start)…")
                subprocess.run(["cmd", "/c", "start", "", path], check=True)
                return False
            except Exception:
                pass
            # Last resort: os.startfile (non-blocking)
            try:
                if verbose:
                    print("Reproduciendo (os.startfile)…")
                os.startfile(path)  # type: ignore[attr-defined]
                return False
            except Exception:
                pass
        elif sysname == "Darwin":  # macOS
            # Try speed if available
            subprocess.run(["afplay", path], check=True)
            return True
        else:  # Linux/other
            for cmd in (
                ["mpg123", path],
                ["ffplay", "-nodisp", "-autoexit", path],
                ["xdg-open", path],  # likely non-blocking
            ):
                try:
                    blocking = cmd[0] not in ("xdg-open",)
                    subprocess.run(cmd, check=True)
                    if blocking:
                        return blocking
                except Exception:
                    continue
    except Exception:
        pass

    print("No se encontró un reproductor de audio. Instala 'playsound' o configura un reproductor (mpg123/ffplay).")
    return False


def main() -> int:
    # Fixed configuration: Edge TTS only, male Spanish voice, prefer Ecuador
    EDGE_RATE = "+25%"

    # Resolve a valid male Spanish voice at startup
    try:
        import asyncio
        import edge_tts  # type: ignore

        def pick_edge_voice() -> str:
            async def inner() -> str:
                voices = await edge_tts.list_voices()
                prefs = ["es-EC", "es-MX", "es-CO", "es-PE", "es-ES", "es-AR", "es-US"]
                male_es = [v for v in voices if str(v.get("Locale", "")).startswith("es") and str(v.get("Gender", "")).lower() == "male"]
                # Sort by preferred locales
                rank = {loc: i for i, loc in enumerate(prefs)}
                def score(v):
                    loc = str(v.get("Locale", ""))
                    return rank.get(loc, 999)
                male_es.sort(key=score)
                if not male_es:
                    raise RuntimeError("No hay voces masculinas en español disponibles en Edge TTS.")
                return str(male_es[0].get("ShortName"))
            return asyncio.run(inner())

        EDGE_VOICE = pick_edge_voice()
    except Exception as e:
        print("Edge TTS no está instalado o no se pudo obtener la lista de voces. Instala con: pip install edge-tts")
        print(f"Detalle: {e}")
        return 1

    print(f"TTS (Edge) listo. Voz={EDGE_VOICE}, rate={EDGE_RATE}")
    print("Escribe texto y presiona Enter. Vacío para salir. (también: 'salir', 'exit', 'q')\n")

    while True:
        try:
            text = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAdiós!")
            break

        if not text or text.lower() in {"salir", "exit", "q"}:
            print("Saliendo…")
            break

        # Edge TTS (male Spanish Ecuador) REQUIRED
        try:
            import asyncio
            import edge_tts  # type: ignore

            # We'll try up to 3 voices: the chosen one and two alternates from the male Spanish set
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                tmp_path = tmp.name

            async def list_male_es():
                voices = await edge_tts.list_voices()
                prefs = ["es-EC", "es-MX", "es-CO", "es-PE", "es-ES", "es-AR", "es-US"]
                male_es = [v for v in voices if str(v.get("Locale", "")).startswith("es") and str(v.get("Gender", "")).lower() == "male"]
                rank = {loc: i for i, loc in enumerate(prefs)}
                def score(v):
                    loc = str(v.get("Locale", ""))
                    return rank.get(loc, 999)
                male_es.sort(key=score)
                return [str(v.get("ShortName")) for v in male_es]

            voices_try = [EDGE_VOICE]
            try:
                more = asyncio.run(list_male_es())
                # Deduplicate and keep order
                seen = set(voices_try)
                for v in more:
                    if v not in seen:
                        voices_try.append(v)
                        seen.add(v)
                voices_try = voices_try[:3]
            except Exception:
                pass

            last_err = None
            for vname in voices_try:
                try:
                    async def synth_edge():
                        communicate = edge_tts.Communicate(text, voice=vname, rate=EDGE_RATE)
                        await communicate.save(tmp_path)
                    asyncio.run(synth_edge())
                    _ = play_mp3(tmp_path, prefer_inprocess=True, speed_multiplier=1.0)
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        print(f"Archivo: {tmp_path}")
                    last_err = None
                    break
                except Exception as e2:
                    last_err = e2
                    continue

            if last_err is not None:
                raise last_err

        except Exception as e:
            print("Edge TTS falló al sintetizar audio. Verifica conexión y parámetros.")
            print(f"Detalle: {e}")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
