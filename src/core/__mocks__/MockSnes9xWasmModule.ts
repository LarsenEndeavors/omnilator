/**
 * Mock implementation of Snes9xWasmModule for unit testing.
 * 
 * This mock provides a controllable, deterministic implementation of the
 * snes9x2005-wasm module interface for testing purposes. All methods are
 * implemented using vitest's `vi.fn()` for spy/stub functionality.
 * 
 * Features:
 * - All methods mocked with vi.fn() for test assertions
 * - Realistic mock data generation (video, audio)
 * - Controllable behaviors for different test scenarios
 * - Helper methods for common test setups
 * - Memory simulation for allocation/deallocation
 * - State persistence for save/load testing
 * 
 * @module MockSnes9xWasmModule
 */

import { vi } from 'vitest';
import type { Snes9xWasmModule } from '../types/Snes9xWasmModule';
import { VideoBufferConstants, AudioBufferConstants } from '../types/Snes9xWasmModule';

/**
 * Configuration options for the mock module.
 */
export interface MockModuleOptions {
  /**
   * Initial heap size in bytes.
   * Default: 16MB (16 * 1024 * 1024)
   */
  heapSize?: number;
  
  /**
   * Whether memory allocation should fail.
   * Default: false
   */
  failAllocation?: boolean;
  
  /**
   * Whether ROM loading should fail.
   * Default: false
   */
  failRomLoad?: boolean;
  
  /**
   * Whether state operations should fail.
   * Default: false
   */
  failStateOperations?: boolean;
  
  /**
   * SRAM size in bytes (0 = no SRAM).
   * Default: 8192 (8KB)
   */
  sramSize?: number;
  
  /**
   * Save state size in bytes.
   * Default: 262144 (256KB)
   */
  stateSize?: number;
}

/**
 * Mock implementation of Snes9xWasmModule for testing.
 * 
 * This class provides a complete mock of the WASM module with controllable
 * behavior for testing. All methods use vi.fn() for spying and stubbing.
 * 
 * @example
 * ```typescript
 * const mock = new MockSnes9xWasmModule();
 * 
 * // Use in tests
 * const ptr = mock._my_malloc(1024);
 * expect(mock._my_malloc).toHaveBeenCalledWith(1024);
 * 
 * // Control behavior
 * mock.setOptions({ failAllocation: true });
 * expect(mock._my_malloc(1024)).toBe(0);
 * ```
 */
export class MockSnes9xWasmModule implements Snes9xWasmModule {
  // ========================================================================
  // Configuration and State
  // ========================================================================
  
  private options: Required<MockModuleOptions>;
  private nextPointer = 0x10000; // Start allocations at 64KB
  private allocatedPointers = new Set<number>();
  private romLoaded = false;
  private frameCount = 0;
  private inputState = 0;
  private sramData: Uint8Array | null = null;
  private stateData: Uint8Array | null = null;
  
  // ========================================================================
  // Memory Views
  // ========================================================================
  
  private memory: ArrayBuffer;
  
  HEAP8: Int8Array;
  HEAPU8: Uint8Array;
  HEAP16: Int16Array;
  HEAPU16: Uint16Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  
  // ========================================================================
  // Mock Functions (vi.fn())
  // ========================================================================
  
  _my_malloc = vi.fn((length: number): number => {
    return this.mockMalloc(length);
  });
  
  _my_free = vi.fn((ptr: number): void => {
    this.mockFree(ptr);
  });
  
  _startWithRom = vi.fn((romPtr: number, romLength: number, sampleRate: number): void => {
    this.mockStartWithRom(romPtr, romLength, sampleRate);
  });
  
  _mainLoop = vi.fn((): void => {
    this.mockMainLoop();
  });
  
  _setJoypadInput = vi.fn((input: number): void => {
    this.inputState = input;
  });
  
  _getScreenBuffer = vi.fn((): number => {
    return this.mockGetScreenBuffer();
  });
  
  _getSoundBuffer = vi.fn((): number => {
    return this.mockGetSoundBuffer();
  });
  
  _saveSramRequest = vi.fn((): void => {
    this.mockSaveSramRequest();
  });
  
  _getSaveSramSize = vi.fn((): number => {
    return this.sramData?.length ?? 0;
  });
  
  _getSaveSram = vi.fn((): number => {
    return this.mockGetSaveSram();
  });
  
  _loadSram = vi.fn((sramSize: number, sramPtr: number): void => {
    this.mockLoadSram(sramSize, sramPtr);
  });
  
  _getStateSaveSize = vi.fn((): number => {
    return this.options.stateSize;
  });
  
  _saveState = vi.fn((): number => {
    return this.mockSaveState();
  });
  
  _loadState = vi.fn((statePtr: number, stateSize: number): boolean => {
    return this.mockLoadState(statePtr, stateSize);
  });
  
