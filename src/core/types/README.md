# Snes9xWasmModule TypeScript Interface

## Overview

This directory contains TypeScript type definitions for the snes9x2005-wasm WASM module. These types enable type-safe integration with the compiled SNES emulator core.

## Files

- **`Snes9xWasmModule.ts`** - Main interface definitions
- **`index.ts`** - Barrel export for clean imports

## Usage

### Importing Types

```typescript
import type { Snes9xWasmModule } from '@/core/types';
import { SnesButtons, wasmMemoryHelpers } from '@/core/types';
```

### Loading the WASM Module

```typescript
// Import the Emscripten-generated module factory
const moduleFactory = await import('/cores/snes9x_2005.js');

// Create module with custom configuration
const module: Snes9xWasmModule = await moduleFactory.default({
  locateFile: (path: string) => {
    if (path.endsWith('.wasm')) {
      return '/cores/snes9x_2005.wasm';
    }
    return path;
  },
  print: (text: string) => console.log('[snes9x]', text),
  printErr: (text: string) => console.error('[snes9x]', text),
});
```

### Basic Emulation Workflow

```typescript
// 1. Load ROM
const romPtr = wasmMemoryHelpers.copyToWasm(module, romData);
try {
  module._startWithRom(romPtr, romData.length, 48000);
} finally {
  module._my_free(romPtr);
}

// 2. Set input
const input = SnesButtons.A | SnesButtons.START;
module._setJoypadInput(input);

// 3. Run frame
module._mainLoop();

// 4. Get video
const videoPtr = module._getScreenBuffer();
const videoBuffer = new Uint8Array(
  module.HEAP8.buffer,
  videoPtr,
  512 * 448 * 4
);

// 5. Get audio
const audioPtr = module._getSoundBuffer();
const audioSamples = new Float32Array(
  module.HEAPF32.buffer,
  audioPtr,
  4096 // 2048 stereo frames = 4096 float32 values
);
```

### Save State Example

```typescript
// Create save state
const stateSize = module._getStateSaveSize();
const statePtr = module._saveState();

if (statePtr) {
  const state = wasmMemoryHelpers.copyFromWasm(module, statePtr, stateSize);
  // Store state to file/IndexedDB...
  module._my_free(statePtr);
}

// Load save state
const statePtr = wasmMemoryHelpers.copyToWasm(module, stateData);
try {
  const success = module._loadState(statePtr, stateData.length);
  if (!success) {
    console.error('Failed to load state');
  }
} finally {
  module._my_free(statePtr);
}
```

### SRAM Example

```typescript
// Save SRAM
module._saveSramRequest();
const sramSize = module._getSaveSramSize();
const sramPtr = module._getSaveSram();

if (sramPtr && sramSize > 0) {
  const sram = wasmMemoryHelpers.copyFromWasm(module, sramPtr, sramSize);
  // Store SRAM to file/IndexedDB...
}

// Load SRAM
const sramPtr = wasmMemoryHelpers.copyToWasm(module, sramData);
try {
  module._loadSram(sramData.length, sramPtr);
} finally {
  module._my_free(sramPtr);
}
```

## Constants

### Video Buffer
```typescript
VideoBufferConstants.WIDTH        // 512 pixels
VideoBufferConstants.HEIGHT       // 448 pixels
VideoBufferConstants.BYTES_PER_PIXEL // 4 (RGBA8888)
VideoBufferConstants.TOTAL_SIZE   // 917,504 bytes
```

### Audio Buffer
```typescript
AudioBufferConstants.FRAMES_PER_BUFFER  // 2048 frames
AudioBufferConstants.CHANNELS           // 2 (stereo)
AudioBufferConstants.TOTAL_SAMPLES      // 4096 samples
AudioBufferConstants.TOTAL_SIZE         // 16,384 bytes
```

### Input Buttons
```typescript
SnesButtons.B       // 0x0001
SnesButtons.Y       // 0x0002
SnesButtons.SELECT  // 0x0004
SnesButtons.START   // 0x0008
SnesButtons.UP      // 0x0010
SnesButtons.DOWN    // 0x0020
SnesButtons.LEFT    // 0x0040
SnesButtons.RIGHT   // 0x0080
SnesButtons.A       // 0x0100
SnesButtons.X       // 0x0200
SnesButtons.L       // 0x0400
SnesButtons.R       // 0x0800
```

## Memory Management

### Important Rules

1. **Always free allocated memory**: Any pointer returned by `_my_malloc` must be freed with `_my_free`
2. **Copy data immediately**: WASM memory can grow and invalidate pointers
3. **Use helpers**: The `wasmMemoryHelpers` utilities handle allocation/deallocation safely

### Memory Views

The module exposes typed array views of WASM memory:
- `HEAP8` / `HEAPU8` - Byte access (8-bit)
- `HEAP16` / `HEAPU16` - Short access (16-bit)
- `HEAP32` / `HEAPU32` - Int access (32-bit)
- `HEAPF32` / `HEAPF64` - Float access (32/64-bit)

## Architecture Notes

### Buffer Formats

**Video Buffer**: 512x448 RGBA8888
- 4 bytes per pixel (Red, Green, Blue, Alpha)
- Total size: 917,504 bytes
- Actual SNES resolution: 256x224 or 256x239 (with overscan)

**Audio Buffer**: 2048 stereo frames
- Float32 interleaved: [L, R, L, R, ...]
- Range: [-1.0, 1.0]
- At 60 FPS: ~34ms of audio per frame

### Performance

- Target frame rate: 60 FPS (~16.67ms per frame)
- Audio sample rate: 48,000 Hz (configurable)
- State size: ~256-512 KB (depends on ROM features)

## Type Safety

All interfaces use strict TypeScript types:
- No `any` types
- All parameters and returns typed
- Helper utilities prevent common errors
- Constants use `as const` for literal types

## Next Steps

These types will be used to implement:
1. `Snes9xWasmCore` class (implements `IEmulatorCore`)
2. Mock WASM module for testing
3. Integration with existing `SnesCore` wrapper

## References

- Original implementation plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`
- C source code: `public/snes/core/snes9x2005-wasm-master/source/exports.c`
- Development log: `docs/MCP_USAGE_GUIDE.md`
