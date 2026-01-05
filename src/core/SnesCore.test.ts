import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnesCore } from './SnesCore';
import { SnesButton } from './IEmulatorCore';

// Mock the Snes9xWasmCore to avoid network calls
vi.mock('./Snes9xWasmCore', () => {
  return {
    Snes9xWasmCore: class MockSnes9xWasmCore {
      async initialize() {
        // Simulate network failure to test fallback
        throw new Error('Failed to load core from URL');
      }
      async loadROM() {}
      async runFrame() {}
      getBuffer() {
        return new ImageData(256, 224);
      }
      getAudioSamples() {
        return new Float32Array(2048);
      }
      setInput() {}
      saveState() {
        return new Uint8Array(1024);
      }
      loadState() {}
      reset() {}
      cleanup() {}
      getCoreInfo() {
        return { name: 'MockSnes9x', version: '1.0' };
      }
    },
  };
});

describe('SnesCore', () => {
  let core: SnesCore;

  beforeEach(() => {
    core = new SnesCore();
  });

  describe('initialization', () => {
    it('should initialize and fall back to mock mode', async () => {
      await core.initialize();
      expect(core.isInMockMode()).toBe(true);
    });

    it('should not throw on initialization', async () => {
      await expect(core.initialize()).resolves.toBeUndefined();
    });
  });

  describe('mock mode detection', () => {
    it('should report mock mode after initialization', async () => {
      await core.initialize();
      expect(core.isInMockMode()).toBe(true);
    });

    it('should report not in mock mode before initialization', () => {
      expect(core.isInMockMode()).toBe(false);
    });
  });

  describe('ROM loading', () => {
    beforeEach(async () => {
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
      await core.initialize();
    });

    it('should run frames', async () => {
      await expect(core.runFrame()).resolves.toBeUndefined();
    });

    it('should run multiple consecutive frames', async () => {
      for (let i = 0; i < 10; i++) {
        await expect(core.runFrame()).resolves.toBeUndefined();
      }
    });
  });

  describe('video output', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should return valid ImageData', () => {
      const buffer = core.getBuffer();
      expect(buffer).toBeInstanceOf(ImageData);
      expect(buffer.width).toBe(256);
      expect(buffer.height).toBe(224);
    });

    it('should return RGBA format', () => {
      const buffer = core.getBuffer();
      expect(buffer.data.length).toBe(256 * 224 * 4);
    });
  });

  describe('audio output', () => {
    beforeEach(async () => {
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
      await core.initialize();
    });

    it('should create save states', () => {
      const state = core.saveState();
      expect(state).toBeInstanceOf(Uint8Array);
    });

    it('should load save states', () => {
      const state = new Uint8Array(1024);
      expect(() => core.loadState(state)).not.toThrow();
    });

    it('should handle save/load cycle', () => {
      const state = core.saveState();
      expect(() => core.loadState(state)).not.toThrow();
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await core.initialize();
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
    it('should return core info before initialization', () => {
      const info = core.getCoreInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
    });

    it('should return mock info in mock mode', async () => {
      await core.initialize();
      const info = core.getCoreInfo();
      expect(info.name).toBe('Mock');
      expect(info.version).toBe('demo');
    });
  });

  describe('different core configurations', () => {
    it('should accept custom core name', () => {
      const customCore = new SnesCore('bsnes');
      expect(customCore).toBeDefined();
    });

    it('should accept custom core URL', () => {
      const customCore = new SnesCore('snes9x', '/custom/path/core.js');
      expect(customCore).toBeDefined();
    });
  });

  describe('full workflow', () => {
    it('should handle complete emulation cycle', async () => {
      // Initialize
      await core.initialize();
      expect(core.isInMockMode()).toBe(true);
      
      // Load ROM
      const romData = new Uint8Array(1024 * 1024);
      await core.loadROM(romData);
      
      // Set input
      core.setInput(0, SnesButton.A | SnesButton.B);
      
      // Run some frames
      for (let i = 0; i < 60; i++) {
        await core.runFrame();
      }
      
      // Get output
      const buffer = core.getBuffer();
      const audio = core.getAudioSamples();
      expect(buffer.width).toBe(256);
      expect(audio).toBeInstanceOf(Float32Array);
      
      // Save state
      const state = core.saveState();
      expect(state.length).toBeGreaterThan(0);
      
      // Continue running
      await core.runFrame();
      
      // Load state
      core.loadState(state);
      
      // Reset
      core.reset();
      
      // More frames
      await core.runFrame();
      
      // Get core info
      const info = core.getCoreInfo();
      expect(info.name).toBeDefined();
      
      // Cleanup
      core.cleanup();
    });
  });
});