  cwrap: Snes9xWasmModule['cwrap'] = vi.fn();
  
  // ========================================================================
  // Emscripten Module Properties
  // ========================================================================
  
  locateFile?: (path: string, scriptDirectory: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  onRuntimeInitialized?: () => void;
  onModuleLoaded?: () => void;
  onAbort?: (what: string) => void;
  noExitRuntime?: boolean;
  
  // ========================================================================
  // Constructor
  // ========================================================================
  
  /**
   * Create a new mock WASM module.
   * 
   * @param options - Configuration options for the mock
   */
  constructor(options: MockModuleOptions = {}) {
    this.options = {
      heapSize: options.heapSize ?? 16 * 1024 * 1024, // 16MB
      failAllocation: options.failAllocation ?? false,
      failRomLoad: options.failRomLoad ?? false,
      failStateOperations: options.failStateOperations ?? false,
      sramSize: options.sramSize ?? 8192, // 8KB
      stateSize: options.stateSize ?? 262144, // 256KB
    };
    
    // Initialize memory
    this.memory = new ArrayBuffer(this.options.heapSize);
    
    // Create typed array views
    this.HEAP8 = new Int8Array(this.memory);
    this.HEAPU8 = new Uint8Array(this.memory);
    this.HEAP16 = new Int16Array(this.memory);
    this.HEAPU16 = new Uint16Array(this.memory);
    this.HEAP32 = new Int32Array(this.memory);
    this.HEAPU32 = new Uint32Array(this.memory);
    this.HEAPF32 = new Float32Array(this.memory);
    this.HEAPF64 = new Float64Array(this.memory);
    
    // Initialize mock data
    this.initializeMockData();
  }
  
  // ========================================================================
  // Configuration Methods
  // ========================================================================
  
  /**
   * Update mock configuration options.
   * 
   * @param options - Partial options to update
   */
  setOptions(options: Partial<MockModuleOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Reset the mock to initial state.
   * Clears all allocations, frame count, and loaded ROM.
   */
  reset(): void {
    this.allocatedPointers.clear();
    this.nextPointer = 0x10000;
    this.romLoaded = false;
    this.frameCount = 0;
    this.inputState = 0;
    this.sramData = null;
    this.stateData = null;
    
    // Reset mock implementations (keeps vi.fn() wrappers intact)
    this._my_malloc.mockImplementation((length: number) => this.mockMalloc(length));
    this._my_free.mockImplementation((ptr: number) => this.mockFree(ptr));
    this._startWithRom.mockImplementation((romPtr: number, romLength: number, sampleRate: number) => 
      this.mockStartWithRom(romPtr, romLength, sampleRate));
    this._mainLoop.mockImplementation(() => this.mockMainLoop());
    this._setJoypadInput.mockImplementation((input: number) => { this.inputState = input; });
    this._getScreenBuffer.mockImplementation(() => this.mockGetScreenBuffer());
    this._getSoundBuffer.mockImplementation(() => this.mockGetSoundBuffer());
    this._saveSramRequest.mockImplementation(() => this.mockSaveSramRequest());
    this._getSaveSramSize.mockImplementation(() => this.sramData?.length ?? 0);
    this._getSaveSram.mockImplementation(() => this.mockGetSaveSram());
    this._loadSram.mockImplementation((sramSize: number, sramPtr: number) => 
      this.mockLoadSram(sramSize, sramPtr));
    this._getStateSaveSize.mockImplementation(() => this.options.stateSize);
    this._saveState.mockImplementation(() => this.mockSaveState());
    this._loadState.mockImplementation((statePtr: number, stateSize: number) => 
      this.mockLoadState(statePtr, stateSize));
    (this.cwrap as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => (() => {}));
    
    // Clear mock call history
    vi.clearAllMocks();
    
    // Reinitialize mock data
    this.initializeMockData();
  }
  
  /**
   * Get current mock state for inspection.
   */
  getMockState() {
    return {
      romLoaded: this.romLoaded,
      frameCount: this.frameCount,
      inputState: this.inputState,
      allocatedPointers: Array.from(this.allocatedPointers),
      sramSize: this.sramData?.length ?? 0,
      stateSize: this.stateData?.length ?? 0,
    };
  }
  
  // ========================================================================
  // Helper Methods for Testing
  // ========================================================================
  
  /**
   * Simulate a successful ROM load with default parameters.
   * Helper for quickly setting up a running emulator in tests.
   */
  simulateRomLoad(): void {
    const romData = new Uint8Array(512 * 1024); // 512KB mock ROM
    const ptr = this._my_malloc(romData.length);
    this.HEAPU8.set(romData, ptr);
    this._startWithRom(ptr, romData.length, 48000);
    this._my_free(ptr);
  }
  
  /**
   * Simulate running N frames of emulation.
   * Helper for advancing emulator state in tests.
   * 
   * @param frames - Number of frames to run (default: 60 = 1 second)
   */
  simulateFrames(frames = 60): void {
    for (let i = 0; i < frames; i++) {
      this._mainLoop();
    }
  }
  
  /**
   * Get the current video buffer as ImageData.
   * Helper for verifying video output in tests.
   */
  getVideoImageData(): ImageData {
    const ptr = this._getScreenBuffer();
    const buffer = new Uint8Array(
      this.HEAP8.buffer,
      ptr,
      VideoBufferConstants.TOTAL_SIZE
    );
    const imageData = new ImageData(
      VideoBufferConstants.WIDTH,
      VideoBufferConstants.HEIGHT
    );
    imageData.data.set(buffer);
    return imageData;
  }
  
  /**
   * Get the current audio buffer as Float32Array.
   * Helper for verifying audio output in tests.
   */
  getAudioFloat32Array(): Float32Array {
    const ptr = this._getSoundBuffer();
    return new Float32Array(
      this.HEAP8.buffer,
      ptr,
      AudioBufferConstants.TOTAL_SAMPLES
    );
  }
  
  // ========================================================================
  // Mock Implementation Details
  // ========================================================================
  
  private initializeMockData(): void {
    // Initialize video buffer with a test pattern
    // Video buffer needs 512 * 448 * 4 = 917,504 bytes
    // Place it at a safe location that won't overlap with allocations
    const videoPtr = 0x200000; // 2MB offset - plenty of room
    this.generateVideoTestPattern(videoPtr);
    
    // Initialize audio buffer with silence
    // Audio buffer needs 4096 * 4 = 16,384 bytes
    const audioPtr = 0x300000; // 3MB offset
    const audioView = new Float32Array(
      this.memory,
      audioPtr,
      AudioBufferConstants.TOTAL_SAMPLES
    );
    audioView.fill(0);
    
    // Initialize SRAM if configured
    if (this.options.sramSize > 0) {
      this.sramData = new Uint8Array(this.options.sramSize);
      // Fill with recognizable pattern for testing
      for (let i = 0; i < this.sramData.length; i++) {
        this.sramData[i] = i % 256;
      }
    }
  }
  
  private mockMalloc(length: number): number {
    if (this.options.failAllocation) {
      return 0;
    }
    
    const ptr = this.nextPointer;
    this.nextPointer += length;
    this.allocatedPointers.add(ptr);
    
    // Zero-initialize the allocated memory
    this.HEAPU8.fill(0, ptr, ptr + length);
    
    return ptr;
  }
  
  private mockFree(ptr: number): void {
    this.allocatedPointers.delete(ptr);
  }
  
  private mockStartWithRom(romPtr: number, romLength: number, sampleRate: number): void {
    if (this.options.failRomLoad) {
      throw new Error('Mock ROM load failure');
    }
    
    // Validate ROM data exists in memory
    if (romPtr + romLength > this.memory.byteLength) {
      throw new Error('ROM data out of bounds');
    }
    
    this.romLoaded = true;
    this.frameCount = 0;
    
    console.log(`Mock: ROM loaded (${romLength} bytes, ${sampleRate}Hz audio)`);
  }
  
  private mockMainLoop(): void {
    if (!this.romLoaded) {
      throw new Error('ROM not loaded');
    }
    
    this.frameCount++;
    
    // Update video buffer with animated content
    const videoPtr = 0x200000; // 2MB offset
    this.generateVideoFrame(videoPtr, this.frameCount);
    
    // Update audio buffer with generated samples
    const audioPtr = 0x300000; // 3MB offset
    this.generateAudioSamples(audioPtr, this.frameCount);
  }
  
  private mockGetScreenBuffer(): number {
    return 0x200000; // Fixed video buffer location (2MB offset)
  }
  
  private mockGetSoundBuffer(): number {
    return 0x300000; // Fixed audio buffer location (3MB offset)
  }
  
  private mockSaveSramRequest(): void {
    // Simulate copying SRAM to a buffer
    if (this.sramData && this.options.sramSize > 0) {
      // Update SRAM with some test data
      const sramPtr = 0x400000; // 4MB offset
      this.HEAPU8.set(this.sramData, sramPtr);
    }
  }
  
  private mockGetSaveSram(): number {
    if (!this.sramData || this.options.sramSize === 0) {
      return 0;
    }
    return 0x400000; // Fixed SRAM buffer location (4MB offset)
  }
  
  private mockLoadSram(sramSize: number, sramPtr: number): void {
    if (sramPtr + sramSize > this.memory.byteLength) {
      throw new Error('SRAM data out of bounds');
    }
    
    // Copy SRAM data from provided pointer
    this.sramData = new Uint8Array(sramSize);
    this.sramData.set(this.HEAPU8.subarray(sramPtr, sramPtr + sramSize));
    
    console.log(`Mock: SRAM loaded (${sramSize} bytes)`);
  }
  
  private mockSaveState(): number {
    if (this.options.failStateOperations) {
      return 0;
    }
    
    // Allocate memory for state
    const stateSize = this.options.stateSize;
    const statePtr = this.mockMalloc(stateSize);
    
    // Create state data with recognizable pattern
    this.stateData = new Uint8Array(stateSize);
    // Include frame count in state for verification
    const view = new DataView(this.stateData.buffer);
    view.setUint32(0, this.frameCount, true);
    view.setUint32(4, this.inputState, true);
    
    // Fill rest with pattern
    for (let i = 8; i < stateSize; i++) {
      this.stateData[i] = (i + this.frameCount) % 256;
    }
    
    // Copy to WASM memory
    this.HEAPU8.set(this.stateData, statePtr);
    
    return statePtr;
  }
  
  private mockLoadState(statePtr: number, stateSize: number): boolean {
    if (this.options.failStateOperations) {
      return false;
    }
    
    if (stateSize !== this.options.stateSize) {
      return false; // Wrong state size
    }
    
    if (statePtr + stateSize > this.memory.byteLength) {
      return false; // Out of bounds
    }
    
    // Read directly from WASM memory
    const view = new DataView(this.memory, statePtr, stateSize);
    this.frameCount = view.getUint32(0, true);
    this.inputState = view.getUint32(4, true);
    
    // Copy state data for internal storage
    this.stateData = new Uint8Array(stateSize);
    this.stateData.set(this.HEAPU8.subarray(statePtr, statePtr + stateSize));
    
    console.log(`Mock: State loaded (frame ${this.frameCount})`);
    
    return true;
  }
  
  // ========================================================================
  // Mock Data Generation
  // ========================================================================
  
  private generateVideoTestPattern(ptr: number): void {
    const width = VideoBufferConstants.WIDTH;
    const height = VideoBufferConstants.HEIGHT;
    
    // Generate a colorful test pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = ptr + (y * width + x) * 4;
        
        // Gradient pattern
        this.HEAPU8[offset] = (x * 255 / width) & 0xFF;     // R
        this.HEAPU8[offset + 1] = (y * 255 / height) & 0xFF; // G
        this.HEAPU8[offset + 2] = 128;                       // B
        this.HEAPU8[offset + 3] = 255;                       // A
      }
    }
  }
  
