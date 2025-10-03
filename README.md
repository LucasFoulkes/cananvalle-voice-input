## Rose Tracker / Voice Assets

This project now includes Python utilities to generate Spanish number audio (0..300) via ElevenLabs TTS.

### Setup

1. Copy `.env.example` to `.env` and set `ELEVENLABS_API_KEY`.
2. (Optional) Create a virtual environment.
3. Install deps:
	```
	pip install -r requirements.txt
	```

### Generate numbers 0..300

```
python scripts/generate_numbers_audio.py
```

Creates `public/audio/numbers/<n>.mp3`. Existing files are skipped; use `--force` to overwrite.

### Components (experimental)

```
python scripts/generate_numbers_audio.py --components
```

Adds `public/audio/numbers/components/` with tens, tens+' y', and unit clips for possible concatenation. Full-number clips usually sound more natural.

### Partial range

```
python scripts/generate_numbers_audio.py --start 170 --end 180
```

### Demo playback

```
python scripts/voice.py
```

### Number construction examples

* 36 => "treinta y seis" (tens 30 + y + unit 6)
* 175 => "ciento setenta y cinco" ("ciento" + 70 + y + 5)
* 221 => "doscientos veintiuno" (200 + fused 21 form "veintiuno")

### Extending beyond 300

Currently limited to 300. To extend add: 400="cuatrocientos", 500="quinientos", 600="seiscientos", 700="setecientos", 800="ochocientos", 900="novecientos", plus 301..999 pattern logic; then thousands (1000="mil"). Keep special accent marks ("dieciséis", "veintidós", etc.).

### Notes

* Do NOT commit real `.env`.
* Regeneration costs API credits; incremental design avoids unnecessary calls.
* Voice/model IDs are currently constants—parameterize if you need variants.

### TODO

* Improve architecture (original note: "fix architecuture").
* Add caching/manifest with text hash to detect changes.
* Add tests for `number_to_spanish` beyond 100 when extended.