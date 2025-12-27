# Omnilator - GitHub Copilot Instructions

## Project Overview

Omnilator is a web-based SNES (Super Nintendo Entertainment System) emulator built with React, TypeScript, and Vite. The project enables playing classic SNES games directly in modern web browsers with full emulation support.

### MVP: Multi-Environment Gaming

The **Minimum Viable Product (MVP)** demonstrates SNES games being loadable and playable across multiple environments:

- **Cross-Device Connectivity**: A PC and a phone can both load the site simultaneously
- **Distributed Gaming**: One device (e.g., phone) can host the game session
- **Remote Playback**: Another device (e.g., PC) can play the hosted game
- **Seamless Experience**: Games run in the browser with no native installation required

This multi-environment architecture enables collaborative gaming, remote play, and flexible device usage patterns.

## The Holy Texts: Core Architectural Principles

These fundamental principles guide all development decisions in Omnilator. They are the "holy texts" that must be understood and followed:

### 1. Interface-First Design

**Principle**: All major systems start with a well-defined TypeScript interface before implementation.

**Example**: `IEmulatorCore` defines the contract for emulator implementations:

```typescript
interface IEmulatorCore {
  loadROM(romData: Uint8Array): Promise<void>;
  runFrame(): Promise<void>;
  getBuffer(): ImageData;
  getAudioSamples(): Float32Array;
  setInput(port: number, buttons: number): void;
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;
  reset(): void;
  cleanup(): void;
}
```

**Why**: Interface-first design ensures:
- Clear contracts between components
- Easy testing with mocks
- Future extensibility (multiple emulator cores)
- Self-documenting code structure

### 2. Separation of Concerns

**Components are organized by responsibility**:

- `core/` - Emulator logic (platform-agnostic)
- `components/` - React UI components
- `hooks/` - React custom hooks for lifecycle management
- `audio/` - Audio system (WebAudio API)
- `data/` - Game metadata and configuration

**Why**: Each directory has a single, clear purpose. Missing features are obvious from the directory structure itself.

### 3. Browser-First APIs

**Principle**: Leverage native browser APIs for optimal performance:

- **Canvas API** for hardware-accelerated rendering
- **WebAudio API** with AudioWorklet for low-latency audio
- **Gamepad API** for controller support
- **requestAnimationFrame** for smooth 60 FPS rendering

**Why**: Native APIs provide better performance than polyfills and ensure broad browser compatibility.

### 4. Immutable State Management

**Principle**: Use React's state management patterns with immutability:

```typescript
const [saveStates, setSaveStates] = useState<Map<number, Uint8Array>>(new Map());

const handleSaveState = (slot: number) => {
  const state = core.saveState();
  setSaveStates(prev => new Map(prev).set(slot, state)); // New Map instance
};
```

**Why**: Immutability prevents bugs and makes state changes predictable.

### 5. Self-Documenting Code

**Principle**: Code structure makes missing features obvious:

- If a method is in the interface but has a mock implementation, it's incomplete
- If a hook exists but isn't used, it's waiting for integration
- If a component has TODOs in comments, those are explicit next steps

**Example**: `SnesCore` uses mock implementations clearly labeled:

```typescript
// Internal WASM module mock
this.wasmModule = {
  loadROM: (data: Uint8Array) => {
    console.log('Mock: ROM loaded', data.length, 'bytes');
    return true; // WASM module returns boolean
  },
  // ... other methods
};

// IEmulatorCore implementation wraps it
async loadROM(romData: Uint8Array): Promise<void> {
  if (!this.wasmModule || !this.wasmModule.loadROM(romData)) {
    throw new Error('Failed to load ROM');
  }
}
```

## Project Architecture

### Core Components

#### 1. IEmulatorCore Interface (`core/IEmulatorCore.ts`)

The foundational interface defining emulator operations. All emulator implementations must satisfy this interface.

**Key Methods**:
- `loadROM()` - Load a ROM file
- `runFrame()` - Execute one frame of emulation (~16.67ms for 60 FPS)
- `getBuffer()` - Retrieve current video frame as ImageData
- `getAudioSamples()` - Retrieve audio samples for playback
- `setInput()` - Update controller state
- `saveState()` / `loadState()` - Save/restore emulator state

**Button Bitmasks**: Defined as `SnesButton` constants (B, Y, SELECT, START, UP, DOWN, LEFT, RIGHT, A, X, L, R)

#### 2. SnesCore Implementation (`core/SnesCore.ts`)

The SNES emulator implementation wrapping the Snes9x WASM module.

**Current State**: Mock implementation for development
- Generates colorful gradient patterns to visualize emulation
- Provides placeholder audio (simple sine wave)
- Demonstrates the interface contract

**Future**: Will integrate actual Snes9x WASM module

