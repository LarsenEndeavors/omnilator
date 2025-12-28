# Omnilator - Web SNES Emulator

A browser-based SNES emulator built with React, TypeScript, and Vite, powered by LibRetro cores.

## Features

- 🎮 **LibRetro Core Integration**: Full SNES emulation using libretro API
- 🖼️ **Canvas Rendering**: 60 FPS hardware-accelerated rendering with requestAnimationFrame
- ⌨️ **Input Support**: Keyboard and Gamepad API with full SNES controller mapping
- 🔊 **Low-Latency Audio**: WebAudio API with AudioWorklet processor
- 💾 **Save States**: 4-slot save/load state system
- 📁 **ROM Loading**: Support for .smc and .sfc ROM files
- 🎨 **Modern UI**: Responsive design with real-time stats display
- 🔄 **Automatic Fallback**: Demo mode when cores are unavailable

## Quick Start

### Installation

```bash
npm install
```

### Running in Demo Mode

The emulator includes a demo mode that works without additional setup:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You'll see a demo with animated gradient pattern and button indicators.

### Setting Up Real Emulation

To enable actual SNES ROM emulation, you need to download a LibRetro core:

#### Step 1: Download LibRetro Core

Download the SNES core from [LibRetro buildbot](https://buildbot.libretro.com/stable/latest/emscripten/):

```bash
# Create cores directory
mkdir -p public/cores

# Download snes9x core (recommended)
cd public/cores
curl -O https://buildbot.libretro.com/stable/latest/emscripten/snes9x_libretro.js
curl -O https://buildbot.libretro.com/stable/latest/emscripten/snes9x_libretro.wasm
```

**Available cores:**
- `snes9x_libretro` - Fast, accurate (recommended)
- `bsnes_libretro` - Maximum accuracy, slower
- `mednafen_snes_libretro` - Good balance

#### Step 2: Configure Core Path

Update `src/components/EmulatorScreen.tsx` to use the local core:

```typescript
const [core] = useState(() => new SnesCore('snes9x', '/cores/snes9x_libretro.js'));
```

Or use environment variables (recommended for production):

```typescript
const coreUrl = import.meta.env.VITE_CORE_URL || '/cores/snes9x_libretro.js';
const [core] = useState(() => new SnesCore('snes9x', coreUrl));
```

#### Step 3: Add ROM Files

Place your legally obtained SNES ROM files (.smc or .sfc) in a location accessible to the application. ROMs are not included due to copyright restrictions.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Make sure to include the `cores/` directory when deploying.

## Controls

### Keyboard

- **D-Pad**: Arrow Keys or WASD
- **A Button**: X
- **B Button**: Z
- **X Button**: V
- **Y Button**: C
- **L Button**: Q
- **R Button**: E
- **Start**: Enter
- **Select**: Shift

### Gamepad

Standard gamepad mapping is supported with automatic detection. Connect a gamepad and press any button to activate.

## Architecture

### Core Components

- **IEmulatorCore**: Interface defining emulator operations (loadROM, runFrame, getBuffer, etc.)
- **LibRetroCore**: Complete libretro API implementation (1,001 lines)
  - WASM module loading and initialization
  - Video refresh with pixel format conversion (RGB565/XRGB8888/RGB1555 → RGBA)
  - Audio sample handling (int16 → float32)
  - Input state management for 4 controller ports
  - Save state serialization/deserialization
- **SnesCore**: SNES-specific wrapper around LibRetroCore
- **MockSnesCore**: Demo implementation for fallback mode
- **EmulatorScreen**: Main React component with canvas and controls
- **useEmulator**: Custom hook managing the rendering loop
- **useInput**: Custom hook for keyboard and gamepad input
- **AudioSystem**: WebAudio-based audio streaming system

### How It Works

1. **Initialization**: `SnesCore` attempts to load the LibRetro WASM core
2. **Fallback**: If core loading fails, automatically switches to `MockSnesCore`
3. **ROM Loading**: User loads ROM file through UI, data passed to core
4. **Emulation Loop**: 60 FPS loop calls `runFrame()` on the core
5. **Rendering**: Core returns video frame (ImageData) and audio samples
6. **Display**: Canvas renders frame, WebAudio plays samples

### Automatic Fallback Mode

If the LibRetro core fails to load (network issues, CORS, missing files), the emulator automatically falls back to demo mode:

- ✅ Works without network access
- ✅ Shows animated gradient pattern
- ✅ Displays button press indicators
- ✅ Shows clear "DEMO MODE" banner
- ✅ Provides console warnings with setup instructions

Check if running in mock mode:

```typescript
if (core.isInMockMode()) {
  console.warn('Running in demo mode');
}
```

### Project Structure

```
omnilator/
├── src/
│   ├── core/
│   │   ├── IEmulatorCore.ts      # Core emulator interface
│   │   ├── LibRetroCore.ts       # LibRetro implementation (1,001 lines)
│   │   ├── SnesCore.ts           # SNES wrapper with fallback
│   │   └── MockSnesCore.ts       # Demo implementation
│   ├── components/
│   │   ├── EmulatorScreen.tsx    # Main emulator UI
│   │   └── EmulatorScreen.css    # Styles
│   ├── hooks/
│   │   ├── useEmulator.ts        # Emulator lifecycle hook
│   │   └── useInput.ts           # Input handling hook
│   ├── audio/
│   │   └── AudioSystem.ts        # Audio management
│   └── data/
│       └── games.json            # Game library metadata
├── public/
│   ├── cores/                    # LibRetro cores (download separately)
│   │   ├── snes9x_libretro.js
│   │   └── snes9x_libretro.wasm
│   └── audio-processor.js        # WebAudio worklet
└── docs/
    ├── EMULATOR_INTEGRATION.md   # Integration guide
    └── LIBRETRO_IMPLEMENTATION.md # Technical reference
```

## Documentation

- **[EMULATOR_INTEGRATION.md](docs/EMULATOR_INTEGRATION.md)**: Quick start guide, fallback behavior, and hosting instructions
- **[LIBRETRO_IMPLEMENTATION.md](docs/LIBRETRO_IMPLEMENTATION.md)**: Technical deep dive
  - LibRetro API details
  - Pixel format conversion algorithms
  - Memory management best practices
  - Performance optimization tips
  - Troubleshooting guide

## Testing

### Manual Testing

1. Start the dev server: `npm run dev`
2. Load a ROM file using the file picker
3. Test controls with keyboard or gamepad
4. Try save states (slots 1-4)
5. Test reset and pause/play

### Automated Testing

(Coming soon - see issue #X for test infrastructure setup)

## Deployment

### Static Hosting

Build and deploy the `dist/` folder to any static hosting service:

```bash
npm run build
```

Supported platforms:
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

### Important: Include Cores

Make sure to include the `cores/` directory in your deployment:

```bash
# Example: Copy cores to dist for deployment
cp -r public/cores dist/
```

Or configure your hosting to serve the `cores/` directory from `public/`.

## Technologies

- **React 19**: UI framework
- **TypeScript 5.9**: Type safety
- **Vite 7**: Build tool and dev server
- **LibRetro API**: Emulator core interface
- **WebAudio API**: Low-latency audio with AudioWorklet
- **Canvas API**: Hardware-accelerated rendering
- **Gamepad API**: Controller support

## Performance

- **Target FPS**: 60 (SNES native)
- **Frame Time**: ~16.67ms per frame
- **Audio Latency**: <50ms
- **Memory Usage**: ~5-10 MB (including WASM core)

## Troubleshooting

### Core Won't Load

**Problem**: "Failed to load core" error

**Solutions**:
1. Check that core files exist in `public/cores/`
2. Verify file paths in browser dev tools (Network tab)
3. Check for CORS issues (cores must be served from same origin)
4. Try clearing browser cache
5. Ensure both `.js` and `.wasm` files are present

### Demo Mode Stuck

**Problem**: Always shows "DEMO MODE" even with cores installed

**Solution**: Check core path configuration in `EmulatorScreen.tsx` matches actual file location

### ROM Won't Load

**Problem**: ROM file upload fails or shows errors

**Solutions**:
1. Verify ROM is valid SNES format (.smc or .sfc)
2. Check ROM file size (should be 512KB to 6MB typically)
3. Ensure ROM is not corrupted
4. Try a different ROM file

### Audio Issues

**Problem**: No audio or choppy audio

**Solutions**:
1. Check browser autoplay policies (may require user interaction)
2. Verify WebAudio API support in browser
3. Try adjusting audio buffer size in `AudioSystem.ts`

### Low FPS

**Problem**: Emulator runs below 60 FPS

**Solutions**:
1. Check CPU usage in browser task manager
2. Try the faster `snes9x` core instead of `bsnes`
3. Close other browser tabs
4. Reduce canvas size if on low-end device

## Legal & License

### License

This project is licensed under the MIT License - see LICENSE file for details.

### ROMs and Cores

- **ROMs**: SNES ROM files are copyrighted. Only use ROMs you legally own.
- **Cores**: LibRetro cores have their own licenses:
  - snes9x: Non-commercial license
  - bsnes: GPLv3
  - mednafen: GPLv2

Ensure you comply with all applicable licenses when using or distributing this software.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Resources

- [LibRetro Documentation](https://docs.libretro.com/)
- [LibRetro Core Buildbot](https://buildbot.libretro.com/stable/latest/emscripten/)
- [SNES Development Manual](https://problemkaputt.de/fullsnes.htm)
- [Emscripten Documentation](https://emscripten.org/docs/)

## Acknowledgments

- LibRetro team for the standardized emulator API
- snes9x developers for the excellent SNES emulator
- Emscripten team for WebAssembly compilation tools

---

**Note**: This emulator is for educational and preservation purposes. Always respect copyright laws and only use ROM files you legally own.

