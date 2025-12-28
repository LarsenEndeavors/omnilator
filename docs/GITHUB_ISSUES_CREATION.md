# GitHub Issues Creation Guide

This document provides all the information needed to create GitHub issues for the Snes9xWasm implementation plan.

## Project Setup

**Project Name**: Snes9xWasm Implementation  
**Repository**: LarsenEndeavors/omnilator  
**Assignee**: @LarsenEndeavors  
**Labels**: `enhancement`, `snes9x`, `core`

## Sprint Structure

The implementation is organized into 6 sprints (weeks), with 27 total tasks.

---

## Sprint 1: Foundation (Week 1)

### Issue 1: SNES-001 - Set Up Emscripten Build Environment

**Title**: `[SNES-001] Set Up Emscripten Build Environment`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-1`, `foundation`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 2 hours

**Description**:
```markdown
## Objective
Install and configure Emscripten SDK for building WebAssembly modules.

## Prerequisites
- None

## Implementation Steps

### 1. Clone Emscripten SDK
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
```

### 2. Install and activate version 3.1.51
```bash
./emsdk install 3.1.51
./emsdk activate 3.1.51
source ./emsdk_env.sh
```

### 3. Verify installation
```bash
emcc --version
# Should show: emcc (Emscripten gcc/clang-like replacement) 3.1.51
```

## Acceptance Criteria
- [ ] `emcc --version` shows 3.1.51
- [ ] Can compile simple C program to WASM
- [ ] CI workflow includes Emscripten setup
- [ ] Documentation updated with installation steps

## Testing Requirements
```bash
# Test compilation
echo 'int main() { return 0; }' > test.c
emcc test.c -o test.js
node test.js
# Should exit with code 0
```

## Resources
- Emscripten SDK: https://github.com/emscripten-core/emsdk
- Emscripten Documentation: https://emscripten.org/docs/getting_started/downloads.html
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Definition of Done
- [ ] Code changes committed and reviewed
- [ ] All acceptance criteria met
- [ ] Documentation updated
- [ ] CI workflow updated
```

---

### Issue 2: SNES-002 - Build snes9x2005-wasm from Source

**Title**: `[SNES-002] Build snes9x2005-wasm from Source`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-1`, `foundation`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 1 hour

**Description**:
```markdown
## Objective
Compile snes9x2005-wasm using Emscripten to produce WASM and JavaScript glue code.

## Prerequisites
- SNES-001: Emscripten SDK installed and configured

## Implementation Steps

### 1. Navigate to snes9x2005-wasm directory
```bash
cd public/snes/core/snes9x2005-wasm-master
```

### 2. Run build script
```bash
chmod +x build.sh
./build.sh
```

### 3. Verify output files
```bash
ls -lh snes9x_2005.js snes9x_2005.wasm
# Both files should exist
```

### 4. Copy to appropriate location (if needed)
```bash
cp snes9x_2005.* ../
```

### 5. Update .gitignore
Add build artifacts if they shouldn't be committed:
```
public/snes/core/*.js
public/snes/core/*.wasm
```

## Acceptance Criteria
- [ ] Build completes without errors
- [ ] `snes9x_2005.js` exists and is ~100-500KB
- [ ] `snes9x_2005.wasm` exists and is ~1-3MB
- [ ] Files are accessible in expected location
- [ ] Build is reproducible

## Testing Requirements
```bash
# Verify file sizes are reasonable
ls -lh public/snes/core/snes9x_2005.*

# Check WASM file signature
file public/snes/core/snes9x_2005.wasm
# Should show: WebAssembly (wasm) binary module
```

## Troubleshooting
- If build fails, check Emscripten version (needs 3.x+)
- If memory errors, adjust ALLOW_MEMORY_GROWTH in build.sh
- If missing symbols, check EXPORTED_RUNTIME_METHODS

## Resources
- Build script: `public/snes/core/snes9x2005-wasm-master/build.sh`
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Definition of Done
- [ ] Build succeeds consistently
- [ ] Output files meet size expectations
- [ ] Build process documented
- [ ] .gitignore updated if needed
```

---

### Issue 3: SNES-003 - Create TypeScript Module Interface

**Title**: `[SNES-003] Create TypeScript Module Interface`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-1`, `foundation`, `typescript`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 3 hours