#### 3. EmulatorScreen Component (`components/EmulatorScreen.tsx`)

The main UI component that orchestrates emulation.

**Responsibilities**:
- Render canvas for video output
- Display FPS and gamepad status
- Handle ROM file loading
- Manage save states (4 slots)
- Provide play/pause/reset controls
- Show keyboard control reference

#### 4. useEmulator Hook (`hooks/useEmulator.ts`)

Manages the emulator rendering loop and lifecycle.

**Key Features**:
- Frame rate limiting (target 60 FPS)
- requestAnimationFrame-based rendering loop
- FPS counter
- Start/stop/toggle controls
- Canvas reference management

#### 5. useInput Hook (`hooks/useInput.ts`)

Handles keyboard and gamepad input with SNES controller mapping.

**Keyboard Mapping**:
- D-Pad: Arrow Keys or WASD
- A: X, B: Z, X: V, Y: C
- L: Q, R: E
- Start: Enter, Select: Shift

**Gamepad**: Standard gamepad mapping with automatic detection

**Output**: Combined button bitmask updated on every input change

#### 6. AudioSystem (`audio/AudioSystem.ts`)

WebAudio-based audio streaming system.

**Features**:
- AudioWorklet for low-latency audio (with ScriptProcessor fallback)
- 48kHz sample rate
- Volume control
- Suspend/resume based on emulator state

### Data Flow

```
User Input (Keyboard/Gamepad)
  ↓ [useInput hook]
Button Bitmask
  ↓ [setInput()]
IEmulatorCore
  ↓ [runFrame()]
Video Frame + Audio Samples
  ↓ 
Canvas (via useEmulator) + WebAudio (via AudioSystem)
  ↓
Browser Display + Speakers
```

## Multi-Environment Architecture

### Current Implementation

The codebase is structured to support multi-environment scenarios:

1. **Emulator Core Abstraction**: `IEmulatorCore` can run independently of UI
2. **State Serialization**: Save states are `Uint8Array` (network-transferable)
3. **Input Decoupling**: Controller state is a simple bitmask (network-friendly)
4. **Frame-by-Frame Processing**: Each `runFrame()` call is atomic

### Future Multi-Environment Features (Gaps to Fill)

The architecture makes these features obvious as next steps:

