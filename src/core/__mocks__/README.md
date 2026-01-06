# MockSnes9xWasmModule

Mock implementation of the snes9x2005-wasm WASM module for unit testing.

## Overview

`MockSnes9xWasmModule` provides a complete, controllable mock of the `Snes9xWasmModule` interface for testing purposes. It enables:

- Testing code that depends on the WASM module without requiring the actual WASM binary
- Controlling module behavior to test error conditions and edge cases
- Verifying interactions with the WASM module using vitest spies
- Generating realistic test data for video and audio output

## Features

✅ **Complete Interface Implementation** - Implements all methods from `Snes9xWasmModule`  
✅ **Vitest Integration** - All methods use `vi.fn()` for spying and stubbing  
✅ **Controllable Behavior** - Configure success/failure scenarios  
✅ **Realistic Mock Data** - Generates animated video frames and audio samples  
✅ **Memory Simulation** - Simulates WASM heap with allocation tracking  
✅ **State Persistence** - Save/load state operations work correctly  
✅ **Helper Methods** - Convenient test setup functions

## Installation

The mock is located in `src/core/__mocks__/` and is automatically available for testing:

```typescript
import { MockSnes9xWasmModule } from '../__mocks__/MockSnes9xWasmModule';
```

## Basic Usage

### Creating a Mock

```typescript
import { createMockModule } from '../__mocks__/MockSnes9xWasmModule';

// Create with defaults
const mock = createMockModule();

// Create with custom options
const customMock = createMockModule({
  heapSize: 8 * 1024 * 1024, // 8MB heap
  sramSize: 4096,             // 4KB SRAM
  stateSize: 128 * 1024,      // 128KB save states
});
```

### Running Emulation

```typescript
// Quick setup for testing
mock.simulateRomLoad();
mock.simulateFrames(60); // Run 60 frames (1 second)

// Get output
const video = mock.getVideoImageData();
const audio = mock.getAudioFloat32Array();
```

### Manual Setup

```typescript
// Allocate ROM memory
const romData = new Uint8Array(512 * 1024);
const ptr = mock._my_malloc(romData.length);
mock.HEAPU8.set(romData, ptr);

// Initialize emulator
mock._startWithRom(ptr, romData.length, 48000);

// Free ROM memory
mock._my_free(ptr);

// Run frame
mock._mainLoop();

// Get output
const videoPtr = mock._getScreenBuffer();
const audioPtr = mock._getSoundBuffer();
```

## Testing Scenarios

### Test Normal Operation

```typescript
it('should run emulation', () => {
  const mock = createMockModule();
  mock.simulateRomLoad();
  
  mock._mainLoop();
  
  expect(mock._mainLoop).toHaveBeenCalled();
  expect(mock.getMockState().frameCount).toBe(1);
});
```

### Test Error Conditions

```typescript
it('should handle ROM load failure', () => {
  const mock = createFailingRomLoadModule();
  const ptr = mock._my_malloc(1024);
  
  expect(() => {
    mock._startWithRom(ptr, 1024, 48000);
  }).toThrow('Mock ROM load failure');
});

it('should handle allocation failure', () => {
  const mock = createFailingAllocationModule();
  expect(mock._my_malloc(1024)).toBe(0);
});

it('should handle state operation failure', () => {
  const mock = createFailingStateModule();
  mock.simulateRomLoad();
  
  expect(mock._saveState()).toBe(0);
  expect(mock._loadState(0x1000, 1024)).toBe(false);
});
```

### Verify Method Calls

```typescript
it('should track method calls', () => {
  const mock = createMockModule();
  mock.simulateRomLoad();
  
  // Verify calls
  expect(mock._my_malloc).toHaveBeenCalled();
  expect(mock._startWithRom).toHaveBeenCalledWith(
    expect.any(Number),
    512 * 1024,
    48000
  );
  
  // Verify call count
  mock.simulateFrames(10);
  expect(mock._mainLoop).toHaveBeenCalledTimes(10);
});
```

### Test Input Handling

```typescript
it('should handle input', () => {
  const mock = createMockModule();
  const input = SnesButtons.A | SnesButtons.START;
  
  mock._setJoypadInput(input);
  
  expect(mock._setJoypadInput).toHaveBeenCalledWith(input);
  expect(mock.getMockState().inputState).toBe(input);
});
```