**Description**:
```markdown
## Objective
Define TypeScript interfaces for the snes9x2005-wasm module exports and memory structures.

## Prerequisites
- SNES-002: WASM module built successfully

## Implementation Steps

### 1. Create types directory
```bash
mkdir -p src/core/types
touch src/core/types/Snes9xWasmModule.ts
```

### 2. Define Snes9xWasmModule interface
```typescript
/**
 * TypeScript definition for snes9x2005-wasm module
 */
export interface Snes9xWasmModule {
  // Memory heaps
  HEAP8: Int8Array;
  HEAPU8: Uint8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPF32: Float32Array;
  
  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;
  
  // Core functions
  _retro_init(): void;
  _retro_deinit(): void;
  _retro_load_game(info_ptr: number): boolean;
  _retro_unload_game(): void;
  _retro_run(): void;
  _retro_reset(): void;
  
  // Save states
  _retro_serialize_size(): number;
  _retro_serialize(data_ptr: number, size: number): boolean;
  _retro_unserialize(data_ptr: number, size: number): boolean;
  
  // System info
  _retro_get_system_info(info_ptr: number): void;
  _retro_get_system_av_info(info_ptr: number): void;
  
  // Callbacks
  _retro_set_environment(callback_ptr: number): void;
  _retro_set_video_refresh(callback_ptr: number): void;
  _retro_set_audio_sample(callback_ptr: number): void;
  _retro_set_audio_sample_batch(callback_ptr: number): void;
  _retro_set_input_poll(callback_ptr: number): void;
  _retro_set_input_state(callback_ptr: number): void;
  
  // Function pointer creation
  addFunction(func: Function, signature: string): number;
  removeFunction(ptr: number): void;
}

export enum PixelFormat {
  RGB1555 = 0,
  XRGB8888 = 1,
  RGB565 = 2,
}

export interface RetroGameInfo {
  path: number;     // Pointer to path string
  data: number;     // Pointer to ROM data
  size: number;     // Size of ROM data
  meta: number;     // Pointer to metadata string
}

export interface RetroSystemAvInfo {
  geometry: {
    base_width: number;
    base_height: number;
    max_width: number;
    max_height: number;
    aspect_ratio: number;
  };
  timing: {
    fps: number;
    sample_rate: number;
  };
}
```

### 3. Inspect actual exports (after build)
```bash
# Use nm or similar to verify exports
nm -g public/snes/core/snes9x_2005.wasm | grep retro
```

## Acceptance Criteria
- [ ] All interfaces defined and exported
- [ ] TypeScript compiles without errors
- [ ] JSDoc comments complete
- [ ] Matches actual WASM exports
- [ ] No `any` types used

## Testing Requirements
```typescript
// Create test file to verify types compile
import { Snes9xWasmModule } from './types/Snes9xWasmModule';

const testModule: Snes9xWasmModule = {} as Snes9xWasmModule;
// TypeScript should not show errors
```

## Resources
- LibRetro API: https://docs.libretro.com/
- Emscripten types: https://emscripten.org/docs/api_reference/module.html
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Definition of Done
- [ ] Types file created and committed
- [ ] All exports typed correctly
- [ ] Documentation complete
- [ ] TypeScript compilation succeeds
```

---

### Issue 4: SNES-004 - Create Mock WASM Module

**Title**: `[SNES-004] Create Mock WASM Module`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-1`, `foundation`, `testing`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 4 hours

**Description**:
```markdown
## Objective
Create a mock implementation of Snes9xWasmModule for unit testing without real WASM dependencies.

## Prerequisites
- SNES-003: TypeScript interfaces defined

## Implementation Steps

### 1. Create mocks directory
```bash
mkdir -p src/core/__mocks__
touch src/core/__mocks__/snes9x-wasm-module.ts
```

