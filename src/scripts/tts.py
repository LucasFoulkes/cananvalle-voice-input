"""
Simple console TTS: type a phrase, it speaks; press Enter on an empty line (or type 'salir'/'exit') to quit.

Requirements:
    pip install gTTS
Optional (recommended for no-window playback):
    pip install playsound==1.2.2
    (Alternative without installing playsound on Windows: use --no-window to try built-in MCI or winsound)

Usage (Windows PowerShell):
    # Standard Spanish, Peru accent via TLD
    python src/scripts/tts.py --lang es --tld com.pe

    # Prefer in-process, no-window playback (Windows)
    python src/scripts/tts.py --no-window --lang es --tld com.pe
"""

from gtts import gTTS
import argparse
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


def _windows_play_mci(path: str, verbose: bool = True) -> bool:
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
        # -y overwrite, PCM S16LE 16k mono is compatible with winsound
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


def play_mp3(path: str, verbose: bool = True, prefer_inprocess: bool = False) -> bool:
    """Play an MP3 file cross-platform.
    Returns True if playback was blocking (safe to delete immediately), False if non-blocking.
    """
    # If user prefers in-process/no-window playback, try those first
    if prefer_inprocess:
        # 1) playsound (pure Python, blocking, no window)
        try:
            from playsound import playsound  # type: ignore

            if verbose:
                print("Reproduciendo (playsound)…")
            playsound(path)
            return True
        except Exception:
            pass

        # 2) Windows: MCI (no external window)
        if platform.system() == "Windows":
            if _windows_play_mci(path, verbose=verbose):
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
        print("No se pudo reproducir en proceso. Instala 'playsound==1.2.2' o agrega ffmpeg al PATH, o ejecuta sin --no-window.")
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
                    return blocking
                except Exception:
                    continue
    except Exception:
        pass

    print("No se encontró un reproductor de audio. Instala 'playsound' o configura un reproductor (mpg123/ffplay).")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Console TTS (gTTS)")
    parser.add_argument("--lang", default="es", help="Idioma (por defecto: es)")
    parser.add_argument("--tld", default="com", help="TLD para acento regional (p.ej. com.mx, es)")
    parser.add_argument("--slow", action="store_true", help="Hablar más despacio")
    parser.add_argument("--keep", action="store_true", help="Mantener el archivo temporal generado")
    parser.add_argument("--no-window", action="store_true", help="Preferir reproducción en proceso (sin abrir otro programa)")
    args = parser.parse_args()

    print(f"TTS listo. Idioma={args.lang}, tld={args.tld}, slow={args.slow}")
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

        try:
            tts = gTTS(text=text, lang=args.lang, tld=args.tld, slow=args.slow)
            # Use a temp file; on Windows keep it if playback is non-blocking
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                tmp_path = tmp.name
            tts.save(tmp_path)

            blocking = play_mp3(tmp_path, prefer_inprocess=args.no_window)
            if blocking and not args.keep:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            else:
                print(f"Archivo: {tmp_path}")
        except Exception as e:
            print(f"Error de TTS: {e}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
