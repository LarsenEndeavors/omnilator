# Omnilator - Browser-Based SNES Emulator

A modern web-based SNES emulator built with React, TypeScript, and WebAssembly. Play classic SNES games directly in your browser with no installation required.

## Features

- 🎮 **SNES9x WASM Core**: Real SNES emulation using snes9x2005 core from Emulatrix
- 🖼️ **60 FPS Rendering**: Hardware-accelerated canvas rendering
- ⌨️ **Full Input Support**: Keyboard and gamepad with complete SNES controller mapping
- 🔊 **Low-Latency Audio**: WebAudio API with AudioWorklet processor
- 💾 **Save States**: 4-slot save/load system for your progress
- 📁 **ROM Loading**: Supports .smc and .sfc ROM files
- 🎨 **Modern UI**: Clean, responsive interface with real-time FPS counter

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The built files will be in the `dist/` directory.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test:coverage

# Run tests in watch mode (for development)
npm test -- --watch
```

### Loading ROMs

1. Click "📁 Load ROM" button
2. Select a .smc or .sfc ROM file from your computer
3. Click "▶️ Play" to start emulation

**Note**: Only use ROM files you legally own. ROMs are copyrighted material.

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
- **Snes9xWasmCore**: WASM module wrapper that loads and communicates with the snes9x2005 core
- **SnesCore**: High-level SNES emulator interface that wraps Snes9xWasmCore
- **EmulatorScreen**: Main React component with canvas, controls, and save state management
- **useEmulator**: Custom hook managing the 60 FPS rendering loop
- **useInput**: Custom hook for keyboard and gamepad input handling
- **AudioSystem**: WebAudio-based audio streaming with AudioWorklet support

### How It Works

1. **Initialization**: `SnesCore` loads the snes9x2005 WASM module from `/cores/snes9x_2005.js`
2. **Module Loading**: Emscripten's Module pattern initializes the WASM with proper file paths
3. **ROM Loading**: User selects ROM file, data is uploaded to WASM memory heap
4. **Emulation Loop**: 60 FPS loop calls `runFrame()` which executes one frame in the WASM core
5. **Rendering**: Core writes video buffer (512x448 RGBA) and audio samples to memory
6. **Display**: Canvas renders the frame, WebAudio plays the audio samples

### Project Structure

```
omnilator/
├── src/
│   ├── core/
│   │   ├── IEmulatorCore.ts         # Core emulator interface
│   │   ├── Snes9xWasmCore.ts        # WASM module wrapper
│   │   ├── SnesCore.ts              # SNES-specific wrapper
│   │   └── types/                   # TypeScript type definitions
│   ├── components/
│   │   ├── EmulatorScreen.tsx       # Main emulator UI
│   │   └── EmulatorScreen.css       # Styles
│   ├── hooks/
│   │   ├── useEmulator.ts           # Emulator lifecycle hook
│   │   └── useInput.ts              # Input handling hook
│   ├── audio/
│   │   └── AudioSystem.ts           # Audio management
│   └── data/
│       └── games.json               # Game metadata
├── public/
│   ├── cores/
│   │   ├── snes9x_2005.js           # Emscripten glue code
│   │   ├── snes9x_2005.wasm         # SNES9x WASM binary
│   │   └── Emulatrix/               # Additional cores from Emulatrix
│   └── audio-processor.js           # WebAudio worklet
└── docs/
    ├── EMULATOR_INTEGRATION.md      # Integration guide
    ├── PROJECT_ROADMAP.md           # Development roadmap
    └── QUICK_START_GUIDE.md         # Quick start for developers