### 2. Implement MockSnes9xWasmModule
```typescript
import { vi } from 'vitest';
import type { Snes9xWasmModule } from '../types/Snes9xWasmModule';

export class MockSnes9xWasmModule implements Snes9xWasmModule {
  // Mock memory heaps (1MB each for testing)
  HEAP8 = new Int8Array(1024 * 1024);
  HEAPU8 = new Uint8Array(1024 * 1024);
  HEAP16 = new Int16Array(512 * 1024);
  HEAP32 = new Int32Array(256 * 1024);
  HEAPF32 = new Float32Array(256 * 1024);
  
  // Mock state
  private mockPointer = 0x1000;
  private videoCallback: Function | null = null;
  private audioCallback: Function | null = null;
  private inputStates: number[] = [0, 0, 0, 0];
  
  // Memory management
  _malloc = vi.fn((size: number) => {
    const ptr = this.mockPointer;
    this.mockPointer += size;
    return ptr;
  });
  
  _free = vi.fn((ptr: number) => {
    // Mock implementation
  });
  
  // Core functions
  _retro_init = vi.fn();
  _retro_deinit = vi.fn();
  
  _retro_load_game = vi.fn((info_ptr: number) => {
    return true; // Successful load
  });
  
  _retro_unload_game = vi.fn();
  
  _retro_run = vi.fn(() => {
    // Trigger mock callbacks
    if (this.videoCallback) {
      this.triggerVideoCallback();
    }
    if (this.audioCallback) {
      this.triggerAudioCallback();
    }
  });
  
  _retro_reset = vi.fn();
  
  // Save states
  _retro_serialize_size = vi.fn(() => 1024); // Mock 1KB save state
  _retro_serialize = vi.fn(() => true);
  _retro_unserialize = vi.fn(() => true);
  
  // System info
  _retro_get_system_info = vi.fn();
  _retro_get_system_av_info = vi.fn();
  
  // Callbacks
  _retro_set_environment = vi.fn();
  _retro_set_video_refresh = vi.fn((callback_ptr: number) => {
    this.videoCallback = this.createMockCallback();
  });
  _retro_set_audio_sample = vi.fn();
  _retro_set_audio_sample_batch = vi.fn((callback_ptr: number) => {
    this.audioCallback = this.createMockCallback();
  });
  _retro_set_input_poll = vi.fn();
  _retro_set_input_state = vi.fn();
  
  // Function pointers
  addFunction = vi.fn((func: Function, signature: string) => {
    return 0x2000; // Mock function pointer
  });
  removeFunction = vi.fn();
  
  // Helper methods for testing
  private createMockCallback() {
    return vi.fn();
  }
  
  private triggerVideoCallback() {
    // Simulate video frame data
    const width = 256;
    const height = 224;
    const pitch = width * 2; // RGB565
    const dataPtr = 0x1000;
    
    if (this.videoCallback) {
      (this.videoCallback as any)(dataPtr, width, height, pitch);
    }
  }
  
  private triggerAudioCallback() {
    // Simulate audio samples
    const frameCount = 534; // ~32040 Hz / 60 FPS
    const dataPtr = 0x2000;
    
    if (this.audioCallback) {
      (this.audioCallback as any)(dataPtr, frameCount);
    }
  }
  
  // Test helper: Set input state for testing
  setInputState(port: number, buttons: number) {
    this.inputStates[port] = buttons;
  }
  
  // Test helper: Reset all mocks
  resetMocks() {
    vi.clearAllMocks();
    this.mockPointer = 0x1000;
    this.videoCallback = null;
    this.audioCallback = null;
    this.inputStates = [0, 0, 0, 0];
  }
}

// Factory function for creating mock modules
export function createMockWasmModule(): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule();
}
```

## Acceptance Criteria
- [ ] MockSnes9xWasmModule implements Snes9xWasmModule interface
- [ ] All methods mocked with vitest `vi.fn()`
- [ ] Mock behaviors are controllable for testing
- [ ] Mock data (video, audio) is realistic
- [ ] Helper methods for test scenarios
- [ ] Documentation complete

## Testing Requirements
```typescript
// Test the mock itself
import { describe, it, expect } from 'vitest';
import { createMockWasmModule } from '../__mocks__/snes9x-wasm-module';

describe('MockSnes9xWasmModule', () => {
  it('should create mock module', () => {
    const mock = createMockWasmModule();
    expect(mock).toBeDefined();
    expect(mock._malloc).toBeDefined();
  });
  
  it('should allocate mock memory', () => {
    const mock = createMockWasmModule();
    const ptr = mock._malloc(1024);
    expect(ptr).toBeGreaterThan(0);
    expect(mock._malloc).toHaveBeenCalledWith(1024);
  });
  
  it('should simulate retro_run', () => {
    const mock = createMockWasmModule();
    mock._retro_run();
    expect(mock._retro_run).toHaveBeenCalled();
  });
});
```

