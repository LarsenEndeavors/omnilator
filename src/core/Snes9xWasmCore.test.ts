import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Snes9xWasmCore } from './Snes9xWasmCore';
import {
  AudioBufferConstants,
  VideoBufferConstants,
} from './types/Snes9xWasmModule';
import type { Snes9xWasmModule } from './types/Snes9xWasmModule';

// Mock WASM module for testing
const createMockModule = (): Snes9xWasmModule => {
  const heap = new Uint8Array(2 * 1024 * 1024); // 2MB heap
  let frameCount = 0;
  
  return {
    HEAP8: new Int8Array(heap.buffer),
    HEAPU8: heap,
    HEAP16: new Int16Array(heap.buffer),
    HEAPU16: new Uint16Array(heap.buffer),
    HEAP32: new Int32Array(heap.buffer),
    HEAPU32: new Uint32Array(heap.buffer),
    HEAPF32: new Float32Array(heap.buffer),
    HEAPF64: new Float64Array(heap.buffer),
    _my_malloc: vi.fn().mockReturnValue(1024),
    _my_free: vi.fn(),
    _startWithRom: vi.fn(),
    _mainLoop: vi.fn(() => { frameCount++; }),
    _setJoypadInput: vi.fn(),
    _getScreenBuffer: vi.fn().mockReturnValue(2048),
    _getSoundBuffer: vi.fn().mockReturnValue(4096 + 2048), // Offset for audio
    _saveSramRequest: vi.fn(),
    _getSaveSramSize: vi.fn().mockReturnValue(0),
    _getSaveSram: vi.fn().mockReturnValue(0),
    _loadSram: vi.fn(),
    _getStateSaveSize: vi.fn().mockReturnValue(256 * 1024),
    _saveState: vi.fn(() => {
      // Store frame count in the saved state
      const statePtr = 8192;
      const view = new DataView(heap.buffer);
      view.setUint32(statePtr, frameCount, true);
      return statePtr;
    }),
    _loadState: vi.fn((ptr: number) => {
      // Restore frame count from saved state
      const view = new DataView(heap.buffer);
      frameCount = view.getUint32(ptr, true);
      return true;
    }),
    cwrap: vi.fn(),
    locateFile: vi.fn(),
    print: vi.fn(),
    printErr: vi.fn(),
    noExitRuntime: true,
  };
};

describe('Snes9xWasmCore', () => {
  let module: Snes9xWasmModule;
  let core: Snes9xWasmCore;

  beforeEach(() => {
    module = createMockModule();
    core = new Snes9xWasmCore(undefined, async () => module);
  });

  it('initializes and loads ROM using provided module', async () => {
    const rom = new Uint8Array(512);

    await core.loadROM(rom);

    expect(module._startWithRom).toHaveBeenCalledWith(
      expect.any(Number),
      rom.length,
      expect.any(Number)
    );
  });

  it('runs a frame and exposes video/audio buffers', async () => {
    const rom = new Uint8Array(1024);
    await core.loadROM(rom);

    await core.runFrame();

    const frame = core.getBuffer();
    const audio = core.getAudioSamples();

    expect(frame.width).toBe(VideoBufferConstants.WIDTH);
    expect(frame.height).toBe(VideoBufferConstants.HEIGHT);
    expect(audio.length).toBe(AudioBufferConstants.TOTAL_SAMPLES);
  });

  it('handles save state operations', async () => {
    const rom = new Uint8Array(2048);
    await core.loadROM(rom);
    await core.runFrame();

    const saved = core.saveState();
    expect(saved).toBeInstanceOf(Uint8Array);
    expect(saved.length).toBeGreaterThan(0);

    // Load state should not throw
    expect(() => core.loadState(saved)).not.toThrow();
  });

  it('throws for invalid input port', () => {
    expect(() => core.setInput(5, 0)).toThrowError(/Port must be between 0 and 3/);
  });

  it('resets without errors', () => {
    expect(() => core.reset()).not.toThrow();
  });

  it('provides core info', () => {
    const info = core.getCoreInfo();
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
  });
});
