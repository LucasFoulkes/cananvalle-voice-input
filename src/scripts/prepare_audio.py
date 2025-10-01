import argparse
import os
import subprocess
from typing import List, Optional

AUDIO_DIR = os.path.join('public', 'audio')
SOURCE_DIRS = [
    os.path.join('src', 'sounds'),        # place your recorded files here
    os.path.join('public', 'audio_src'),  # or here
]

FFMPEG = 'ffmpeg'
FFPROBE = 'ffprobe'


def have_ffmpeg() -> bool:
    try:
        subprocess.run([FFMPEG, '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception:
        return False


def get_duration(path: str) -> Optional[float]:
    """Return duration in seconds using ffprobe, or None on failure."""
    try:
        result = subprocess.run(
            [FFPROBE, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
            capture_output=True, text=True, check=True,
        )
        val = result.stdout.strip()
        return float(val) if val else None
    except Exception:
        return None


def _tmp_path(base_dir: str, name: str) -> str:
    return os.path.join(base_dir, f'.tmp_{name}')


def trim_auto(
    in_path: str,
    out_path: str,
    *,
    primary_threshold_db: float,
    secondary_threshold_db: float,
    primary_min_silence: float,
    secondary_min_silence: float,
    pad_head_ms: int,
    pad_tail_ms: int,
    head_safety_ms: int,
    tail_safety_ms: int,
    max_extend_ms: int,
    min_out_ms: int,
    verbose: bool,
) -> tuple[bool, float]:
    """
    Robust auto strategy (smart by default):
    - Detect largest non-silent region using two thresholds (primary conservative, secondary lenient)
    - Extend region toward the lenient boundaries up to max_extend_ms each side
    - Apply asymmetric padding (head/tail) and ensure a minimum output duration
    - Fallback to simple silenceremove if detection fails
    Returns (success, trimmed_ms)
    """
    before = get_duration(in_path)
    if before is None or before <= 0.0:
        return False, 0.0

    region = detect_voice_region_multi(
        in_path,
        threshold_primary=primary_threshold_db,
        threshold_secondary=secondary_threshold_db,
        min_silence_primary=primary_min_silence,
        min_silence_secondary=secondary_min_silence,
        verbose=verbose,
    )

    if region is None:
        # Fallback to simple trim with conservative values
        ok = trim_file(in_path, out_path, threshold_db=primary_threshold_db, min_silence=primary_min_silence, verbose=verbose)
        if not ok:
            return False, 0.0
        after = get_duration(out_path) or before
        return True, max(0.0, (before - after) * 1000.0)

    dur = before
    start, end = region
    # Allow outward extension up to max_extend_ms using the file bounds as limit
    extend = max(0, max_extend_ms) / 1000.0
    start = max(0.0, start - extend)
    end = min(dur, end + extend)

    # Apply asymmetric padding
    pad_h = max(0, pad_head_ms) / 1000.0
    pad_t = max(0, pad_tail_ms) / 1000.0
    start = max(0.0, start - pad_h)
    end = min(dur, end + pad_t)

    # Apply safety margins (stronger than extension caps)
    safe_h = max(0, head_safety_ms) / 1000.0
    safe_t = max(0, tail_safety_ms) / 1000.0
    start = max(0.0, start - safe_h)
    end = min(dur, end + safe_t)

    # Enforce minimum output length by expanding toward available bounds
    min_out_s = max(0, min_out_ms) / 1000.0
    if end - start < min_out_s:
        deficit = min_out_s - (end - start)
        # Try to extend half on each side
        left = min(start, deficit / 2.0)
        right = min(dur - end, deficit - left)
        start -= left
        end += right
        # If still short, extend whichever side has room
        if end - start < min_out_s:
            more = min_out_s - (end - start)
            room_left = start
            room_right = dur - end
            if room_right >= room_left:
                add = min(room_right, more)
                end += add
            else:
                add = min(room_left, more)
                start -= add

    if end <= start:
        return False, 0.0

    # Perform precise trim via atrim
    base_dir = os.path.dirname(out_path) or os.path.dirname(in_path) or '.'
    tmp_out = _tmp_path(base_dir, os.path.basename(out_path))
    try:
        af = f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS"
        cmd = [
            FFMPEG, '-hide_banner', '-y',
            '-i', in_path,
            '-ac', '1', '-ar', '22050',
            '-af', af,
            '-codec:a', 'libmp3lame', '-q:a', '2',
            tmp_out,
        ]
        stdout = None if verbose else subprocess.DEVNULL
        stderr = None if verbose else subprocess.DEVNULL
        subprocess.run(cmd, check=True, stdout=stdout, stderr=stderr)
        os.replace(tmp_out, out_path)
        after = get_duration(out_path) or dur
        trimmed_ms = max(0.0, (dur - after) * 1000.0)
        return True, trimmed_ms
    except Exception as e:
        print(f'Failed robust auto trim {in_path}: {e}')
        try:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
        except Exception:
            pass
        # Final fallback to simple trim
        ok = trim_file(in_path, out_path, threshold_db=primary_threshold_db, min_silence=primary_min_silence, verbose=verbose)
        if not ok:
            return False, 0.0
        after = get_duration(out_path) or before
        return True, max(0.0, (before - after) * 1000.0)


def trim_fixed(in_path: str, out_path: str, *, start_ms: int, end_ms: int, verbose: bool) -> tuple[bool, float]:
    """
    Trim a fixed amount from start and end using accurate seeking (-ss after -i) and -t duration.
    Returns (success, trimmed_ms_total).
    Safeguard: if resulting duration would be < 0.18s, clamp to 0.18s.
    """
    before = get_duration(in_path)
    if before is None:
        return False, 0.0


def detect_voice_region(in_path: str, *, threshold_db: float, min_silence: float, verbose: bool) -> Optional[tuple[float, float]]:
    """
    Use ffmpeg silencedetect to find silent intervals; return the largest non-silent segment as (start, end).
    """
    dur = get_duration(in_path)
    if dur is None or dur <= 0.0:
        return None

    th = f"{threshold_db}dB"
    cmd = [
        FFMPEG, '-hide_banner', '-nostats', '-i', in_path,
        '-af', f'silencedetect=n={th}:d={min_silence}',
        '-f', 'null', '-'
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        log = proc.stderr
    except subprocess.CalledProcessError as e:
        # Even on success, ffmpeg may return non-zero; still parse stderr
        log = (e.stderr or '') + '\n' + (e.stdout or '')
    except Exception:
        return None

    import re
    re_start = re.compile(r'silence_start:\s*([0-9]+\.?[0-9]*)')
    re_end = re.compile(r'silence_end:\s*([0-9]+\.?[0-9]*)')
    silent: List[tuple[float, float]] = []
    stack: List[float] = []
    for line in log.splitlines():
        m1 = re_start.search(line)
        if m1:
            try:
                stack.append(float(m1.group(1)))
            except Exception:
                pass
            continue
        m2 = re_end.search(line)
        if m2 and stack:
            try:
                s = stack.pop(0)
                e = float(m2.group(1))
                if 0.0 <= s < e <= dur + 1.0:
                    silent.append((s, e))
            except Exception:
                pass

    silent.sort()
    # Build non-silent segments from silent intervals
    non_silent: List[tuple[float, float]] = []
    cur = 0.0
    for s, e in silent:
        if s > cur:
            non_silent.append((cur, min(s, dur)))
        cur = max(cur, e)
    if cur < dur:
        non_silent.append((cur, dur))

    # Filter out tiny segments (< 0.05s)
    non_silent = [(a, b) for (a, b) in non_silent if (b - a) >= 0.05]
    if not non_silent:
        # Fallback: use whole file
        return (0.0, dur)

    # Choose largest segment
    a, b = max(non_silent, key=lambda t: (t[1] - t[0]))
    return (max(0.0, a), min(dur, b))


def detect_voice_region_multi(
    in_path: str,
    *,
    threshold_primary: float,
    threshold_secondary: float,
    min_silence_primary: float,
    min_silence_secondary: float,
    verbose: bool,
) -> Optional[tuple[float, float]]:
    """
    Run silencedetect with two thresholds and combine results:
    - Primary: more conservative; defines core region
    - Secondary: more lenient; allows small extensions to catch soft consonants/tails
    Returns (start, end) or None.
    """
    r1 = detect_voice_region(in_path, threshold_db=threshold_primary, min_silence=min_silence_primary, verbose=verbose)
    r2 = detect_voice_region(in_path, threshold_db=threshold_secondary, min_silence=min_silence_secondary, verbose=verbose)
    dur = get_duration(in_path)
    if dur is None:
        return None
    if r1 is None and r2 is None:
        return None
    if r1 is None:
        return r2
    if r2 is None:
        return r1
    a1, b1 = r1
    a2, b2 = r2
    # Combine by taking min start and max end (final limits/extension handled by caller)
    return (max(0.0, min(a1, a2)), min(dur, max(b1, b2)))


def trim_smart(in_path: str, out_path: str, *, threshold_db: float, min_silence: float, pad_ms: int, verbose: bool) -> tuple[bool, float]:
    """
    Detect largest speech region, pad a little, and trim precisely to those bounds.
    """
    dur = get_duration(in_path)
    if dur is None or dur <= 0.0:
        return False, 0.0
    region = detect_voice_region(in_path, threshold_db=threshold_db, min_silence=min_silence, verbose=verbose)
    if region is None:
        return False, 0.0
    start, end = region
    pad = max(0, pad_ms) / 1000.0
    start = max(0.0, start - pad)
    end = min(dur, end + pad)
    if end <= start:
        return False, 0.0

    # Use atrim to cut exact bounds, with temp file replace
    base_dir = os.path.dirname(out_path) or os.path.dirname(in_path) or '.'
    tmp_out = _tmp_path(base_dir, os.path.basename(out_path))
    try:
        af = f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS"
        cmd = [
            FFMPEG, '-hide_banner', '-y',
            '-i', in_path,
            '-ac', '1', '-ar', '22050',
            '-af', af,
            '-codec:a', 'libmp3lame', '-q:a', '2',
            tmp_out,
        ]
        stdout = None if verbose else subprocess.DEVNULL
        stderr = None if verbose else subprocess.DEVNULL
        subprocess.run(cmd, check=True, stdout=stdout, stderr=stderr)
        os.replace(tmp_out, out_path)
        after = get_duration(out_path) or dur
        trimmed_ms = max(0.0, (dur - after) * 1000.0)
        return True, trimmed_ms
    except Exception as e:
        print(f'Failed smart trim {in_path}: {e}')
        try:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
        except Exception:
            pass
    return False, 0.0
    start_s = max(0.0, start_ms / 1000.0)
    end_s = max(0.0, end_ms / 1000.0)
    # Initial target duration
    target = max(0.0, before - start_s - end_s)
    min_out = 0.18
    # Ensure we have a sensible target duration
    if target < min_out:
        target = min_out
    # Clamp start so start + target <= before
    if start_s + target > before:
        start_s = max(0.0, before - target)
    # If file is still too short, fallback to tiny slice or silence
    if target <= 0.0 or start_s >= before:
        # Write a tiny silence instead of failing
        return generate_silence(out_path), max(0.0, (before * 1000.0))

    # Never write to the same file we're reading from; use temp and replace
    base_dir = os.path.dirname(out_path) or os.path.dirname(in_path) or '.'
    tmp_out = _tmp_path(base_dir, os.path.basename(out_path))

    try:
        cmd = [
            FFMPEG,
            '-hide_banner', '-y',
            '-i', in_path,
            '-ac', '1', '-ar', '22050',
            '-ss', f'{start_s}',
            '-t', f'{target}',
            '-codec:a', 'libmp3lame', '-q:a', '2',
            tmp_out,
        ]
        stdout = None if verbose else subprocess.DEVNULL
        stderr = None if verbose else subprocess.DEVNULL
        subprocess.run(cmd, check=True, stdout=stdout, stderr=stderr)
        # Replace destination atomically
        os.replace(tmp_out, out_path)
        after = get_duration(out_path) or before
        trimmed_ms = max(0.0, (before - after) * 1000.0)
        return True, trimmed_ms
    except Exception as e:
        print(f'Failed fixed trim {in_path}: {e}')
        try:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
        except Exception:
            pass
        return False, 0.0


def find_source(word: str) -> Optional[str]:
    for base in SOURCE_DIRS:
        for ext in ('.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg'):
            p = os.path.join(base, f'{word}{ext}')
            if os.path.isfile(p):
                return p
    return None


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def trim_file(in_path: str, out_path: str, *, threshold_db: float, min_silence: float, verbose: bool = False) -> bool:
    """
    Trim leading and trailing silence from an audio file using ffmpeg's silenceremove.
    Writes MP3 mono 22050Hz. Returns True if succeeded.
    """
    try:
        th = f"{threshold_db}dB"
        ms = f"{min_silence}"
        # Use start/stop options in a single pass; trims both ends without areverse
        af = (
            f"silenceremove="
            f"start_periods=1:start_duration={ms}:start_threshold={th}:"
            f"stop_periods=1:stop_duration={ms}:stop_threshold={th}"
        )
        cmd = [
            FFMPEG,
            '-hide_banner',
            '-y',
            '-i', in_path,
            '-ac', '1', '-ar', '22050',
            '-af', af,
            '-codec:a', 'libmp3lame', '-q:a', '2',
            out_path,
        ]
        stdout = None if verbose else subprocess.DEVNULL
        stderr = None if verbose else subprocess.DEVNULL
        subprocess.run(cmd, check=True, stdout=stdout, stderr=stderr)
        return True
    except Exception as e:
        print(f'Failed to trim {in_path}: {e}')
        return False


def generate_silence(out_path: str, duration_sec: float = 0.15) -> bool:
    """
    Generate a short silent MP3 as a placeholder (mono 22050Hz).
    """
    try:
        cmd = [
            FFMPEG, '-y', '-f', 'lavfi', '-i', f'anullsrc=r=22050:cl=mono', '-t', f'{duration_sec}',
            '-codec:a', 'libmp3lame', '-q:a', '2', out_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f'Failed to generate silence {out_path}: {e}')
        return False


def do_trim_all(*, threshold_db: float, min_silence: float, verbose: bool, fixed_start_ms: Optional[int] = None, fixed_end_ms: Optional[int] = None, smart: bool = False, pad_ms: int = 20,
                secondary_threshold_db: Optional[float] = None, secondary_min_silence: Optional[float] = None,
                pad_head_ms: Optional[int] = None, pad_tail_ms: Optional[int] = None,
                head_safety_ms: int = 0, tail_safety_ms: int = 100,
                max_extend_ms: int = 20, min_out_ms: int = 180) -> int:
    ensure_dir(AUDIO_DIR)
    count = 0
    for name in os.listdir(AUDIO_DIR):
        if not name.lower().endswith('.mp3'):
            continue
        src = os.path.join(AUDIO_DIR, name)
        if fixed_start_ms is not None or fixed_end_ms is not None:
            s = fixed_start_ms or 0
            e = fixed_end_ms or 0
            ok, delta_ms = trim_fixed(src, src, start_ms=s, end_ms=e, verbose=verbose)
        elif smart:
            ok, delta_ms = trim_smart(src, src, threshold_db=threshold_db, min_silence=min_silence, pad_ms=pad_ms, verbose=verbose)
        else:
            ok, delta_ms = trim_auto(
                src, src,
                primary_threshold_db=threshold_db,
                secondary_threshold_db=secondary_threshold_db if secondary_threshold_db is not None else (threshold_db - 10.0),
                primary_min_silence=min_silence,
                secondary_min_silence=secondary_min_silence if secondary_min_silence is not None else max(0.005, min_silence * 0.75),
                pad_head_ms=pad_head_ms if pad_head_ms is not None else pad_ms,
                pad_tail_ms=pad_tail_ms if pad_tail_ms is not None else pad_ms,
                head_safety_ms=head_safety_ms,
                tail_safety_ms=tail_safety_ms,
                max_extend_ms=max_extend_ms,
                min_out_ms=min_out_ms,
                verbose=verbose,
            )
        if ok:
            count += 1
            print(f'Trimmed: {name} (-{delta_ms:.0f} ms)')
    print(f'Finished trimming {count} files')
    return 0


def do_ensure(words: List[str], *, threshold_db: float, min_silence: float, verbose: bool, fixed_start_ms: Optional[int] = None, fixed_end_ms: Optional[int] = None, smart: bool = False, pad_ms: int = 20,
              secondary_threshold_db: Optional[float] = None, secondary_min_silence: Optional[float] = None,
              pad_head_ms: Optional[int] = None, pad_tail_ms: Optional[int] = None,
              head_safety_ms: int = 0, tail_safety_ms: int = 100,
              max_extend_ms: int = 20, min_out_ms: int = 180) -> int:
    ensure_dir(AUDIO_DIR)
    created = 0
    for w in words:
        out = os.path.join(AUDIO_DIR, f'{w}.mp3')
        if os.path.isfile(out):
            # Optionally trim existing
            if fixed_start_ms is not None or fixed_end_ms is not None:
                s = fixed_start_ms or 0
                e = fixed_end_ms or 0
                ok, delta_ms = trim_fixed(out, out, start_ms=s, end_ms=e, verbose=verbose)
            elif smart:
                ok, delta_ms = trim_smart(out, out, threshold_db=threshold_db, min_silence=min_silence, pad_ms=pad_ms, verbose=verbose)
            else:
                ok, delta_ms = trim_auto(
                    out, out,
                    primary_threshold_db=threshold_db,
                    secondary_threshold_db=secondary_threshold_db if secondary_threshold_db is not None else (threshold_db - 10.0),
                    primary_min_silence=min_silence,
                    secondary_min_silence=secondary_min_silence if secondary_min_silence is not None else max(0.005, min_silence * 0.75),
                    pad_head_ms=pad_head_ms if pad_head_ms is not None else pad_ms,
                    pad_tail_ms=pad_tail_ms if pad_tail_ms is not None else pad_ms,
                    head_safety_ms=head_safety_ms,
                    tail_safety_ms=tail_safety_ms,
                    max_extend_ms=max_extend_ms,
                    min_out_ms=min_out_ms,
                    verbose=verbose,
                )
            if ok:
                print(f'Ensured (trimmed existing): {w}.mp3 (-{delta_ms:.0f} ms)')
            else:
                print(f'Exists (no change): {w}.mp3')
            continue

        src = find_source(w)
        if src:
            if fixed_start_ms is not None or fixed_end_ms is not None:
                s = fixed_start_ms or 0
                e = fixed_end_ms or 0
                ok, delta_ms = trim_fixed(src, out, start_ms=s, end_ms=e, verbose=verbose)
            elif smart:
                ok, delta_ms = trim_smart(src, out, threshold_db=threshold_db, min_silence=min_silence, pad_ms=pad_ms, verbose=verbose)
            else:
                ok, delta_ms = trim_auto(
                    src, out,
                    primary_threshold_db=threshold_db,
                    secondary_threshold_db=secondary_threshold_db if secondary_threshold_db is not None else (threshold_db - 10.0),
                    primary_min_silence=min_silence,
                    secondary_min_silence=secondary_min_silence if secondary_min_silence is not None else max(0.005, min_silence * 0.75),
                    pad_head_ms=pad_head_ms if pad_head_ms is not None else pad_ms,
                    pad_tail_ms=pad_tail_ms if pad_tail_ms is not None else pad_ms,
                    head_safety_ms=head_safety_ms,
                    tail_safety_ms=tail_safety_ms,
                    max_extend_ms=max_extend_ms,
                    min_out_ms=min_out_ms,
                    verbose=verbose,
                )
            if ok:
                created += 1
                print(f'Created from source: {w}.mp3 (trimmed {delta_ms:.0f} ms)')
            else:
                print(f'Failed to create from source: {w}')
        else:
            if generate_silence(out):
                created += 1
                print(f'Created placeholder (silence): {w}.mp3')
            else:
                print(f'Failed to create placeholder: {w}')

    print(f'Ensure completed. Created {created} file(s).')
    return 0


def main() -> int:
    if not have_ffmpeg():
        print('ffmpeg not found in PATH. Please install ffmpeg to use this script.')
        return 1

    parser = argparse.ArgumentParser(description='Prepare audio clips: trim silence and ensure required words exist.')
    # Support both subcommands and a convenience flag for PowerShell users
    parser.add_argument('--trim-all', action='store_true', help='Alias: trim all MP3s (same as subcommand "trim-all")')
    parser.add_argument('--threshold-db', type=float, default=-40.0, help='Silence threshold in dB (e.g., -35). Default: -40 (auto mode)')
    parser.add_argument('--min-silence', type=float, default=0.01, help='Minimum silence duration in seconds. Default: 0.01 (auto mode)')
    parser.add_argument('--smart', action='store_true', help='Use smart detection (silencedetect) to find the largest speech region and trim to it')
    parser.add_argument('--pad-ms', type=int, default=20, help='Padding in ms to add before/after the detected region (smart/auto)')
    # Robust auto parameters
    parser.add_argument('--secondary-threshold-db', type=float, default=None, help='Secondary (more sensitive) silence threshold in dB for auto mode; default: primary-10dB')
    parser.add_argument('--secondary-min-silence', type=float, default=None, help='Secondary minimum silence for auto mode; default: primary*0.75 (min 0.005s)')
    parser.add_argument('--pad-head-ms', type=int, default=None, help='Extra head padding (ms) for auto mode')
    parser.add_argument('--pad-tail-ms', type=int, default=None, help='Extra tail padding (ms) for auto mode')
    parser.add_argument('--max-extend-ms', type=int, default=20, help='Max outward extension (ms) allowed after detection in auto mode')
    parser.add_argument('--min-out-ms', type=int, default=180, help='Minimum output duration (ms) to avoid overcuts in auto mode')
    parser.add_argument('--head-safety-ms', type=int, default=0, help='Extra safety margin at the start (ms) in auto mode to avoid cutting initial phonemes')
    parser.add_argument('--tail-safety-ms', type=int, default=100, help='Extra safety margin at the end (ms) in auto mode to avoid cutting trailing vowels/decays')
    # Fixed-trim mode: trim a fixed amount from start and end (in ms). If provided, overrides auto mode
    parser.add_argument('--fixed-trim-ms', type=int, default=None, help='Trim this many ms from both start and end (overrides auto mode)')
    parser.add_argument('--fixed-start-ms', type=int, default=None, help='Trim this many ms from start (overrides auto mode)')
    parser.add_argument('--fixed-end-ms', type=int, default=None, help='Trim this many ms from end (overrides auto mode)')
    parser.add_argument('--verbose', action='store_true', help='Show ffmpeg output and filter decisions')
    sub = parser.add_subparsers(dest='cmd', required=False)

    sub.add_parser('trim-all', help='Trim leading/trailing silence from all MP3s in public/audio')

    p_ensure = sub.add_parser('ensure', help='Ensure specified words have audio (trim from source or create placeholder)')
    p_ensure.add_argument('words', nargs='+', help='Words to ensure exist as MP3 in public/audio (e.g., cananvalle santamaria)')

    args = parser.parse_args()

    # Route to trim when either subcommand is used or the flag is present
    # Resolve fixed trim values if provided
    fixed_start = args.fixed_start_ms
    fixed_end = args.fixed_end_ms
    if args.fixed_trim_ms is not None:
        fixed_start = args.fixed_trim_ms if fixed_start is None else fixed_start
        fixed_end = args.fixed_trim_ms if fixed_end is None else fixed_end

    if args.cmd == 'trim-all' or args.trim_all:
        return do_trim_all(
            threshold_db=args.threshold_db,
            min_silence=args.min_silence,
            verbose=args.verbose,
            fixed_start_ms=fixed_start,
            fixed_end_ms=fixed_end,
            smart=args.smart,
            pad_ms=args.pad_ms,
            secondary_threshold_db=args.secondary_threshold_db,
            secondary_min_silence=args.secondary_min_silence,
            pad_head_ms=args.pad_head_ms,
            pad_tail_ms=args.pad_tail_ms,
            head_safety_ms=args.head_safety_ms,
            tail_safety_ms=args.tail_safety_ms,
            max_extend_ms=args.max_extend_ms,
            min_out_ms=args.min_out_ms,
        )
    if args.cmd == 'ensure':
        return do_ensure(
            args.words,
            threshold_db=args.threshold_db,
            min_silence=args.min_silence,
            verbose=args.verbose,
            fixed_start_ms=fixed_start,
            fixed_end_ms=fixed_end,
            smart=args.smart,
            pad_ms=args.pad_ms,
            secondary_threshold_db=args.secondary_threshold_db,
            secondary_min_silence=args.secondary_min_silence,
            pad_head_ms=args.pad_head_ms,
            pad_tail_ms=args.pad_tail_ms,
            head_safety_ms=args.head_safety_ms,
            tail_safety_ms=args.tail_safety_ms,
            max_extend_ms=args.max_extend_ms,
            min_out_ms=args.min_out_ms,
        )

    # If nothing matched, show help and return error code
    parser.print_help()
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