## Resources
- Vitest mocking: https://vitest.dev/guide/mocking.html
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Definition of Done
- [ ] Mock module created and committed
- [ ] All interface methods mocked
- [ ] Self-tests pass
- [ ] Documentation complete
```

---

### Issue 5: SNES-005 - Create Snes9xWasmCore Skeleton

**Title**: `[SNES-005] Create Snes9xWasmCore Skeleton`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-1`, `foundation`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 2 hours

**Description**:
```markdown
## Objective
Create the skeleton structure for Snes9xWasmCore class that implements IEmulatorCore interface.

## Prerequisites
- SNES-003: TypeScript interfaces defined
- SNES-004: Mock WASM module created

## Implementation Steps

### 1. Create core file
```bash
touch src/core/Snes9xWasmCore.ts
```

### 2. Implement skeleton class
```typescript
import type { IEmulatorCore } from './IEmulatorCore';
import type { Snes9xWasmModule } from './types/Snes9xWasmModule';

/**
 * Snes9xWasmCore implementation of IEmulatorCore
 * 
 * Direct integration with snes9x2005-wasm for high-performance
 * SNES emulation in the browser.
 * 
 * @implements {IEmulatorCore}
 */
export class Snes9xWasmCore implements IEmulatorCore {
  private module: Snes9xWasmModule | null = null;
  private videoBuffer: ImageData | null = null;
  private audioBuffer: Float32Array = new Float32Array(2048);
  private audioBufferIndex: number = 0;
  private inputStates: number[] = [0, 0, 0, 0];
  private pixelFormat: number = 2; // RGB565
  
  /**
   * Initialize the WASM module and set up callbacks
   */
  async initialize(): Promise<void> {
    throw new Error('Not implemented');
  }
  
  /**
   * Load a ROM file
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    throw new Error('Not implemented');
  }
  
  /**
   * Execute one frame of emulation
   */
  async runFrame(): Promise<void> {
    throw new Error('Not implemented');
  }
  
  /**
   * Get the current video buffer
   */
  getBuffer(): ImageData {
    if (!this.videoBuffer) {
      throw new Error('No frame available');
    }
    return this.videoBuffer;
  }
  
  /**
   * Get audio samples
   */
  getAudioSamples(): Float32Array {
    return this.audioBuffer;
  }
  
  /**
   * Set controller input
   */
  setInput(port: number, buttons: number): void {
    if (port < 0 || port >= 4) {
      throw new Error(`Invalid port: ${port}`);
    }
    this.inputStates[port] = buttons;
  }
  
  /**
   * Save emulator state
   */
  saveState(): Uint8Array {
    throw new Error('Not implemented');
  }
  
  /**
   * Load emulator state
   */
  loadState(state: Uint8Array): void {
    throw new Error('Not implemented');
  }
  
  /**
   * Reset emulator
   */
  reset(): void {
    throw new Error('Not implemented');
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.module) {
      // Cleanup will be implemented
      this.module = null;
      this.videoBuffer = null;
    }
  }
}
```

### 3. Create initial test file
```bash
touch src/core/Snes9xWasmCore.test.ts
```

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Snes9xWasmCore } from './Snes9xWasmCore';

describe('Snes9xWasmCore', () => {
  let core: Snes9xWasmCore;
  
  beforeEach(() => {
    core = new Snes9xWasmCore();
  });
  
  afterEach(() => {
    core.cleanup();
  });
  
  describe('constructor', () => {
    it('should create instance', () => {
      expect(core).toBeDefined();
      expect(core).toBeInstanceOf(Snes9xWasmCore);
    });
  });
  
  describe('setInput', () => {
    it('should accept valid port', () => {
      expect(() => core.setInput(0, 0)).not.toThrow();
    });
    
    it('should reject invalid port', () => {
      expect(() => core.setInput(-1, 0)).toThrow('Invalid port');
      expect(() => core.setInput(4, 0)).toThrow('Invalid port');
    });
  });
  
  describe('getBuffer', () => {
    it('should throw when no frame available', () => {
      expect(() => core.getBuffer()).toThrow('No frame available');
    });
  });
  
  describe('getAudioSamples', () => {
    it('should return audio buffer', () => {
      const samples = core.getAudioSamples();
      expect(samples).toBeInstanceOf(Float32Array);
    });
  });
  
  describe('cleanup', () => {
    it('should cleanup resources', () => {
      expect(() => core.cleanup()).not.toThrow();
    });
  });
});
```

