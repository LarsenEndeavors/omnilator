# LibRetro SNES Core Implementation

This document provides technical details about the LibRetro implementation in Omnilator.

## Overview

The LibRetro implementation provides a standardized interface for running SNES emulator cores in WebAssembly. This architecture allows for:

- **Multiple Core Support**: Easily switch between snes9x, bsnes, and other libretro cores
- **Loose Coupling**: The `IEmulatorCore` interface separates the emulator from the UI
- **Browser-Native**: Runs entirely in the browser with no server-side components
- **Save States**: Full support for saving and loading emulator state
- **Multi-Player**: Support for up to 4 controller ports

## Architecture

### Class Hierarchy

```
IEmulatorCore (interface)
    ↑
    |
LibRetroCore (implementation)
    ↑
    |
SnesCore (wrapper)
```

### Key Components

#### 1. IEmulatorCore Interface

Defines the contract that all emulator implementations must follow:

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

#### 2. LibRetroCore Class

Implements the libretro API and handles all WASM interactions:

- **Module Loading**: Dynamically loads libretro cores from URLs
- **Memory Management**: Manages shared memory between JavaScript and WASM
- **Callback System**: Implements all libretro callbacks for video, audio, and input
- **Pixel Format Conversion**: Converts RGB565/XRGB8888/RGB1555 to RGBA
- **Audio Conversion**: Converts int16 samples to float32

#### 3. SnesCore Class

Provides a SNES-specific wrapper around LibRetroCore:

- **Simple API**: Easy-to-use interface for SNES emulation
- **Default Configuration**: Pre-configured for snes9x core
- **Documentation**: Comprehensive JSDoc comments

## LibRetro API Implementation

### Callbacks

The LibRetro API uses callbacks for communication between the core and frontend:

#### Environment Callback

Handles core queries about capabilities:

```typescript
private environmentCallback(cmd: number, data: number): number
```

Supported commands:
- `GET_CAN_DUPE`: Frame duplication support
- `SET_PIXEL_FORMAT`: Pixel format notification
- `GET_SYSTEM_DIRECTORY`: System files location
- `GET_SAVE_DIRECTORY`: Save files location
- `SET_SYSTEM_AV_INFO`: Video/audio configuration

#### Video Refresh Callback

Receives rendered frames from the core:

```typescript
private videoRefreshCallback(data: number, width: number, height: number, pitch: number): void
```

This callback:
1. Reads pixel data from WASM memory
2. Converts pixel format (RGB565 → RGBA)
3. Stores frame for retrieval via `getBuffer()`

#### Audio Sample Callbacks

Two callbacks for audio data:

```typescript
// Single sample (rarely used)
private audioSampleCallback(left: number, right: number): void

// Batch samples (preferred)
private audioSampleBatchCallback(data: number, frames: number): number
```

These callbacks:
1. Read int16 audio samples from WASM memory
2. Convert to float32 range [-1, 1]
3. Store in stereo buffer

#### Input Callbacks

Handle controller input:

```typescript
// Signal that core wants to read input
private inputPollCallback(): void

// Return state of a specific button
private inputStateCallback(port: number, device: number, index: number, id: number): number
```

## Pixel Format Conversion

The core supports three pixel formats:

### RGB565 (Most Common)

16-bit format: `RRRRRGGGGGGBBBBB`

```typescript
const pixel = src[i] | (src[i+1] << 8);
const r = (pixel >> 11) & 0x1F;  // 5 bits
const g = (pixel >> 5) & 0x3F;   // 6 bits
const b = pixel & 0x1F;          // 5 bits

// Scale to 8-bit
dst[j] = (r * 255 / 31) | 0;     // R
dst[j+1] = (g * 255 / 63) | 0;   // G
dst[j+2] = (b * 255 / 31) | 0;   // B
dst[j+3] = 255;                  // A
```

### XRGB8888

32-bit format with unused X bits (usually BGRA in memory):

```typescript
dst[j] = src[i+2];    // R
dst[j+1] = src[i+1];  // G
dst[j+2] = src[i];    // B
dst[j+3] = 255;       // A
```

### RGB1555

16-bit format: `0RRRRRGGGGGBBBBB` (1 unused bit)

```typescript
const pixel = src[i] | (src[i+1] << 8);
const r = (pixel >> 10) & 0x1F;  // 5 bits
const g = (pixel >> 5) & 0x1F;   // 5 bits
const b = pixel & 0x1F;          // 5 bits

// Scale to 8-bit (same as RGB565 R/B channels)
dst[j] = (r * 255 / 31) | 0;
dst[j+1] = (g * 255 / 31) | 0;
dst[j+2] = (b * 255 / 31) | 0;
dst[j+3] = 255;
```

## Memory Management

### Emscripten Memory Model

Emscripten provides heap memory accessible from both JavaScript and WASM:

```typescript
// Access WASM memory from JavaScript
const memory = Module.HEAP8.buffer;
const view = new Uint8Array(memory, ptr, length);

// Allocate memory
const ptr = Module._malloc(size);

// Free memory (always required!)
Module._free(ptr);
```

### Memory Safety

The implementation follows these principles:

1. **Always free allocated memory** - Use try/finally blocks
2. **Check allocation success** - Handle null pointers
3. **Copy data, don't reference** - Create new arrays for data leaving WASM
4. **Update memory view** - WASM memory can grow, invalidating views

## Input Mapping

### SNES Button Layout

The libretro SNES button mapping matches the `SnesButton` constants:

