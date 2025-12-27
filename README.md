# Omnilator - Web SNES Emulator

A browser-based SNES emulator built with React, TypeScript, and Vite.

## Features

- 🎮 **Full SNES Emulation Core**: IEmulatorCore interface with SnesCore implementation
- 🖼️ **Canvas Rendering**: 60 FPS hardware-accelerated rendering with requestAnimationFrame
- ⌨️ **Input Support**: Keyboard and Gamepad API with full SNES controller mapping
- 🔊 **Low-Latency Audio**: WebAudio API with AudioWorklet processor
- 💾 **Save States**: 4-slot save/load state system
- 📁 **ROM Loading**: Support for .smc and .sfc ROM files
- 🎨 **Modern UI**: Responsive design with real-time stats display

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

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

Standard gamepad mapping is supported with automatic detection.

## Architecture

### Core Components

- **IEmulatorCore**: Interface defining emulator operations (loadROM, runFrame, getBuffer, etc.)
- **SnesCore**: Implementation wrapping Snes9x WASM module (currently in demo mode)
- **EmulatorScreen**: Main React component with canvas and controls
- **useEmulator**: Custom hook managing the rendering loop
- **useInput**: Custom hook for keyboard and gamepad input
- **AudioSystem**: WebAudio-based audio streaming system

### Current Status

**⚠️ The emulator is currently in demo/test mode.** It demonstrates that all the infrastructure works (rendering loop, input handling, audio system, save states) but does not actually emulate SNES ROMs. 

To integrate a real SNES emulator, see **[docs/EMULATOR_INTEGRATION.md](docs/EMULATOR_INTEGRATION.md)** for a comprehensive guide on:
- Why a mock implementation is used
- Integration options (EmulatorJS, building from source, RetroArch cores, CDN)
- Implementation checklist
- Resources and next steps

### Project Structure

```
src/
├── core/
│   ├── IEmulatorCore.ts    # Core emulator interface
│   └── SnesCore.ts          # SNES emulator implementation
├── components/
│   ├── EmulatorScreen.tsx   # Main emulator UI
│   └── EmulatorScreen.css   # Styles
├── hooks/
│   ├── useEmulator.ts       # Emulator lifecycle hook
│   └── useInput.ts          # Input handling hook
├── audio/
│   └── AudioSystem.ts       # Audio management
└── data/
    └── games.json           # Game library metadata
```

## Technologies

- **React 19**: UI framework
- **TypeScript 5.9**: Type safety
- **Vite 7**: Build tool and dev server
- **WebAudio API**: Low-latency audio
- **Canvas API**: Hardware-accelerated rendering
- **Gamepad API**: Controller support

## License

MIT