## Acceptance Criteria
- [ ] Snes9xWasmCore class created
- [ ] Implements IEmulatorCore interface
- [ ] All methods have skeleton implementations
- [ ] TypeScript compiles without errors
- [ ] Basic tests pass
- [ ] JSDoc comments complete

## Testing Requirements
```bash
# Run tests
npm test -- Snes9xWasmCore.test.ts

# Check TypeScript compilation
npx tsc --noEmit
```

## Resources
- IEmulatorCore interface: `src/core/IEmulatorCore.ts`
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Definition of Done
- [ ] Class skeleton created
- [ ] Tests created and passing
- [ ] TypeScript compiles
- [ ] Documentation complete
```

---

## Sprint 2: Core Implementation (Week 2)

### Issue 6: SNES-006 - Implement Core Initialization

**Title**: `[SNES-006] Implement Core Initialization`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-2`, `implementation`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 6 hours

**Prerequisites**: SNES-005

**Description**:
```markdown
## Objective
Implement the `initialize()` method to load the WASM module and set up all LibRetro callbacks.

## Prerequisites
- SNES-005: Snes9xWasmCore skeleton created

## Implementation Steps

### 1. Implement WASM module loading
```typescript
async initialize(): Promise<void> {
  try {
    // Dynamic import of Emscripten-generated module
    const moduleFactory = await import('/snes/core/snes9x_2005.js');
    
    // Create module with configuration
    this.module = await moduleFactory.default({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/snes/core/snes9x_2005.wasm';
        }
        return path;
      },
      print: (text: string) => console.log('[snes9x]', text),
      printErr: (text: string) => console.error('[snes9x]', text),
    });
    
    console.log('snes9x WASM module loaded successfully');
    
    // Initialize libretro core
    this.module._retro_init();
    
    // Set up callbacks
    this.setupCallbacks();
    
  } catch (error) {
    console.error('Failed to load snes9x WASM module:', error);
    throw new Error(`Failed to initialize snes9x core: ${error}`);
  }
}
```

### 2. Implement callback setup
```typescript
private setupCallbacks(): void {
  if (!this.module) return;
  
  // Environment callback
  const envCallback = this.module.addFunction(
    this.environmentCallback.bind(this),
    'iii'
  );
  this.module._retro_set_environment(envCallback);
  
  // Video refresh callback
  const videoCallback = this.module.addFunction(
    this.videoRefreshCallback.bind(this),
    'viiii'
  );
  this.module._retro_set_video_refresh(videoCallback);
  
  // Audio sample batch callback
  const audioBatchCallback = this.module.addFunction(
    this.audioSampleBatchCallback.bind(this),
    'iii'
  );
  this.module._retro_set_audio_sample_batch(audioBatchCallback);
  
  // Input poll callback
  const inputPollCallback = this.module.addFunction(
    this.inputPollCallback.bind(this),
    'v'
  );
  this.module._retro_set_input_poll(inputPollCallback);
  
  // Input state callback
  const inputStateCallback = this.module.addFunction(
    this.inputStateCallback.bind(this),
    'iiiii'
  );
  this.module._retro_set_input_state(inputStateCallback);
}

private environmentCallback(cmd: number, data: number): number {
  // Handle environment commands
  return 0;
}

private videoRefreshCallback(data: number, width: number, height: number, pitch: number): void {
  // Will be implemented in SNES-009
}

private audioSampleBatchCallback(data: number, frames: number): number {
  // Will be implemented in SNES-010
  return frames;
}

private inputPollCallback(): void {
  // Input polling - no-op for now
}

