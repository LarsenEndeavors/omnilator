import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnesCore } from './SnesCore';
import { SnesButton } from './IEmulatorCore';
import type { Snes9xWasmModule } from './types/Snes9xWasmModule';

// Mock successful WASM module for tests
const createMockModule = (): Snes9xWasmModule => {
  // Create a shared ArrayBuffer like real Emscripten modules
  const buffer = new ArrayBuffer(16 * 1024 * 1024); // 16MB
  return {
    HEAP8: new Int8Array(buffer),
    HEAPU8: new Uint8Array(buffer),
    HEAP16: new Int16Array(buffer),
    HEAPU16: new Uint16Array(buffer),
    HEAP32: new Int32Array(buffer),
    HEAPU32: new Uint32Array(buffer),
    HEAPF32: new Float32Array(buffer),
    HEAPF64: new Float64Array(buffer),
  _my_malloc: vi.fn().mockReturnValue(1024),
  _my_free: vi.fn(),
  _startWithRom: vi.fn(),
  _mainLoop: vi.fn(),
  _setJoypadInput: vi.fn(),
  _getScreenBuffer: vi.fn().mockReturnValue(2048),
  _getSoundBuffer: vi.fn().mockReturnValue(4096),
  _saveSramRequest: vi.fn(),
  _getSaveSramSize: vi.fn().mockReturnValue(0),
  _getSaveSram: vi.fn().mockReturnValue(0),
  _loadSram: vi.fn(),
  _getStateSaveSize: vi.fn().mockReturnValue(256 * 1024),
  _saveState: vi.fn().mockReturnValue(8192),
  _loadState: vi.fn().mockReturnValue(true),
  cwrap: vi.fn(),
  locateFile: vi.fn(),
  print: vi.fn(),
  printErr: vi.fn(),
  noExitRuntime: true,
  };
};

describe('SnesCore', () => {
  let core: SnesCore;

  beforeEach(() => {
    // Create core with mock module loader
    core = new SnesCore(undefined);
  });

  describe('initialization', () => {
    it('should initialize successfully with WASM core', async () => {
      // Mock the module loader
      const mockCore = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await expect(mockCore.initialize()).resolves.toBeUndefined();
    });
  });

  describe('ROM loading', () => {
    beforeEach(async () => {
      // Use mock module loader
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should load ROM data', async () => {
      const romData = new Uint8Array(512 * 1024);
      await expect(core.loadROM(romData)).resolves.toBeUndefined();
    });

    it('should handle various ROM sizes', async () => {
      const sizes = [512 * 1024, 1024 * 1024, 2 * 1024 * 1024, 4 * 1024 * 1024];
      for (const size of sizes) {
        const romData = new Uint8Array(size);
        await expect(core.loadROM(romData)).resolves.toBeUndefined();
      }
    });
  });

  describe('frame execution', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should run frames', async () => {
      const romData = new Uint8Array(512 * 1024);
      await core.loadROM(romData);
      await expect(core.runFrame()).resolves.toBeUndefined();
    });

    it('should run multiple consecutive frames', async () => {
      const romData = new Uint8Array(512 * 1024);
      await core.loadROM(romData);
      for (let i = 0; i < 10; i++) {
        await expect(core.runFrame()).resolves.toBeUndefined();
      }
    });
  });

  describe('video output', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should return valid ImageData', () => {
      const buffer = core.getBuffer();
      expect(buffer).toBeInstanceOf(ImageData);
      expect(buffer.width).toBe(512);
      expect(buffer.height).toBe(448);
    });

    it('should return RGBA format', () => {
      const buffer = core.getBuffer();
      expect(buffer.data.length).toBe(512 * 448 * 4);
    });
  });

  describe('audio output', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should return audio samples', () => {
      const samples = core.getAudioSamples();
      expect(samples).toBeInstanceOf(Float32Array);
    });

    it('should return stereo audio', () => {
      const samples = core.getAudioSamples();
      expect(samples.length % 2).toBe(0);
    });
  });

  describe('input handling', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should accept input for all ports', () => {
      expect(() => core.setInput(0, SnesButton.A)).not.toThrow();
      expect(() => core.setInput(1, SnesButton.B)).not.toThrow();
      expect(() => core.setInput(2, SnesButton.X)).not.toThrow();
      expect(() => core.setInput(3, SnesButton.Y)).not.toThrow();
    });

    it('should accept combined buttons', () => {
      const buttons = SnesButton.A | SnesButton.B | SnesButton.START;
      expect(() => core.setInput(0, buttons)).not.toThrow();
    });

    it('should reject invalid ports', () => {
      expect(() => core.setInput(-1, 0)).toThrow();
      expect(() => core.setInput(4, 0)).toThrow();
    });
  });

  describe('save states', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
      const romData = new Uint8Array(512 * 1024);
      await core.loadROM(romData);
    });

    it('should create save states', () => {
      const state = core.saveState();
      expect(state).toBeInstanceOf(Uint8Array);
    });

    it('should load save states', () => {
      const state = new Uint8Array(256 * 1024);
      expect(() => core.loadState(state)).not.toThrow();
    });

    it('should handle save/load cycle', () => {
      const state = core.saveState();
      expect(() => core.loadState(state)).not.toThrow();
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
      const romData = new Uint8Array(512 * 1024);
      await core.loadROM(romData);
    });

    it('should reset without errors', () => {
      expect(() => core.reset()).not.toThrow();
    });

    it('should still function after reset', async () => {
      core.reset();
      await expect(core.runFrame()).resolves.toBeUndefined();
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
      await core.initialize();
    });

    it('should cleanup without errors', () => {
      expect(() => core.cleanup()).not.toThrow();
    });

    it('should allow reinitialization', async () => {
      core.cleanup();
      await expect(core.initialize()).resolves.toBeUndefined();
    });
  });

  describe('core info', () => {
    beforeEach(async () => {
      core = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );
    });

    it('should return core info after initialization', async () => {
      await core.initialize();
      const info = core.getCoreInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
    });
  });

  describe('different core configurations', () => {
    it('should accept custom core name', () => {
      const customCore = new SnesCore('bsnes');
      expect(customCore).toBeDefined();
    });

    it('should accept custom core URL', () => {
      const customCore = new SnesCore('/custom/path/core.js');
      expect(customCore).toBeDefined();
    });
  });

  describe('full workflow', () => {
    it('should handle complete emulation cycle', async () => {
      const workflowCore = new SnesCore('/cores/snes9x_2005.js', async () => createMockModule()
      );

      // Initialize
      await workflowCore.initialize();
      
      // Load ROM
      const romData = new Uint8Array(1024 * 1024);
      await workflowCore.loadROM(romData);
      
      // Set input
      workflowCore.setInput(0, SnesButton.A | SnesButton.B);
      
      // Run some frames
      for (let i = 0; i < 60; i++) {
        await workflowCore.runFrame();
      }
      
      // Get output
      const buffer = workflowCore.getBuffer();
      const audio = workflowCore.getAudioSamples();
      expect(buffer.width).toBe(512);
      expect(audio).toBeInstanceOf(Float32Array);
      
      // Save state
      const state = workflowCore.saveState();
      expect(state.length).toBeGreaterThan(0);
      
      // Continue running
      await workflowCore.runFrame();
      
      // Load state
      workflowCore.loadState(state);
      
      // Reset
      workflowCore.reset();
      
      // More frames
      await workflowCore.runFrame();
      
      // Get core info
      const info = workflowCore.getCoreInfo();
      expect(info.name).toBeDefined();
      
      // Cleanup
      workflowCore.cleanup();
    });
  });
});