### Test State Management

```typescript
it('should save and load state', () => {
  const mock = createMockModule();
  mock.simulateRomLoad();
  
  // Save at frame 50
  mock.simulateFrames(50);
  const statePtr = mock._saveState();
  const stateSize = mock._getStateSaveSize();
  
  // Continue to frame 100
  mock.simulateFrames(50);
  expect(mock.getMockState().frameCount).toBe(100);
  
  // Load state (restore to frame 50)
  const success = mock._loadState(statePtr, stateSize);
  expect(success).toBe(true);
  expect(mock.getMockState().frameCount).toBe(50);
});
```

### Test Memory Management

```typescript
it('should track allocations', () => {
  const mock = createMockModule();
  
  const ptr1 = mock._my_malloc(100);
  const ptr2 = mock._my_malloc(200);
  
  const state = mock.getMockState();
  expect(state.allocatedPointers).toContain(ptr1);
  expect(state.allocatedPointers).toContain(ptr2);
  
  mock._my_free(ptr1);
  expect(mock.getMockState().allocatedPointers).not.toContain(ptr1);
});
```

## Configuration Options

```typescript
interface MockModuleOptions {
  heapSize?: number;            // Default: 16MB
  failAllocation?: boolean;     // Default: false
  failRomLoad?: boolean;        // Default: false
  failStateOperations?: boolean; // Default: false
  sramSize?: number;            // Default: 8KB
  stateSize?: number;           // Default: 256KB
}
```

### Dynamic Configuration

```typescript
const mock = createMockModule();

// Update options during test
mock.setOptions({ failAllocation: true });
expect(mock._my_malloc(1024)).toBe(0);

mock.setOptions({ failAllocation: false });
expect(mock._my_malloc(1024)).toBeGreaterThan(0);
```

## Helper Methods

### simulateRomLoad()

Quickly set up a running emulator with default ROM:

```typescript
mock.simulateRomLoad();
expect(mock.getMockState().romLoaded).toBe(true);
```

### simulateFrames(count)

Run multiple frames at once:

```typescript
mock.simulateRomLoad();
mock.simulateFrames(60); // 1 second at 60 FPS
expect(mock.getMockState().frameCount).toBe(60);
```

### getVideoImageData()

Get current video as ImageData:

```typescript
const imageData = mock.getVideoImageData();
expect(imageData.width).toBe(512);
expect(imageData.height).toBe(448);
```

### getAudioFloat32Array()

Get current audio samples:

```typescript
mock._mainLoop();
const audio = mock.getAudioFloat32Array();
expect(audio.length).toBe(4096); // 2048 stereo frames
```

### getMockState()

Inspect internal state:

```typescript
const state = mock.getMockState();
console.log('Frame count:', state.frameCount);
console.log('ROM loaded:', state.romLoaded);
console.log('Input state:', state.inputState);
console.log('Allocated pointers:', state.allocatedPointers);
```

### reset()

Reset to initial state:

```typescript
mock.simulateRomLoad();
mock.simulateFrames(100);

mock.reset();

expect(mock.getMockState().frameCount).toBe(0);
expect(mock.getMockState().romLoaded).toBe(false);
```

## Convenience Factories

### createMockModule(options?)

Create a mock with custom options:

```typescript
const mock = createMockModule({ heapSize: 8 * 1024 * 1024 });
```

### createFailingRomLoadModule()

Create a mock that fails ROM loading:

```typescript
const mock = createFailingRomLoadModule();
expect(() => mock._startWithRom(ptr, len, rate)).toThrow();
```

### createFailingAllocationModule()

Create a mock that fails memory allocation:

```typescript
const mock = createFailingAllocationModule();
expect(mock._my_malloc(1024)).toBe(0);
```

### createFailingStateModule()

Create a mock that fails state operations:

```typescript
const mock = createFailingStateModule();
mock.simulateRomLoad();
expect(mock._saveState()).toBe(0);
```

### createNoSramModule()

Create a mock with no SRAM:

```typescript
const mock = createNoSramModule();
mock._saveSramRequest();
expect(mock._getSaveSramSize()).toBe(0);
```

## Mock Data Generation

### Video

The mock generates animated gradient patterns that:
- Change over time (based on frame count)
- Respond to input state
- Provide valid RGBA8888 data
- Use the full 512x448 buffer size