private inputStateCallback(port: number, device: number, index: number, id: number): number {
  // Will be implemented in SNES-011
  return 0;
}
```

## Acceptance Criteria
- [ ] WASM module loads successfully
- [ ] Module factory correctly configured
- [ ] retro_init() called
- [ ] All callbacks registered
- [ ] Error handling for load failures
- [ ] Console logging for debugging
- [ ] Tests pass

## Testing Requirements
```typescript
describe('initialize', () => {
  it('should load WASM module', async () => {
    const core = new Snes9xWasmCore();
    await core.initialize();
    expect(core).toBeDefined();
  });
  
  it('should handle load failure', async () => {
    // Mock import failure
    const core = new Snes9xWasmCore();
    await expect(core.initialize()).rejects.toThrow('Failed to initialize');
  });
  
  it('should call retro_init', async () => {
    const core = new Snes9xWasmCore();
    await core.initialize();
    // Verify retro_init was called
  });
});
```

## Resources
- Emscripten Module API: https://emscripten.org/docs/api_reference/module.html
- LibRetro API: https://docs.libretro.com/
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md` Section 5

## Definition of Done
- [ ] initialize() method implemented
- [ ] Callbacks registered
- [ ] Tests written and passing
- [ ] Error handling complete
- [ ] Documentation updated
```

---

### Issue 7: SNES-007 - Implement ROM Loading

**Title**: `[SNES-007] Implement ROM Loading`

**Labels**: `enhancement`, `snes9x`, `core`, `sprint-2`, `implementation`

**Assignee**: @LarsenEndeavors

**Time Estimate**: 6 hours

**Prerequisites**: SNES-006

**Description**:
```markdown
## Objective
Implement `loadROM()` to copy ROM data to WASM memory and initialize the game.

## Prerequisites
- SNES-006: Core initialization complete

## Implementation Steps

### 1. Implement ROM validation
```typescript
private validateROM(romData: Uint8Array): void {
  // Minimum size (smallest valid SNES ROM is 256KB)
  if (romData.length < 256 * 1024) {
    throw new Error('ROM file too small');
  }
  
  // Maximum size (largest SNES ROM is 6MB)
  if (romData.length > 6 * 1024 * 1024) {
    throw new Error('ROM file too large');
  }
}

private detectROMFormat(romData: Uint8Array): string {
  // Check for .smc header (512 bytes)
  if (romData.length % 1024 === 512) {
    return 'smc';
  }
  return 'sfc';
}

private removeHeader(romData: Uint8Array): Uint8Array {
  const format = this.detectROMFormat(romData);
  if (format === 'smc') {
    console.log('Removing .smc header');
    return romData.slice(512);
  }
  return romData;
}
```

### 2. Implement loadROM
```typescript
async loadROM(romData: Uint8Array): Promise<void> {
  if (!this.module) {
    throw new Error('Core not initialized');
  }
  
  // Validate ROM
  this.validateROM(romData);
  
  // Remove header if present
  const cleanedROM = this.removeHeader(romData);
  
  // Allocate memory for ROM
  const romPtr = this.module._malloc(cleanedROM.length);
  if (!romPtr) {
    throw new Error('Failed to allocate memory for ROM');
  }
  
  try {
    // Copy ROM data to WASM memory
    const romHeap = new Uint8Array(
      this.module.HEAPU8.buffer,
      romPtr,
      cleanedROM.length
    );
    romHeap.set(cleanedROM);
    
    // Create game info structure
    const infoPtr = this.module._malloc(16); // sizeof(retro_game_info)
    const infoView = new Uint32Array(this.module.HEAP32.buffer, infoPtr, 4);
    infoView[0] = 0;                    // path (null)
    infoView[1] = romPtr;               // data
    infoView[2] = cleanedROM.length;    // size
    infoView[3] = 0;                    // meta (null)
    
    // Load game
    const success = this.module._retro_load_game(infoPtr);
    
    this.module._free(infoPtr);
    
    if (!success) {
      throw new Error('Core rejected ROM');
    }
    
    console.log('ROM loaded successfully');
    
    // Get system AV info
    this.getSystemInfo();
    
  } finally {
    // Always free ROM memory
    this.module._free(romPtr);
  }
}
```

### 3. Implement system info retrieval
```typescript
private getSystemInfo(): void {
  if (!this.module) return;
  
  // Get AV info structure
  const avInfoPtr = this.module._malloc(40); // sizeof(retro_system_av_info)
  this.module._retro_get_system_av_info(avInfoPtr);
  
  const avInfoView = new Uint32Array(this.module.HEAP32.buffer, avInfoPtr, 10);
  const width = avInfoView[0];
  const height = avInfoView[1];
  const fps = new Float64Array(this.module.HEAPF32.buffer, avInfoPtr + 32, 1)[0];
  
  console.log(`System info: ${width}x${height} @ ${fps}fps`);
  
  // Initialize video buffer with correct size
  this.videoBuffer = new ImageData(width, height);
  
  this.module._free(avInfoPtr);
}
```

