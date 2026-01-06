---
applyTo: "**/core/**/*.ts"
---

## Emulator Core Implementation Requirements

When implementing emulator cores in Omnilator, follow these strict guidelines.

### 1. Interface Implementation

**ALL emulator cores MUST implement `IEmulatorCore`:**

```typescript
import { IEmulatorCore } from './IEmulatorCore';

export class MyEmulatorCore implements IEmulatorCore {
  // Must implement ALL interface methods
  async loadROM(romData: Uint8Array): Promise<void> { ... }
  async runFrame(): Promise<void> { ... }
  getBuffer(): ImageData { ... }
  getAudioSamples(): Float32Array { ... }
  setInput(port: number, buttons: number): void { ... }
  saveState(): Uint8Array { ... }
  loadState(state: Uint8Array): void { ... }
  reset(): void { ... }
  cleanup(): void { ... }
}
```

### 2. WASM Module Management

**Handle WASM lifecycle properly:**

```typescript
export class SnesCore implements IEmulatorCore {
  private wasmModule: any | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Load WASM module
      this.wasmModule = await loadWasmModule();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize WASM: ${error}`);
    }
  }

  cleanup(): void {
    if (this.wasmModule) {
      // Free WASM memory
      this.wasmModule.cleanup?.();
      this.wasmModule = null;
    }
    this.isInitialized = false;
  }
}
```

### 3. Error Handling

**Robust error handling is required:**

```typescript
async loadROM(romData: Uint8Array): Promise<void> {
  // Validate input
  if (!romData || romData.length === 0) {
    throw new Error('ROM data is empty');
  }
  if (romData.length > 8 * 1024 * 1024) {
    throw new Error('ROM file too large (max 8MB)');
  }

  // Check initialization
  if (!this.wasmModule) {
    throw new Error('Emulator not initialized');
  }

  // Load ROM
  try {
    const success = this.wasmModule.loadROM(romData);
    if (!success) {
      throw new Error('WASM module rejected ROM');
    }
  } catch (error) {
    throw new Error(`Failed to load ROM: ${error}`);
  }
}
```

### 4. Memory Management

**Always manage memory properly:**

```typescript
export class SnesCore implements IEmulatorCore {
  private videoBuffer: Uint8Array | null = null;
  private audioBuffer: Float32Array | null = null;

  constructor() {
    // Allocate buffers once
    this.videoBuffer = new Uint8Array(256 * 224 * 4); // RGBA
    this.audioBuffer = new Float32Array(2048); // 2048 samples
  }

  getBuffer(): ImageData {
    if (!this.videoBuffer) {
      throw new Error('Video buffer not initialized');
    }
    
    // Reuse buffer, don't create new ones
    return new ImageData(
      new Uint8ClampedArray(this.videoBuffer),
      256,
      224
    );
  }

  cleanup(): void {
    // Free buffers
    this.videoBuffer = null;
    this.audioBuffer = null;
    super.cleanup();
  }
}
```

### 5. Performance Considerations

**Optimize frame processing:**

```typescript
async runFrame(): Promise<void> {
  if (!this.wasmModule) {
    throw new Error('Emulator not initialized');
  }

  // Run one frame of emulation (~16.67ms for 60 FPS)
  const startTime = performance.now();
  
  this.wasmModule.runFrame();
  
  const elapsed = performance.now() - startTime;
  if (elapsed > 16.67) {
    console.warn(`Frame took ${elapsed.toFixed(2)}ms (target: 16.67ms)`);
  }
}
```

### 6. Input Handling

**Handle controller input with bitmasks:**

```typescript
setInput(port: number, buttons: number): void {
  // Validate port
  if (port < 0 || port > 3) {
    throw new Error(`Invalid port: ${port} (must be 0-3)`);
  }

  // Validate button mask
  if (buttons < 0 || buttons > 0xFFFF) {
    throw new Error(`Invalid button mask: ${buttons}`);
  }

  if (!this.wasmModule) {
    throw new Error('Emulator not initialized');
  }

  this.wasmModule.setInput(port, buttons);
}
```

### 7. Save State Management

**Implement save/load states correctly:**

```typescript
saveState(): Uint8Array {
  if (!this.wasmModule) {
    throw new Error('Emulator not initialized');
  }

  try {
    const state = this.wasmModule.saveState();
    if (!state || state.length === 0) {
      throw new Error('Save state is empty');
    }
    return state;
  } catch (error) {
    throw new Error(`Failed to save state: ${error}`);
  }
}

