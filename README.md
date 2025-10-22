# Rose Tracker

A Progressive Web App (PWA) for tracking rose phenological observations using voice commands in Spanish. Built for field work with offline support and GPS location tracking.

## Features

### 🎤 Voice Recognition
- **Offline voice recognition** using Vosk with Spanish language model
- **Natural Spanish commands** for hands-free data entry in the field
- **Multi-command support** - process multiple commands in one voice input
- **Smart command parsing** - understands location hierarchy and observation types

### 📍 Location Tracking
- **GPS capture** for every observation with coordinates, accuracy, and altitude
- **Hierarchical location system** - Finca → Bloque → Cama
- **Visual feedback** with color-coded tiles showing input status
- **Manual input fallback** - click tiles to enter values when voice isn't available

### 📊 Observation Management
- **Five phenological stages**: Arroz, Arveja, Garbanzo, Color, Abierto
- **Real-time quantity tracking** with visual confirmation
- **Observation history** - view all entries organized by date and location
- **Individual GPS viewing** for each observation
- **Undo commands** - general undo or undo specific observation types

### 🔄 Data Synchronization
- **Offline-first architecture** - all data stored locally in browser
- **Supabase backend sync** - upload observations when online
- **Progress tracking** - visual progress bar shows sync status per location
- **Retry on failure** - automatic retry for failed uploads
- **Batch operations** - sync or delete all observations for a location

### 🎨 User Experience
- **Multi-modal feedback**:
  - Visual: Blue flash on tiles, color-coded status (green/red/amber)
  - Audio: Unique tone frequencies for each command type
  - Haptic: Vibration patterns for mobile devices
- **Dark theme** optimized for field use
- **Responsive design** works on phones, tablets, and desktops
- **PWA support** - install on home screen, works offline

## Voice Commands

### Location Commands
```
finca [number/letter]    # Set farm (e.g., "finca 1", "finca a")
bloque [number]          # Set block (e.g., "bloque 5")
cama [number]            # Set bed (e.g., "cama 12")
```

### Observation Commands
```
arroz [number]           # Record rice stage count
arveja [number]          # Record pea stage count
garbanzo [number]        # Record chickpea stage count
color [number]           # Record color stage count
abierto [number]         # Record open stage count
```

### Undo Commands
```
borrar                   # Undo last observation (any type)
borrar ultimo arroz      # Delete last arroz in current location
borrar ultimo arveja     # Delete last arveja in current location
borrar ultimo garbanzo   # Delete last garbanzo in current location
borrar ultimo color      # Delete last color in current location
borrar ultimo abierto    # Delete last abierto in current location
```

### Navigation
```
observaciones            # Go to observations page
```

### Multi-Command Example
```
"finca 1 bloque 2 cama 5 arroz 10"
```
This single voice input sets the location and records an observation.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS 4
- **Voice**: Vosk Browser (offline Spanish recognition)
- **Audio Feedback**: Web Audio API
- **Haptic Feedback**: Vibration API
- **Backend**: Supabase (PostgreSQL + REST API)
- **PWA**: Vite PWA Plugin with Workbox
- **Build**: Vite 6

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rose-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional - has defaults):
```bash
cp .env.example .env
# Edit .env with your Supabase credentials if needed
```

4. Start development server:
```bash
npm run dev
```

5. Open browser and grant microphone + location permissions when prompted

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready to deploy.

## Database Schema

The app expects the following Supabase tables:

### Core Tables
- **finca** - Farms (id_finca, nombre)
- **bloque** - Blocks within farms (id_bloque, nombre, id_finca)
- **cama** - Beds for growing (id_cama, nombre, linked via grupo_cama)
- **grupo_cama** - Bed groups (id_grupo, id_bloque, id_variedad)

### Observation Tables
- **observacion** - Field observations (id_observacion, id_cama, tipo_observacion, cantidad, id_punto_gps, creado_en)
- **puntos_gps** - GPS points (id, latitud, longitud, precision, altitud, creado_en)
- **estados_fenologicos** - Phenological states reference
- **observaciones_tipo** - Master list of valid observation codes (codigo)
- **estado_fenologico_orden** - Ordering for phenological stages (codigo_observacion, orden)

### Observation Type Restructure (Oct 2025)

The legacy `estado_fenologico_tipo` table has been replaced by the new `observaciones_tipo` and `estado_fenologico_orden` tables. The app now fetches and caches this data via `observationTypeService`, surfaces it in the Control de Calidad dashboard, and validates every observation before syncing to ensure the referenced code exists in Supabase.

### Supporting Tables
- **variedad** - Plant varieties with color info
- **usuario** - Users with PIN codes
- **sync** - Sync tracking (id, created_at, tables)

## Audio Generation (Optional)

Python utilities for generating Spanish number audio via ElevenLabs TTS:

### Setup
1. Copy `.env.example` to `.env` and set `ELEVENLABS_API_KEY`
2. Create virtual environment (optional)
3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Generate Numbers (0-300)
```bash
python scripts/generate_numbers_audio.py
```

Creates `public/audio/numbers/<n>.mp3` files. Existing files are skipped; use `--force` to overwrite.

### Partial Range
```bash
python scripts/generate_numbers_audio.py --start 170 --end 180
```

### Demo Playback
```bash
python scripts/voice.py
```

## Project Structure

```
rose-tracker/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── TileButton.tsx
│   │   └── AudioVisualizer.tsx
│   ├── routes/          # TanStack Router pages
│   │   ├── index.tsx    # Main voice input page
│   │   └── observaciones.tsx  # Observations list
│   ├── hooks/           # Custom React hooks
│   │   └── useVosk.ts   # Voice recognition hook
│   ├── lib/             # Utilities
│   │   ├── commandEngine.ts  # Voice command parser
│   │   ├── spanishNumbers.ts # Number parsing
│   │   └── supabase.ts       # Supabase client
│   ├── services/        # API services
│   │   └── supabaseService.ts
│   └── types.ts         # TypeScript types
├── scripts/             # Python utilities
│   ├── generate_numbers_audio.py
│   ├── spanish_numbers.py
│   └── voice.py
└── public/
    ├── audio/           # Generated audio files
    └── vosk-model/      # Vosk Spanish model
```

## Browser Permissions

The app requires:
- **Microphone** - for voice recognition
- **Location (GPS)** - for recording observation coordinates

Both permissions are requested when you click the microphone button to start.

## Offline Support

- **Voice recognition** works completely offline via Vosk
- **All data** stored in browser localStorage
- **Service worker** caches app for offline use
- **Sync when online** - upload observations when connection available

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Files

- `vite.config.ts` - Vite configuration with PWA settings
- `src/lib/commandEngine.ts` - Voice command parsing logic
- `src/routes/index.tsx` - Main voice input interface
- `src/routes/observaciones.tsx` - Observations list and sync
- `src/services/supabaseService.ts` - Backend sync logic

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Acknowledgments

- Vosk for offline speech recognition
- Supabase for backend infrastructure
- TanStack for routing
- shadcn/ui for component primitives
