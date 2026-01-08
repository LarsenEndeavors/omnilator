import { describe, it, expect } from 'vitest';
import { SnesCore } from './SnesCore';

describe('SnesCore', () => {
  describe('constructor', () => {
    it('should create instance successfully', () => {
      const core = new SnesCore();
      expect(core).toBeDefined();
    });
  });

  describe('interface compliance', () => {
    it('should implement IEmulatorCore interface', () => {
      const core = new SnesCore();
      
      // Check all required methods exist
      expect(typeof core.initialize).toBe('function');
      expect(typeof core.loadROM).toBe('function');
      expect(typeof core.runFrame).toBe('function');
      expect(typeof core.getBuffer).toBe('function');
      expect(typeof core.getAudioSamples).toBe('function');
      expect(typeof core.setInput).toBe('function');
      expect(typeof core.saveState).toBe('function');
      expect(typeof core.loadState).toBe('function');
      expect(typeof core.reset).toBe('function');
      expect(typeof core.cleanup).toBe('function');
    });

    it('should have getCanvas method for RetroArch canvas', () => {
      const core = new SnesCore();
      expect(typeof core.getCanvas).toBe('function');
    });
  });

  // Note: Full integration tests skipped as they require:
  // 1. Emulatrix WASM files to be loaded
  // 2. DOM environment for canvas
  // 3. Browser globals (Module, FS)
  // These should be tested manually or in e2e tests
});