  private generateVideoFrame(ptr: number, frameCount: number): void {
    const width = VideoBufferConstants.WIDTH;
    const height = VideoBufferConstants.HEIGHT;
    const time = frameCount / 60; // Convert to seconds
    
    // Generate animated pattern based on input state and frame count
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = ptr + (y * width + x) * 4;
        
        // Create animated gradient influenced by input
        const r = Math.floor(128 + 127 * Math.sin(x / 32 + time + (this.inputState & 0xFF) / 255));
        const g = Math.floor(128 + 127 * Math.sin(y / 32 + time));
        const b = Math.floor(128 + 127 * Math.sin((x + y) / 32 + time));
        
        this.HEAPU8[offset] = r;
        this.HEAPU8[offset + 1] = g;
        this.HEAPU8[offset + 2] = b;
        this.HEAPU8[offset + 3] = 255;
      }
    }
  }
  
  private generateAudioSamples(ptr: number, frameCount: number): void {
    const samples = AudioBufferConstants.TOTAL_SAMPLES;
    const audioView = new Float32Array(this.memory, ptr, samples);
    const time = frameCount / 60;
    
    // Generate simple test tone (440 Hz sine wave at low volume)
    const frequency = 440; // A4
    const sampleRate = 48000;
    const amplitude = 0.1; // Low volume
    
    for (let i = 0; i < samples; i += 2) {
      const t = time + i / (2 * sampleRate);
      const value = amplitude * Math.sin(2 * Math.PI * frequency * t);
      
      audioView[i] = value;     // Left channel
      audioView[i + 1] = value; // Right channel
    }
  }
}

/**
 * Create a mock module with default settings.
 * Convenience function for tests.
 */
export function createMockModule(options?: MockModuleOptions): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule(options);
}

/**
 * Create a mock module configured for ROM load failure tests.
 */
export function createFailingRomLoadModule(): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule({ failRomLoad: true });
}

/**
 * Create a mock module configured for allocation failure tests.
 */
export function createFailingAllocationModule(): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule({ failAllocation: true });
}

/**
 * Create a mock module configured for state operation failure tests.
 */
export function createFailingStateModule(): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule({ failStateOperations: true });
}

/**
 * Create a mock module with no SRAM.
 */
export function createNoSramModule(): MockSnes9xWasmModule {
  return new MockSnes9xWasmModule({ sramSize: 0 });
}
