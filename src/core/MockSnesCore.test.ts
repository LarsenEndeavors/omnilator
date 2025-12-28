import { describe, it, expect, beforeEach } from 'vitest';
import { MockSnesCore } from './MockSnesCore';
import { SnesButton } from './IEmulatorCore';

describe('MockSnesCore', () => {
  let core: MockSnesCore;

  beforeEach(() => {
    core = new MockSnesCore();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(core.initialize()).resolves.toBeUndefined();
    });

    it('should allow multiple initializations', async () => {
      await core.initialize();
      await expect(core.initialize()).resolves.toBeUndefined();
    });
  });

  describe('ROM loading', () => {
    it('should accept ROM data', async () => {
      await core.initialize();
      const romData = new Uint8Array([1, 2, 3, 4]);
      await expect(core.loadROM(romData)).resolves.toBeUndefined();
    });

    it('should accept empty ROM data', async () => {
      await core.initialize();
      const romData = new Uint8Array(0);
      await expect(core.loadROM(romData)).resolves.toBeUndefined();
    });

    it('should accept large ROM data', async () => {
      await core.initialize();
      const romData = new Uint8Array(4 * 1024 * 1024); // 4MB
      await expect(core.loadROM(romData)).resolves.toBeUndefined();
    });
  });

  describe('frame execution', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should run a frame', async () => {
      await expect(core.runFrame()).resolves.toBeUndefined();
    });

    it('should run multiple frames', async () => {
      await core.runFrame();
      await core.runFrame();
      await expect(core.runFrame()).resolves.toBeUndefined();
    });

    it('should throw if not initialized', async () => {
      const uninitializedCore = new MockSnesCore();
      await expect(uninitializedCore.runFrame()).rejects.toThrow('Emulator not initialized');
    });
  });

  describe('video buffer', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should return ImageData with correct dimensions', () => {
      const buffer = core.getBuffer();
      expect(buffer).toBeInstanceOf(ImageData);
      expect(buffer.width).toBe(256);
      expect(buffer.height).toBe(224);
    });

    it('should return RGBA data', () => {
      const buffer = core.getBuffer();
      expect(buffer.data.length).toBe(256 * 224 * 4);
    });

    it('should update buffer on each frame', async () => {
      const buffer1 = core.getBuffer();
      await core.runFrame();
      const buffer2 = core.getBuffer();
      // Buffers should be different objects but both valid
      expect(buffer1).not.toBe(buffer2);
      expect(buffer2.width).toBe(256);
    });

    it('should have valid pixel data', () => {
      const buffer = core.getBuffer();
      // Check that pixels are valid RGBA values (0-255)
      for (let i = 0; i < buffer.data.length; i++) {
        expect(buffer.data[i]).toBeGreaterThanOrEqual(0);
        expect(buffer.data[i]).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('audio samples', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should return Float32Array', () => {
      const samples = core.getAudioSamples();
      expect(samples).toBeInstanceOf(Float32Array);
    });

    it('should return stereo samples', () => {
      const samples = core.getAudioSamples();
      expect(samples.length).toBe(2048);
      expect(samples.length % 2).toBe(0); // Should be even for stereo
    });

    it('should have samples in valid range', () => {
      const samples = core.getAudioSamples();
      for (let i = 0; i < samples.length; i++) {
        expect(samples[i]).toBeGreaterThanOrEqual(-1);
        expect(samples[i]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('input handling', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should accept input for port 0', () => {
      expect(() => core.setInput(0, SnesButton.A)).not.toThrow();
    });

    it('should accept input for all valid ports', () => {
      expect(() => core.setInput(0, SnesButton.A)).not.toThrow();
      expect(() => core.setInput(1, SnesButton.B)).not.toThrow();
      expect(() => core.setInput(2, SnesButton.X)).not.toThrow();
      expect(() => core.setInput(3, SnesButton.Y)).not.toThrow();
    });

    it('should reject invalid port numbers', () => {
      expect(() => core.setInput(-1, SnesButton.A)).toThrow('Invalid port number');
      expect(() => core.setInput(4, SnesButton.A)).toThrow('Invalid port number');
      expect(() => core.setInput(100, SnesButton.A)).toThrow('Invalid port number');
    });

    it('should accept combined button inputs', () => {
      const buttons = SnesButton.A | SnesButton.B | SnesButton.START;
      expect(() => core.setInput(0, buttons)).not.toThrow();
    });

    it('should accept all buttons pressed simultaneously', () => {
      const allButtons = 
        SnesButton.A | SnesButton.B | SnesButton.X | SnesButton.Y |
        SnesButton.L | SnesButton.R | SnesButton.START | SnesButton.SELECT |
        SnesButton.UP | SnesButton.DOWN | SnesButton.LEFT | SnesButton.RIGHT;
      expect(() => core.setInput(0, allButtons)).not.toThrow();
    });

    it('should accept zero (no buttons)', () => {
      expect(() => core.setInput(0, 0)).not.toThrow();
    });
  });

  describe('save states', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should create a save state', () => {
      const state = core.saveState();
      expect(state).toBeInstanceOf(Uint8Array);
      expect(state.length).toBeGreaterThan(0);
    });

    it('should load a save state', () => {
      const state = new Uint8Array(1024);
      expect(() => core.loadState(state)).not.toThrow();
    });

    it('should handle empty state data', () => {
      const state = new Uint8Array(0);
      expect(() => core.loadState(state)).not.toThrow();
    });

    it('should create consistent state size', () => {
      const state1 = core.saveState();
      const state2 = core.saveState();
      expect(state1.length).toBe(state2.length);
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should reset without errors', () => {
      expect(() => core.reset()).not.toThrow();
    });

    it('should reset after running frames', async () => {
      await core.runFrame();
      await core.runFrame();
      expect(() => core.reset()).not.toThrow();
    });

    it('should still work after reset', async () => {
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

    it('should allow reinitialization after cleanup', async () => {
      core.cleanup();
      await expect(core.initialize()).resolves.toBeUndefined();
    });
  });

  describe('integration', () => {
    it('should handle full lifecycle', async () => {
      // Initialize
      await core.initialize();
      
      // Load ROM
      const romData = new Uint8Array(512 * 1024);
      await core.loadROM(romData);
      
      // Set input
      core.setInput(0, SnesButton.A | SnesButton.START);
      
      // Run frames
      for (let i = 0; i < 60; i++) {
        await core.runFrame();
      }
      
      // Get output
      const buffer = core.getBuffer();
      const audio = core.getAudioSamples();
      expect(buffer.width).toBe(256);
      expect(audio.length).toBe(2048);
      
      // Save state
      const state = core.saveState();
      expect(state.length).toBeGreaterThan(0);
      
      // Load state
      core.loadState(state);
      
      // Reset
      core.reset();
      
      // Continue running
      await core.runFrame();
      
      // Cleanup
      core.cleanup();
    });
  });
});