1. **Network Layer** (Gap: `network/` directory doesn't exist yet)
   - WebRTC for peer-to-peer connections
   - WebSocket for server-mediated connections
   - Message protocol for input/state sync

2. **Session Management** (Gap: No session types defined)
   - Host mode (runs emulator, broadcasts frames)
   - Client mode (sends input, receives frames)
   - Lobby system for matchmaking

3. **State Synchronization** (Gap: No sync hooks)
   - Periodic state sync to prevent drift
   - Input prediction for latency compensation
   - Frame buffering for smooth playback

## Coding Standards and Conventions

### TypeScript

- **Strict Mode**: Always enabled (`tsconfig.json`)
- **Type Everything**: No implicit `any` types
- **Interfaces Over Types**: Use `interface` for object shapes
- **Const Assertions**: Use `as const` for literal types (e.g., `SnesButton`)

### React

- **Functional Components**: No class components
- **Hooks**: Use built-in and custom hooks for state/lifecycle
- **Props Interface**: Every component has a typed props interface
- **Ref Management**: Use `useRef` for DOM references and mutable values

### File Organization

- **One Component Per File**: Each React component in its own `.tsx` file
- **Co-located Styles**: Component CSS files next to components
- **Index Exports**: Use barrel exports (`index.ts`) for clean imports
- **Type Definitions**: Interfaces in the same file or dedicated types file

### Naming Conventions

- **Components**: PascalCase (e.g., `EmulatorScreen`)
- **Hooks**: camelCase with `use` prefix (e.g., `useEmulator`)
- **Interfaces**: PascalCase with `I` prefix for core abstractions (e.g., `IEmulatorCore`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `KEYBOARD_MAP`)
- **Files**: Match primary export (e.g., `SnesCore.ts` exports `SnesCore` class)

### Comments

- **JSDoc**: Use for public APIs and interfaces
- **Inline Comments**: Explain "why" not "what"
- **TODO Comments**: Mark incomplete features clearly

Example:
```typescript
/**
 * Custom hook for managing emulator lifecycle and rendering loop
 */
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  // ...
}
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:5173`

### Build

```bash
# TypeScript compilation + Vite build
npm run build
```

Output: `dist/` directory (ready for deployment)

### Linting

```bash
# Run ESLint
npm run lint
```

ESLint configuration: `eslint.config.js`

### Preview Production Build

```bash
# Build and preview
npm run build
npm run preview
```

## Testing Strategy

### Current State

- No formal test suite yet (gap in project structure)
- Manual testing via dev server

### Expected Testing Approach

Based on the architecture, tests should cover:

1. **Unit Tests**:
   - `IEmulatorCore` implementations
   - Button bitmask calculations
   - State serialization/deserialization

2. **Hook Tests**:
   - `useEmulator` lifecycle
   - `useInput` keyboard/gamepad mapping
   - FPS calculation accuracy

3. **Integration Tests**:
   - ROM loading flow
   - Save state creation/restoration
   - Audio system initialization

4. **End-to-End Tests**:
   - Full emulation cycle
   - Multi-environment scenarios (future)

## Common Development Tasks

### Adding a New Emulator Core

1. Create implementation in `core/` directory
2. Implement `IEmulatorCore` interface
3. Update `EmulatorScreen` to support selection
4. Add tests for new core

### Adding a New Input Method

1. Extend `useInput` hook with new device mapping
2. Add to `KEYBOARD_MAP` or create new mapping object
3. Update control reference in UI
4. Test input bitmask generation

### Adding Network Features

1. Create `network/` directory
2. Define message protocol interface
3. Implement WebRTC or WebSocket transport
4. Add host/client modes to `EmulatorScreen`
5. Sync state via `saveState()`/`loadState()`

### Optimizing Performance

1. Check FPS counter in UI
2. Profile `runFrame()` execution time
3. Optimize hot paths in emulator core
4. Consider Web Workers for emulation thread

## Browser Compatibility

### Minimum Requirements

- **Chrome/Edge**: 89+ (AudioWorklet support)
- **Firefox**: 76+ (AudioWorklet support)
- **Safari**: 14.1+ (AudioWorklet support)

### Feature Detection

The codebase gracefully degrades:
- AudioWorklet → ScriptProcessorNode (deprecated fallback)
- Gamepad API → Keyboard only

## Deployment

### Static Hosting

Omnilator is a static site. Deploy `dist/` folder to:
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

### Configuration

- Base URL: Set in `vite.config.ts` if not root path
- CORS: Ensure ROM files are served with proper headers

## Security Considerations

### ROM Files

- ROMs are loaded from user's device or public URLs
- No server-side ROM storage (legal compliance)
- User responsible for ROM ownership

### Input Validation

- Validate ROM file size before loading
- Check save state integrity before loading
- Sanitize network messages (future)

## Performance Targets

### Emulation

- **Target FPS**: 60 (SNES native)
- **Frame Time**: ~16.67ms
- **Audio Latency**: <50ms

### Rendering

- **Canvas Updates**: 60 FPS via requestAnimationFrame
- **Audio Buffer Size**: 2048 samples (~42ms at 48kHz)

## Troubleshooting

### Audio Not Working

- Check browser autoplay policy
- Audio must initialize after user interaction
- Verify AudioWorklet file availability

### Low FPS

- Check `runFrame()` execution time
- Reduce audio buffer size
- Ensure canvas size is reasonable

### Gamepad Not Detected

- Press any button to wake gamepad
- Check browser's gamepad API support
- Use browser gamepad tester to verify device

## Future Roadmap

Based on the codebase structure, these features are natural next steps:

1. **Real Snes9x Integration**: Replace mock with actual WASM module
2. **Network Play**: Add WebRTC for multi-environment gaming
3. **Save State Management**: Persistent storage via IndexedDB
4. **Game Library UI**: Browse and select games from `games.json`
5. **Settings Panel**: Audio volume, video filters, key remapping
6. **Mobile UI**: Touch controls for phone devices
7. **Performance Metrics**: Detailed frame timing and profiling
8. **Cheat Code Support**: Add GameShark/Action Replay codes

## Getting Help

### Resources

- **Snes9x Documentation**: For emulator core details
- **WebAudio API Docs**: For audio system
- **React 19 Docs**: For component patterns
- **TypeScript Handbook**: For type system

### Code Examples

All code follows the patterns established in existing files:
- Study `SnesCore.ts` for interface implementation
- Study `useEmulator.ts` for custom hooks
- Study `EmulatorScreen.tsx` for component structure

## Summary for AI Agents

When working on this codebase:

1. **Start with the interface**: Check `IEmulatorCore.ts` to understand the contract
2. **Follow the holy texts**: Interface-first, separation of concerns, browser APIs
3. **Look for gaps**: Missing directories/files indicate future features
4. **Maintain patterns**: Match existing code style and structure
5. **Self-document**: Write code that explains itself through structure
6. **Think multi-environment**: Design features to work across devices
7. **Test in browser**: This is a web app - always verify in the browser

The codebase is designed to make missing features obvious. If you can't find something, it's probably a gap that needs filling. The architecture supports it - you just need to implement it following the established patterns.