| Bit | Button | Libretro ID |
|-----|--------|-------------|
| 0   | B      | 0           |
| 1   | Y      | 1           |
| 2   | SELECT | 2           |
| 3   | START  | 3           |
| 4   | UP     | 4           |
| 5   | DOWN   | 5           |
| 6   | LEFT   | 6           |
| 7   | RIGHT  | 7           |
| 8   | A      | 8           |
| 9   | X      | 9           |
| 10  | L      | 10          |
| 11  | R      | 11          |

### Multi-Port Support

The implementation supports 4 controller ports (0-3):

```typescript
// Set input for port 0 (player 1)
core.setInput(0, SnesButton.A | SnesButton.B);

// Set input for port 1 (player 2)
core.setInput(1, SnesButton.START);
```

## Save States

### Serialization

Save states capture the complete emulator state:

```typescript
const state = core.saveState();
// Returns Uint8Array (typically 150-300 KB for SNES)
```

The state includes:
- CPU registers and flags
- RAM (Work RAM, Video RAM, Audio RAM)
- PPU state (scanline, sprites, backgrounds)
- APU state (sound channels, DSP registers)
- Cartridge state (SRAM, special chips)

### Deserialization

Restore emulator to a saved state:

```typescript
core.loadState(state);
// Instantly returns to saved point
```

⚠️ **Important Notes:**
- States are core-specific (snes9x ≠ bsnes)
- States are ROM-specific
- States may be incompatible across core versions

## Performance Considerations

### Frame Timing

SNES runs at 60 FPS (16.67ms per frame):

```typescript
// Ideal loop
setInterval(async () => {
  await core.runFrame();
  // Render and play audio
}, 1000/60);
```

For better accuracy, use `requestAnimationFrame`:

```typescript
let lastFrame = performance.now();
const targetFrameTime = 1000 / 60;

function loop() {
  const now = performance.now();
  const delta = now - lastFrame;
  
  if (delta >= targetFrameTime) {
    core.runFrame();
    lastFrame = now - (delta % targetFrameTime);
  }
  
  requestAnimationFrame(loop);
}
```

### Audio Buffering

Audio samples are generated per frame:
- Sample rate: ~32040 Hz
- Samples per frame: ~534 (267 per channel)
- Format: Interleaved stereo float32

Use a circular buffer in AudioSystem for smooth playback.

### Memory Usage

Typical memory footprint:
- WASM module: 2-5 MB
- Video buffer: ~220 KB (256×224×4)
- Audio buffer: ~64 KB (8192 samples × 2 channels × 4 bytes)
- Save states: 150-300 KB each

## Error Handling

### Common Errors

1. **"Failed to load core from URL"**
   - Core file not accessible (404)
   - CORS policy blocking access
   - Solution: Host cores locally or configure CORS

2. **"Core rejected ROM file"**
   - Invalid ROM format
   - ROM header corruption
   - Unsupported mapper
   - Solution: Verify ROM file integrity

3. **"Failed to allocate memory"**
   - Out of memory in WASM heap
   - Solution: Increase WASM memory limit

4. **"Frame not ready after retro_run()"**
   - Core didn't call video_refresh
   - Possible core bug
   - Solution: Check core compatibility

## Available Cores

### snes9x (Recommended)

- **Speed**: Fast (runs well on mobile)
- **Accuracy**: Good (99%+ game compatibility)
- **Features**: All standard features
- **Size**: ~2 MB

### bsnes

- **Speed**: Moderate (requires desktop CPU)
- **Accuracy**: Maximum (cycle-accurate)
- **Features**: All features + enhancement chips
- **Size**: ~3 MB

### mednafen_snes

- **Speed**: Fast
- **Accuracy**: Very good
- **Features**: Good compatibility
- **Size**: ~2.5 MB

## Testing

### Manual Testing

1. **Load a ROM**
   ```typescript
   const romFile = await fetch('/roms/game.sfc');
   const romData = new Uint8Array(await romFile.arrayBuffer());
   await core.loadROM(romData);
   ```

2. **Run frames**
   ```typescript
   await core.runFrame();
   const frame = core.getBuffer();
   const audio = core.getAudioSamples();
   ```

3. **Test input**
   ```typescript
   core.setInput(0, SnesButton.A);
   await core.runFrame();
   ```

4. **Test save states**
   ```typescript
   const state = core.saveState();
   // ... play for a while ...
   core.loadState(state); // Returns to saved point
   ```

### Automated Testing

See `src/core/__tests__/LibRetroCore.test.ts` for unit tests.

## Future Enhancements

Potential improvements:

1. **Shader Support**: Video filters (scanlines, CRT effect)
2. **Fast Forward**: Run at 2x-4x speed
3. **Rewind**: Save states every N frames for instant rewind
4. **Netplay**: Synchronize state across network
5. **Achievements**: RetroAchievements integration
6. **Cheats**: GameShark/Action Replay code support

## Resources

- [LibRetro Documentation](https://docs.libretro.com/)
- [LibRetro API Header](https://github.com/libretro/RetroArch/blob/master/libretro-common/include/libretro.h)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [SNES Development Manual](https://problemkaputt.de/fullsnes.htm)
- [LibRetro Core Buildbot](https://buildbot.libretro.com/stable/latest/emscripten/)

## License

This implementation is part of Omnilator and is licensed under the MIT License.

The libretro cores themselves have their own licenses:
- snes9x: Non-commercial license
- bsnes: GPLv3
- mednafen: GPLv2

Ensure you comply with the appropriate licenses when distributing.
