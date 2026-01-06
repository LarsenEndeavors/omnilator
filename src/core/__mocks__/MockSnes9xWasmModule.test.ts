/**
 * Unit tests for MockSnes9xWasmModule.
 * 
 * These tests verify that the mock WASM module correctly implements the
 * Snes9xWasmModule interface and provides controllable behavior for testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MockSnes9xWasmModule,
  createMockModule,
  createFailingRomLoadModule,
  createFailingAllocationModule,
  createFailingStateModule,
  createNoSramModule,
} from './MockSnes9xWasmModule';
import { VideoBufferConstants, AudioBufferConstants, SnesButtons } from '../types/Snes9xWasmModule';

describe('MockSnes9xWasmModule', () => {
  let mock: MockSnes9xWasmModule;

  beforeEach(() => {
    mock = new MockSnes9xWasmModule();
  });

  describe('construction', () => {
    it('should create a mock with default options', () => {
      expect(mock).toBeInstanceOf(MockSnes9xWasmModule);
      expect(mock.HEAP8).toBeInstanceOf(Int8Array);
      expect(mock.HEAPU8).toBeInstanceOf(Uint8Array);
    });

    it('should create memory views of correct size', () => {
      const heapSize = 16 * 1024 * 1024; // Default 16MB
      expect(mock.HEAP8.length).toBe(heapSize);
      expect(mock.HEAPU8.length).toBe(heapSize);
      expect(mock.HEAP16.length).toBe(heapSize / 2);
      expect(mock.HEAP32.length).toBe(heapSize / 4);
      expect(mock.HEAPF32.length).toBe(heapSize / 4);
    });

    it('should accept custom heap size', () => {
      const customHeapSize = 8 * 1024 * 1024; // 8MB
      const customMock = new MockSnes9xWasmModule({ heapSize: customHeapSize });
      expect(customMock.HEAP8.length).toBe(customHeapSize);
    });

    it('should initialize with test data', () => {
      const videoPtr = mock._getScreenBuffer();
      expect(videoPtr).toBeGreaterThan(0);
      
      const audioPtr = mock._getSoundBuffer();
      expect(audioPtr).toBeGreaterThan(0);
    });
  });

  describe('memory management', () => {
    it('should allocate memory', () => {
      const ptr = mock._my_malloc(1024);
      expect(ptr).toBeGreaterThan(0);
      expect(mock._my_malloc).toHaveBeenCalledWith(1024);
    });

    it('should track allocated pointers', () => {
      const ptr1 = mock._my_malloc(100);
      const ptr2 = mock._my_malloc(200);
      
      const state = mock.getMockState();
      expect(state.allocatedPointers).toContain(ptr1);
      expect(state.allocatedPointers).toContain(ptr2);
    });

    it('should free memory', () => {
      const ptr = mock._my_malloc(1024);
      mock._my_free(ptr);
      
      expect(mock._my_free).toHaveBeenCalledWith(ptr);
      
      const state = mock.getMockState();
      expect(state.allocatedPointers).not.toContain(ptr);
    });

    it('should zero-initialize allocated memory', () => {
      const ptr = mock._my_malloc(10);
      for (let i = 0; i < 10; i++) {
        expect(mock.HEAPU8[ptr + i]).toBe(0);
      }
    });

    it('should allocate sequential memory', () => {
      const ptr1 = mock._my_malloc(100);
      const ptr2 = mock._my_malloc(100);
      expect(ptr2).toBeGreaterThan(ptr1);
    });

    it('should fail allocation when configured', () => {
      mock.setOptions({ failAllocation: true });
      const ptr = mock._my_malloc(1024);
      expect(ptr).toBe(0);
    });
  });

  describe('ROM loading', () => {
    it('should load ROM successfully', () => {
      const romData = new Uint8Array(512 * 1024);
      const ptr = mock._my_malloc(romData.length);
      mock.HEAPU8.set(romData, ptr);
      
      expect(() => {
        mock._startWithRom(ptr, romData.length, 48000);
      }).not.toThrow();
      
      expect(mock._startWithRom).toHaveBeenCalledWith(ptr, romData.length, 48000);
      
      const state = mock.getMockState();
      expect(state.romLoaded).toBe(true);
      expect(state.frameCount).toBe(0);
      
      mock._my_free(ptr);
    });

    it('should reject out-of-bounds ROM', () => {
      const ptr = 999999999; // Invalid pointer
      const length = 1024;
      
      expect(() => {
        mock._startWithRom(ptr, length, 48000);
      }).toThrow('ROM data out of bounds');
    });

    it('should fail ROM load when configured', () => {
      mock.setOptions({ failRomLoad: true });
      const ptr = mock._my_malloc(1024);
      
      expect(() => {
        mock._startWithRom(ptr, 1024, 48000);
      }).toThrow('Mock ROM load failure');
      
      mock._my_free(ptr);
    });

    it('should reset frame count on ROM load', () => {
      mock.simulateRomLoad();
      mock.simulateFrames(100);
      
      let state = mock.getMockState();
      expect(state.frameCount).toBe(100);
      
      // Reload ROM
      mock.simulateRomLoad();
      
      state = mock.getMockState();
      expect(state.frameCount).toBe(0);
    });
  });

  describe('frame execution', () => {
    beforeEach(() => {
      mock.simulateRomLoad();
    });

    it('should run a frame', () => {
      expect(() => mock._mainLoop()).not.toThrow();
      expect(mock._mainLoop).toHaveBeenCalled();
    });

    it('should increment frame count', () => {
      mock._mainLoop();
      const state = mock.getMockState();
      expect(state.frameCount).toBe(1);
      
      mock._mainLoop();
      const state2 = mock.getMockState();
      expect(state2.frameCount).toBe(2);
    });

    it('should require ROM to be loaded', () => {
      const emptyMock = new MockSnes9xWasmModule();
      expect(() => emptyMock._mainLoop()).toThrow('ROM not loaded');
    });

    it('should update video buffer', () => {
      const videoPtr = mock._getScreenBuffer();
      const before = new Uint8Array(mock.HEAPU8.buffer, videoPtr, 100);
      const beforeCopy = new Uint8Array(before);
      
      mock._mainLoop();
      
      const after = new Uint8Array(mock.HEAPU8.buffer, videoPtr, 100);
      
      // At least some pixels should change
      let changed = false;
      for (let i = 0; i < 100; i++) {
        if (beforeCopy[i] !== after[i]) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });

    it('should update audio buffer', () => {
      mock._mainLoop();
      const audioPtr = mock._getSoundBuffer();
      const audio = new Float32Array(mock.HEAP8.buffer, audioPtr, 100);
      
      // Should contain non-zero audio samples
      let hasAudio = false;
      for (let i = 0; i < 100; i++) {
        if (audio[i] !== 0) {
          hasAudio = true;
          break;
        }
      }
      expect(hasAudio).toBe(true);
    });
  });

  describe('input handling', () => {
    it('should set input state', () => {
      const input = SnesButtons.A | SnesButtons.START;
      mock._setJoypadInput(input);
      
      expect(mock._setJoypadInput).toHaveBeenCalledWith(input);
      
      const state = mock.getMockState();
      expect(state.inputState).toBe(input);
    });

    it('should accept all button combinations', () => {
      const allButtons = 
        SnesButtons.A | SnesButtons.B | SnesButtons.X | SnesButtons.Y |
        SnesButtons.L | SnesButtons.R | SnesButtons.START | SnesButtons.SELECT |
        SnesButtons.UP | SnesButtons.DOWN | SnesButtons.LEFT | SnesButtons.RIGHT;
      
      expect(() => mock._setJoypadInput(allButtons)).not.toThrow();
    });

    it('should accept zero input', () => {
      mock._setJoypadInput(0);
      const state = mock.getMockState();
      expect(state.inputState).toBe(0);
    });
  });

  describe('video output', () => {
    beforeEach(() => {
      mock.simulateRomLoad();
    });

    it('should return video buffer pointer', () => {
      const ptr = mock._getScreenBuffer();
      expect(ptr).toBeGreaterThan(0);
      expect(mock._getScreenBuffer).toHaveBeenCalled();
    });

    it('should provide valid RGBA data', () => {
      const ptr = mock._getScreenBuffer();
      const buffer = new Uint8Array(
        mock.HEAP8.buffer,
        ptr,
        VideoBufferConstants.TOTAL_SIZE
      );
      
      // Check a few pixels
      for (let i = 0; i < 100; i += 4) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];
        const a = buffer[i + 3];
        
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(255);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(255);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(255);
        expect(a).toBe(255); // Alpha should be opaque
      }
    });

    it('should return correct buffer size', () => {
      const imageData = mock.getVideoImageData();
      expect(imageData.width).toBe(VideoBufferConstants.WIDTH);
      expect(imageData.height).toBe(VideoBufferConstants.HEIGHT);
      expect(imageData.data.length).toBe(VideoBufferConstants.TOTAL_SIZE);
    });

    it('should animate video over frames', () => {
      mock._mainLoop();
      const frame1 = mock.getVideoImageData();
      
      mock._mainLoop();
      const frame2 = mock.getVideoImageData();
      
      // Frames should be different (animation)
      let different = false;
      for (let i = 0; i < 1000; i++) {
        if (frame1.data[i] !== frame2.data[i]) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });
  });

  describe('audio output', () => {
    beforeEach(() => {
      mock.simulateRomLoad();
    });

    it('should return audio buffer pointer', () => {
      const ptr = mock._getSoundBuffer();
      expect(ptr).toBeGreaterThan(0);
      expect(mock._getSoundBuffer).toHaveBeenCalled();
    });

    it('should provide valid float32 audio', () => {
      const audio = mock.getAudioFloat32Array();
      expect(audio.length).toBe(AudioBufferConstants.TOTAL_SAMPLES);
      
      // Check samples are in valid range [-1, 1]
      for (let i = 0; i < audio.length; i++) {
        expect(audio[i]).toBeGreaterThanOrEqual(-1);
        expect(audio[i]).toBeLessThanOrEqual(1);
      }
    });

    it('should provide interleaved stereo', () => {
      mock._mainLoop();
      const audio = mock.getAudioFloat32Array();
      
      // Samples should be interleaved: L, R, L, R, ...
      // For our test tone, L and R should be the same
      for (let i = 0; i < 100; i += 2) {
        expect(audio[i]).toBe(audio[i + 1]);
      }
    });

    it('should generate continuous audio', () => {
      mock._mainLoop();
      const audio = mock.getAudioFloat32Array();
      
      // Should have some non-zero samples
      let hasSound = false;
      for (let i = 0; i < audio.length; i++) {
        if (audio[i] !== 0) {
          hasSound = true;
          break;
        }
      }
      expect(hasSound).toBe(true);
    });
  });

  describe('SRAM operations', () => {
    it('should request SRAM save', () => {
      expect(() => mock._saveSramRequest()).not.toThrow();
      expect(mock._saveSramRequest).toHaveBeenCalled();
    });

    it('should return SRAM size', () => {
      mock._saveSramRequest();
      const size = mock._getSaveSramSize();
      expect(size).toBe(8192); // Default 8KB
      expect(mock._getSaveSramSize).toHaveBeenCalled();
    });

    it('should return SRAM pointer', () => {
      mock._saveSramRequest();
      const ptr = mock._getSaveSram();
      expect(ptr).toBeGreaterThan(0);
      expect(mock._getSaveSram).toHaveBeenCalled();
    });

    it('should provide valid SRAM data', () => {
      mock._saveSramRequest();
      const size = mock._getSaveSramSize();
      const ptr = mock._getSaveSram();
      
      const sram = new Uint8Array(mock.HEAP8.buffer, ptr, size);
      expect(sram.length).toBe(size);
      
      // Check pattern (filled with i % 256)
      for (let i = 0; i < Math.min(100, size); i++) {
        expect(sram[i]).toBe(i % 256);
      }
    });

    it('should load SRAM', () => {
      const sramData = new Uint8Array(8192);
      for (let i = 0; i < sramData.length; i++) {
        sramData[i] = (255 - i) % 256;
      }
      
      const ptr = mock._my_malloc(sramData.length);
      mock.HEAPU8.set(sramData, ptr);
      
      expect(() => {
        mock._loadSram(sramData.length, ptr);
      }).not.toThrow();
      
      expect(mock._loadSram).toHaveBeenCalledWith(sramData.length, ptr);
      
      mock._my_free(ptr);
    });

    it('should handle no SRAM', () => {
      const noSramMock = createNoSramModule();
      noSramMock._saveSramRequest();
      
      expect(noSramMock._getSaveSramSize()).toBe(0);
      expect(noSramMock._getSaveSram()).toBe(0);
    });

    it('should reject out-of-bounds SRAM', () => {
      const ptr = 999999999; // Invalid pointer
      expect(() => {
        mock._loadSram(1024, ptr);
      }).toThrow('SRAM data out of bounds');
    });
  });

  describe('save state operations', () => {
    beforeEach(() => {
      mock.simulateRomLoad();
    });

    it('should return state size', () => {
      const size = mock._getStateSaveSize();
      expect(size).toBe(262144); // Default 256KB
      expect(mock._getStateSaveSize).toHaveBeenCalled();
    });

    it('should save state', () => {
      const ptr = mock._saveState();
      expect(ptr).toBeGreaterThan(0);
      expect(mock._saveState).toHaveBeenCalled();
    });

    it('should include frame count in state', () => {
      mock.simulateFrames(42);
      const statePtr = mock._saveState();
      
      const view = new DataView(mock.HEAP8.buffer, statePtr, 8);
      const frameCount = view.getUint32(0, true);
      expect(frameCount).toBe(42);
    });

    it('should load state', () => {
      // Save at frame 50
      mock.simulateFrames(50);
      const statePtr = mock._saveState();
      const stateSize = mock._getStateSaveSize();
      
      // Continue to frame 100
      mock.simulateFrames(50);
      expect(mock.getMockState().frameCount).toBe(100);
      
      // Load state (should restore to frame 50)
      const success = mock._loadState(statePtr, stateSize);
      expect(success).toBe(true);
      expect(mock._loadState).toHaveBeenCalledWith(statePtr, stateSize);
      expect(mock.getMockState().frameCount).toBe(50);
    });

    it('should reject wrong state size', () => {
      const statePtr = mock._saveState();
      const wrongSize = 1024; // Wrong size
      
      const success = mock._loadState(statePtr, wrongSize);
      expect(success).toBe(false);
    });

    it('should reject out-of-bounds state', () => {
      const ptr = 999999999; // Invalid pointer
      const size = mock._getStateSaveSize();
      
      const success = mock._loadState(ptr, size);
      expect(success).toBe(false);
    });

    it('should fail when configured', () => {
      mock.setOptions({ failStateOperations: true });
      
      const savePtr = mock._saveState();
      expect(savePtr).toBe(0);
      
      const loadSuccess = mock._loadState(0x1000, 1024);
      expect(loadSuccess).toBe(false);
    });

    it('should preserve input state', () => {
      mock._setJoypadInput(SnesButtons.A | SnesButtons.B);
      const statePtr = mock._saveState();
      const stateSize = mock._getStateSaveSize();
      
      mock._setJoypadInput(0);
      expect(mock.getMockState().inputState).toBe(0);
      
      mock._loadState(statePtr, stateSize);
      expect(mock.getMockState().inputState).toBe(SnesButtons.A | SnesButtons.B);
    });
  });

  describe('configuration', () => {
    it('should update options', () => {
      mock.setOptions({ failAllocation: true });
      expect(mock._my_malloc(1024)).toBe(0);
      
      mock.setOptions({ failAllocation: false });
      expect(mock._my_malloc(1024)).toBeGreaterThan(0);
    });

    it('should reset to initial state', () => {
      mock.simulateRomLoad();
      mock.simulateFrames(100);
      mock._setJoypadInput(SnesButtons.START);
      
      let state = mock.getMockState();
      expect(state.romLoaded).toBe(true);
      expect(state.frameCount).toBe(100);
      
      mock.reset();
      
      state = mock.getMockState();
      expect(state.romLoaded).toBe(false);
      expect(state.frameCount).toBe(0);
      expect(state.inputState).toBe(0);
      expect(state.allocatedPointers.length).toBe(0);
    });

    it('should clear mock call history on reset', () => {
      mock._my_malloc(1024);
      expect(mock._my_malloc).toHaveBeenCalled();
      
      mock.reset();
      expect(mock._my_malloc).not.toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    it('should simulate ROM load', () => {
      expect(() => mock.simulateRomLoad()).not.toThrow();
      expect(mock.getMockState().romLoaded).toBe(true);
    });

    it('should simulate frames', () => {
      mock.simulateRomLoad();
      mock.simulateFrames(60);
      
      expect(mock.getMockState().frameCount).toBe(60);
      expect(mock._mainLoop).toHaveBeenCalledTimes(60);
    });

    it('should get video as ImageData', () => {
      mock.simulateRomLoad();
      const imageData = mock.getVideoImageData();
      
      expect(imageData).toBeInstanceOf(ImageData);
      expect(imageData.width).toBe(VideoBufferConstants.WIDTH);
      expect(imageData.height).toBe(VideoBufferConstants.HEIGHT);
    });

    it('should get audio as Float32Array', () => {
      mock.simulateRomLoad();
      mock._mainLoop();
      const audio = mock.getAudioFloat32Array();
      
      expect(audio).toBeInstanceOf(Float32Array);
      expect(audio.length).toBe(AudioBufferConstants.TOTAL_SAMPLES);
    });

    it('should get mock state', () => {
      mock.simulateRomLoad();
      const state = mock.getMockState();
      
      expect(state).toHaveProperty('romLoaded');
      expect(state).toHaveProperty('frameCount');
      expect(state).toHaveProperty('inputState');
      expect(state).toHaveProperty('allocatedPointers');
      expect(state).toHaveProperty('sramSize');
      expect(state).toHaveProperty('stateSize');
    });
  });

  describe('convenience factories', () => {
    it('should create default mock', () => {
      const defaultMock = createMockModule();
      expect(defaultMock).toBeInstanceOf(MockSnes9xWasmModule);
    });

    it('should create failing ROM load mock', () => {
      const failMock = createFailingRomLoadModule();
      const ptr = failMock._my_malloc(1024);
      
      expect(() => {
        failMock._startWithRom(ptr, 1024, 48000);
      }).toThrow('Mock ROM load failure');
    });

    it('should create failing allocation mock', () => {
      const failMock = createFailingAllocationModule();
      expect(failMock._my_malloc(1024)).toBe(0);
    });

    it('should create failing state mock', () => {
      const failMock = createFailingStateModule();
      failMock.simulateRomLoad();
      
      expect(failMock._saveState()).toBe(0);
      expect(failMock._loadState(0x1000, 1024)).toBe(false);
    });

    it('should create no SRAM mock', () => {
      const noSramMock = createNoSramModule();
      noSramMock._saveSramRequest();
      
      expect(noSramMock._getSaveSramSize()).toBe(0);
      expect(noSramMock._getSaveSram()).toBe(0);
    });

    it('should accept custom options', () => {
      const customMock = createMockModule({ 
        heapSize: 8 * 1024 * 1024,
        stateSize: 128 * 1024,
      });
      
      expect(customMock.HEAP8.length).toBe(8 * 1024 * 1024);
      expect(customMock._getStateSaveSize()).toBe(128 * 1024);
    });
  });

  describe('integration', () => {
    it('should support full emulation workflow', () => {
      // Initialize
      const module = createMockModule();
      
      // Load ROM
      module.simulateRomLoad();
      expect(module.getMockState().romLoaded).toBe(true);
      
      // Set input
      module._setJoypadInput(SnesButtons.A | SnesButtons.START);
      
      // Run frames
      module.simulateFrames(60);
      expect(module.getMockState().frameCount).toBe(60);
      
      // Get video
      const video = module.getVideoImageData();
      expect(video.width).toBe(VideoBufferConstants.WIDTH);
      
      // Get audio
      const audio = module.getAudioFloat32Array();
      expect(audio.length).toBe(AudioBufferConstants.TOTAL_SAMPLES);
      
      // Save state
      const statePtr = module._saveState();
      expect(statePtr).toBeGreaterThan(0);
      
      // Continue
      module.simulateFrames(60);
      expect(module.getMockState().frameCount).toBe(120);
      
      // Load state
      const success = module._loadState(statePtr, module._getStateSaveSize());
      expect(success).toBe(true);
      expect(module.getMockState().frameCount).toBe(60);
      
      // SRAM operations
      module._saveSramRequest();
      const sramSize = module._getSaveSramSize();
      expect(sramSize).toBeGreaterThan(0);
      
      const sramPtr = module._getSaveSram();
      expect(sramPtr).toBeGreaterThan(0);
    });

    it('should support test scenario: memory management', () => {
      const module = createMockModule();
      
      // Allocate multiple buffers
      const ptrs: number[] = [];
      for (let i = 0; i < 10; i++) {
        ptrs.push(module._my_malloc(1024));
      }
      
      // Verify allocations
      expect(module.getMockState().allocatedPointers.length).toBe(10);
      
      // Free half
      for (let i = 0; i < 5; i++) {
        module._my_free(ptrs[i]);
      }
      
      expect(module.getMockState().allocatedPointers.length).toBe(5);
      
      // Free rest
      for (let i = 5; i < 10; i++) {
        module._my_free(ptrs[i]);
      }
      
      expect(module.getMockState().allocatedPointers.length).toBe(0);
    });

    it('should support test scenario: error conditions', () => {
      const module = createMockModule();
      
      // Should fail without ROM
      expect(() => module._mainLoop()).toThrow('ROM not loaded');
      
      // Load ROM
      module.simulateRomLoad();
      
      // Should work now
      expect(() => module._mainLoop()).not.toThrow();
      
      // Test allocation failure
      module.setOptions({ failAllocation: true });
      expect(module._my_malloc(1024)).toBe(0);
      
      // Test state failure
      module.setOptions({ failStateOperations: true });
      expect(module._saveState()).toBe(0);
    });
  });

  describe('vitest mock functions', () => {
    it('should spy on all exported methods', () => {
      mock.simulateRomLoad();
      
      // Verify methods were called
      expect(mock._my_malloc).toHaveBeenCalled();
      expect(mock._startWithRom).toHaveBeenCalled();
      expect(mock._my_free).toHaveBeenCalled();
    });

    it('should allow call count verification', () => {
      mock.simulateRomLoad();
      mock.simulateFrames(10);
      
      expect(mock._mainLoop).toHaveBeenCalledTimes(10);
    });

    it('should allow argument verification', () => {
      const input = SnesButtons.A;
      mock._setJoypadInput(input);
      
      expect(mock._setJoypadInput).toHaveBeenCalledWith(input);
    });

    it('should allow custom mock implementations', () => {
      // Override behavior for testing
      mock._my_malloc.mockImplementationOnce(() => 0x99999);
      
      const ptr = mock._my_malloc(1024);
      expect(ptr).toBe(0x99999);
    });

    it('should reset mock history', () => {
      mock.simulateRomLoad();
      mock._mainLoop();
      expect(mock._mainLoop).toHaveBeenCalled();
      
      vi.clearAllMocks();
      expect(mock._mainLoop).not.toHaveBeenCalled();
      
      // After clearing, mock should still work (need to reload ROM)
      mock.simulateRomLoad();
      mock._mainLoop();
      expect(mock._mainLoop).toHaveBeenCalledTimes(1);
    });
  });
});