```typescript
mock.simulateRomLoad();
mock._setJoypadInput(SnesButtons.A);
mock._mainLoop();

const video = mock.getVideoImageData();
// Video will show animated gradient influenced by A button press
```

### Audio

The mock generates:
- 440 Hz sine wave (A4 note)
- Stereo interleaved format
- Low volume (0.1 amplitude)
- Continuous playback across frames

```typescript
mock.simulateRomLoad();
mock._mainLoop();

const audio = mock.getAudioFloat32Array();
// Audio contains sine wave samples in range [-0.1, 0.1]
```

### SRAM

Default SRAM is filled with a recognizable pattern for testing:

```typescript
mock._saveSramRequest();
const size = mock._getSaveSramSize();
const ptr = mock._getSaveSram();
const sram = new Uint8Array(mock.HEAP8.buffer, ptr, size);

// Pattern: sram[i] === i % 256
for (let i = 0; i < size; i++) {
  expect(sram[i]).toBe(i % 256);
}
```

### Save States

Save states include:
- Frame count at offset 0 (uint32)
- Input state at offset 4 (uint32)
- Test pattern filling the rest

```typescript
mock.simulateFrames(42);
const statePtr = mock._saveState();

const view = new DataView(mock.HEAP8.buffer, statePtr, 8);
expect(view.getUint32(0, true)).toBe(42); // Frame count
```

## Integration with Vitest

All methods use `vi.fn()`, enabling full vitest mock capabilities:

```typescript
// Spy on calls
mock._mainLoop();
expect(mock._mainLoop).toHaveBeenCalled();

// Verify arguments
mock._setJoypadInput(0x0100);
expect(mock._setJoypadInput).toHaveBeenCalledWith(0x0100);

// Count calls
mock.simulateFrames(10);
expect(mock._mainLoop).toHaveBeenCalledTimes(10);

// Custom mock behavior
mock._my_malloc.mockReturnValueOnce(0x12345);
expect(mock._my_malloc(1024)).toBe(0x12345);

// Clear mock history
vi.clearAllMocks();
expect(mock._mainLoop).not.toHaveBeenCalled();
```

## Best Practices

### ✅ Do

- Use `simulateRomLoad()` for quick test setup
- Use `getMockState()` to verify internal state
- Use `reset()` between tests if reusing the same mock
- Use convenience factories for specific test scenarios
- Verify method calls with vitest matchers

### ❌ Don't

- Don't assume specific pointer values (they may change)
- Don't modify mock internals directly (use setOptions)
- Don't forget to reset mocks between tests
- Don't test actual WASM behavior (use integration tests for that)

## Example: Complete Test Suite

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockModule } from '../__mocks__/MockSnes9xWasmModule';
import { SnesButtons } from '../types/Snes9xWasmModule';

describe('MyEmulatorWrapper', () => {
  let mock: MockSnes9xWasmModule;

  beforeEach(() => {
    mock = createMockModule();
  });

  it('should initialize', () => {
    mock.simulateRomLoad();
    expect(mock.getMockState().romLoaded).toBe(true);
  });

  it('should run frames', () => {
    mock.simulateRomLoad();
    mock.simulateFrames(60);
    expect(mock._mainLoop).toHaveBeenCalledTimes(60);
  });

  it('should handle input', () => {
    mock.simulateRomLoad();
    mock._setJoypadInput(SnesButtons.A);
    expect(mock.getMockState().inputState).toBe(SnesButtons.A);
  });

  it('should get video output', () => {
    mock.simulateRomLoad();
    mock._mainLoop();
    const video = mock.getVideoImageData();
    expect(video.width).toBe(512);
  });

  it('should save and load state', () => {
    mock.simulateRomLoad();
    mock.simulateFrames(50);
    
    const statePtr = mock._saveState();
    mock.simulateFrames(50);
    
    mock._loadState(statePtr, mock._getStateSaveSize());
    expect(mock.getMockState().frameCount).toBe(50);
  });
});
```

## See Also

- [Snes9xWasmModule Interface](../types/Snes9xWasmModule.ts)
- [Implementation Plan](../../../docs/SNES9XWASM_IMPLEMENTATION_PLAN.md)
- [Task Breakdown](../../../docs/TASK_BREAKDOWN.md)