## Acceptance Criteria
- [ ] ROM data validated (size checks)
- [ ] .smc header detected and removed
- [ ] ROM copied to WASM memory correctly
- [ ] retro_load_game() succeeds
- [ ] System info retrieved
- [ ] Video buffer initialized with correct size
- [ ] Memory freed properly
- [ ] Error handling for all failure modes
- [ ] Tests pass

## Testing Requirements
```typescript
describe('loadROM', () => {
  it('should load valid .sfc ROM', async () => {
    const rom = new Uint8Array(512 * 1024).fill(0);
    await core.loadROM(rom);
  });
  
  it('should load valid .smc ROM and remove header', async () => {
    const rom = new Uint8Array(512 * 1024 + 512).fill(0);
    await core.loadROM(rom);
  });
  
  it('should reject ROM too small', async () => {
    const rom = new Uint8Array(100 * 1024);
    await expect(core.loadROM(rom)).rejects.toThrow('too small');
  });
  
  it('should reject ROM too large', async () => {
    const rom = new Uint8Array(10 * 1024 * 1024);
    await expect(core.loadROM(rom)).rejects.toThrow('too large');
  });
  
  it('should handle core rejection', async () => {
    // Mock core returning false
    await expect(core.loadROM(validROM)).rejects.toThrow('rejected');
  });
});
```

## Resources
- LibRetro game info: https://docs.libretro.com/development/libretro-api/#retro_game_info
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md` Section 5

## Definition of Done
- [ ] loadROM() implemented
- [ ] All validation checks in place
- [ ] Memory management correct
- [ ] Tests written and passing
- [ ] Documentation updated
```

---

*[Continue with remaining 20 tasks following the same format...]*

---

## Creating Issues in Bulk

### Using GitHub CLI

```bash
# Install GitHub CLI if needed
brew install gh  # macOS
# or
sudo apt install gh  # Linux

# Authenticate
gh auth login

# Create issues from this file (requires scripting)
# See create-issues.sh script below
```

### Using GitHub UI

1. Go to https://github.com/LarsenEndeavors/omnilator/issues/new
2. Copy/paste each issue template above
3. Set labels, assignee, and milestone manually
4. Create the issue

### Using GitHub API

```bash
# Example for creating one issue
gh api repos/LarsenEndeavors/omnilator/issues \
  -f title="[SNES-001] Set Up Emscripten Build Environment" \
  -f body="<issue description>" \
  -f assignee="LarsenEndeavors" \
  -F labels[]="enhancement" \
  -F labels[]="snes9x" \
  -F labels[]="core" \
  -F labels[]="sprint-1"
```

---

## Labels to Create

Before creating issues, ensure these labels exist:

- `enhancement` - New feature or request
- `snes9x` - Related to SNES9x integration
- `core` - Core emulator functionality
- `sprint-1` through `sprint-6` - Sprint organization
- `foundation` - Foundation work
- `implementation` - Core implementation
- `testing` - Testing-related
- `documentation` - Documentation updates
- `typescript` - TypeScript-specific

---

## Milestone

Create a milestone: **Snes9xWasm Implementation**
- Duration: 6 weeks
- Description: Complete transition from LibRetro to direct Snes9xWasm integration

---

## Project Board

Create a GitHub Project with columns:
- **Backlog** - Not started
- **Sprint 1** - Week 1 tasks
- **Sprint 2** - Week 2 tasks
- **Sprint 3** - Week 3 tasks
- **Sprint 4** - Week 4 tasks
- **Sprint 5** - Week 5 tasks
- **Sprint 6** - Week 6 tasks
- **In Progress** - Currently working
- **In Review** - Awaiting review
- **Done** - Completed

---

## Notes

- All 27 tasks are documented in detail in `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`
- Each task includes: objective, prerequisites, implementation steps, acceptance criteria, testing requirements, resources, and definition of done
- Time estimates total ~120 hours over 6 weeks
- Tasks are designed to be junior-developer-ready with clear instructions