loadState(state: Uint8Array): void {
  if (!state || state.length === 0) {
    throw new Error('State data is empty');
  }

  if (!this.wasmModule) {
    throw new Error('Emulator not initialized');
  }

  try {
    const success = this.wasmModule.loadState(state);
    if (!success) {
      throw new Error('WASM module rejected state');
    }
  } catch (error) {
    throw new Error(`Failed to load state: ${error}`);
  }
}
```

### 8. Audio Sample Generation

**Provide audio samples efficiently:**

```typescript
getAudioSamples(): Float32Array {
  if (!this.audioBuffer) {
    throw new Error('Audio buffer not initialized');
  }

  if (!this.wasmModule) {
    // Return silence if not initialized
    return new Float32Array(this.audioBuffer.length);
  }

  // Get samples from WASM (int16 format)
  const wasmSamples = this.wasmModule.getAudioSamples();
  
  // Convert int16 to float32 [-1.0, 1.0]
  for (let i = 0; i < this.audioBuffer.length; i++) {
    this.audioBuffer[i] = wasmSamples[i] / 32768.0;
  }

  return this.audioBuffer;
}
```

### 9. Testing Requirements

**Every core implementation needs tests:**

```typescript
// src/test/core/SnesCore.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnesCore } from '../../core/SnesCore';

describe('SnesCore', () => {
  let core: SnesCore;

  beforeEach(async () => {
    core = new SnesCore();
    await core.initialize();
  });

  afterEach(() => {
    core.cleanup();
  });

  it('should load valid ROM', async () => {
    const romData = new Uint8Array(512 * 1024); // 512KB ROM
    await expect(core.loadROM(romData)).resolves.not.toThrow();
  });

  it('should reject oversized ROM', async () => {
    const romData = new Uint8Array(9 * 1024 * 1024); // 9MB
    await expect(core.loadROM(romData)).rejects.toThrow('too large');
  });

  it('should generate video buffer', () => {
    const buffer = core.getBuffer();
    expect(buffer).toBeInstanceOf(ImageData);
    expect(buffer.width).toBe(256);
    expect(buffer.height).toBe(224);
  });
});
```

### 10. Documentation

**Document non-obvious behavior:**

```typescript
export class SnesCore implements IEmulatorCore {
  /**
   * Loads a SNES ROM into the emulator.
   * 
   * @param romData - ROM file data (must be .smc or .sfc format)
   * @throws {Error} If ROM is invalid, too large (>8MB), or emulator not initialized
   * 
   * Note: ROMs with SMC headers (512-byte header) are automatically detected
   * and handled by the WASM module.
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    // Implementation
  }
}
```

### Emulator Core Template

```typescript
import { IEmulatorCore } from './IEmulatorCore';

/**
 * [Emulator Name] implementation of IEmulatorCore
 * 
 * [Brief description of what this emulator does and what system it targets]
 */
export class MyEmulatorCore implements IEmulatorCore {
  private wasmModule: any | null = null;
  private isInitialized = false;
  private videoBuffer: Uint8Array;
  private audioBuffer: Float32Array;

  constructor() {
    // Allocate buffers
    this.videoBuffer = new Uint8Array(WIDTH * HEIGHT * 4);
    this.audioBuffer = new Float32Array(AUDIO_SAMPLES);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.wasmModule = await loadWasmModule();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize: ${error}`);
    }
  }

  async loadROM(romData: Uint8Array): Promise<void> {
    // Validate and load ROM
  }

  async runFrame(): Promise<void> {
    // Execute one frame
  }

  getBuffer(): ImageData {
    // Return video frame
  }

  getAudioSamples(): Float32Array {
    // Return audio samples
  }

  setInput(port: number, buttons: number): void {
    // Update input state
  }

  saveState(): Uint8Array {
    // Save emulator state
  }

  loadState(state: Uint8Array): void {
    // Restore emulator state
  }

  reset(): void {
    // Reset to initial state
  }

  cleanup(): void {
    // Free all resources
    this.videoBuffer = null;
    this.audioBuffer = null;
    this.wasmModule = null;
    this.isInitialized = false;
  }
}
```

### Common Pitfalls to Avoid

1. **Memory Leaks**: Always cleanup WASM memory and buffers
2. **Unhandled Errors**: Wrap WASM calls in try-catch
3. **Buffer Reallocation**: Reuse buffers, don't create new ones each frame
4. **Missing Validation**: Always validate input parameters
5. **Initialization Checks**: Check `isInitialized` before operations
6. **Port Validation**: Validate controller ports (0-3)
7. **State Corruption**: Validate save state data before loading
8. **Performance**: Keep frame time under 16.67ms for 60 FPS