```

## Technologies

- **React 19**: UI framework
- **TypeScript 5.9**: Type safety
- **Vite 7**: Build tool and dev server
- **SNES9x (2005 port)**: Emulator core from Emulatrix
- **Emscripten**: WebAssembly compilation
- **WebAudio API**: Low-latency audio with AudioWorklet
- **Canvas API**: Hardware-accelerated rendering
- **Gamepad API**: Controller support

## Performance

- **Target FPS**: 60 (SNES native refresh rate)
- **Frame Time**: ~16.67ms per frame
- **Audio Latency**: <50ms
- **Video Resolution**: 512x448 RGBA (upscaled from native 256x224)
- **Memory Usage**: ~5-10 MB (including WASM core)

## Troubleshooting

### Build Fails

**Problem**: TypeScript or Vite build errors

**Solutions**:

1. Make sure you ran `npm install` first
2. Delete `node_modules` and `package-lock.json`, then run `npm install` again
3. Check that you have Node.js 20.x or later: `node --version`
4. Try clearing the Vite cache: `rm -rf node_modules/.vite`

### ROM Won't Load

**Problem**: ROM file upload fails or shows errors

**Solutions**:

1. Verify ROM is valid SNES format (.smc or .sfc)
2. Check ROM file size (typically 512KB to 6MB)
3. Ensure ROM is not corrupted
4. Check browser console for specific error messages

### No Video Output

**Problem**: Black screen after loading ROM

**Solutions**:

1. Check browser console for JavaScript errors
2. Verify WASM core loaded successfully (check Network tab)
3. Try a different ROM file
4. Refresh the page and try again

### Audio Issues

**Problem**: No audio or choppy audio

**Solutions**:

1. Click "Play" button first (browser autoplay policy requires user interaction)
2. Verify WebAudio API support in your browser
3. Check browser volume and mute settings
4. Try a different browser (Chrome/Edge recommended)

### Low FPS

**Problem**: Emulator runs below 60 FPS

**Solutions**:

1. Check CPU usage in browser task manager
2. Close other browser tabs to free up resources
3. Try disabling browser extensions
4. Use a desktop browser instead of mobile

## Development

### Prerequisites

- **Node.js** 20.x or later
- **npm** (comes with Node.js)

### Project Scripts

```bash
# Development
npm run dev          # Start dev server at localhost:5173
npm run build        # TypeScript compile + production build
npm run preview      # Preview production build locally

# Testing
npm test             # Run all tests with Vitest
npm test:coverage    # Generate test coverage report
npm test:ui          # Interactive test UI

# Code Quality
npm run lint         # Run ESLint on all TypeScript/React files
```

### Adding New Features

1. Define interfaces first (see `IEmulatorCore.ts` as example)
2. Write tests before implementation
3. Follow existing code patterns and naming conventions
4. Update documentation as needed
5. Run tests and linter before committing

## Deployment

The emulator is a static web application that can be deployed to any hosting service:

```bash
# Build for production
npm run build

# Deploy the dist/ folder to your hosting service
```

The `dist/` folder contains everything needed to run the emulator. The WASM cores are automatically included during the build process.

**Hosting Options**:
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- Any static file server

## Documentation

- **[EMULATOR_INTEGRATION.md](docs/EMULATOR_INTEGRATION.md)** - Technical details of the SNES9x WASM integration
- **[PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md)** - Development phases and future features
- **[QUICK_START_GUIDE.md](docs/QUICK_START_GUIDE.md)** - Developer quick start guide

## Legal & License

### License

This project is licensed under the MIT License - see LICENSE file for details.

### ROMs

SNES ROM files are copyrighted material. **Only use ROM files you legally own.** This emulator is for educational and preservation purposes. Always respect copyright laws.

### Third-Party Licenses

- **SNES9x**: Non-commercial license (see snes9x documentation)
- **Emulatrix cores**: Various licenses (see Emulatrix project)
- **React, Vite, and other dependencies**: See individual package licenses

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Acknowledgments

- **SNES9x team** for the excellent SNES emulator
- **Emulatrix project** for providing pre-compiled WASM cores
- **Emscripten team** for making WebAssembly development possible
- **React and Vite teams** for modern web development tools

---

**Note**: This emulator is for educational and preservation purposes. Always respect copyright laws and only use ROM files you legally own.
