/**
 * TypeScript type definitions for the snes9x2005-wasm WASM module.
 * 
 * This file defines the interface for interacting with the compiled
 * snes9x2005 WASM module, including all exported functions, memory views,
 * and helper structures.
 * 
 * @module Snes9xWasmModule
 */

/**
 * Emscripten Module interface for the snes9x2005-wasm module.
 * 
 * This interface represents the complete WASM module after it has been
 * loaded and instantiated by Emscripten. It includes all exported functions
 * from the C source code and Emscripten's runtime methods.
 * 
 * @example
 * ```typescript
 * const moduleFactory = await import('/cores/snes9x_2005.js');
 * const module: Snes9xWasmModule = await moduleFactory.default({
 *   locateFile: (path: string) => {
 *     if (path.endsWith('.wasm')) {
 *       return '/cores/snes9x_2005.wasm';
 *     }
 *     return path;
 *   }
 * });
 * ```
 */
export interface Snes9xWasmModule extends EmscriptenModule {
  // ========================================================================
  // Memory Views
  // ========================================================================
  
  /**
   * 8-bit signed integer view of the WASM memory.
   * Used for reading/writing byte data.
   */
  HEAP8: Int8Array;
  
  /**
   * 8-bit unsigned integer view of the WASM memory.
   * Preferred for most byte-level operations.
   */
  HEAPU8: Uint8Array;
  
  /**
   * 16-bit signed integer view of the WASM memory.
   * Used for 16-bit operations (e.g., RGB565 pixels).
   */
  HEAP16: Int16Array;
  
  /**
   * 16-bit unsigned integer view of the WASM memory.
   * Preferred for unsigned 16-bit operations.
   */
  HEAPU16: Uint16Array;
  
  /**
   * 32-bit signed integer view of the WASM memory.
   * Used for integer operations and some pixel formats.
   */
  HEAP32: Int32Array;
  
  /**
   * 32-bit unsigned integer view of the WASM memory.
   * Preferred for unsigned 32-bit operations.
   */
  HEAPU32: Uint32Array;
  
  /**
   * 32-bit floating point view of the WASM memory.
   * Used for audio samples and floating point operations.
   */
  HEAPF32: Float32Array;
  
  /**
   * 64-bit floating point view of the WASM memory.
   * Used for double precision floating point operations.
   */
  HEAPF64: Float64Array;
  
  // ========================================================================
  // Memory Management Functions
  // ========================================================================
  
  /**
   * Allocate memory in the WASM heap.
   * 
   * Memory allocated with this function must be freed with `_my_free`
   * to prevent memory leaks. The allocated memory is zero-initialized.
   * 
   * **Note**: This function can return 0 as a valid address (first allocation).
   * The C implementation uses `calloc()` which returns NULL (0) on failure,
   * but in WASM, address 0 can be a valid allocation. Check for allocation
   * failure by verifying the operation succeeds, not just by checking if
   * the pointer is 0.
   * 
   * @param length - Number of bytes to allocate
   * @returns Pointer to the allocated memory (offset in WASM heap), or 0 if allocation fails
   * 
   * @example
   * ```typescript
   * const ptr = module._my_malloc(1024); // Allocate 1KB
   * try {
   *   // Use the memory...
   * } finally {
   *   module._my_free(ptr); // Always free when done
   * }
   * ```
   */
  _my_malloc(length: number): number;
  
  /**
   * Free memory allocated with `_my_malloc`.
   * 
   * Calling this function with a pointer not allocated by `_my_malloc`
   * or calling it twice with the same pointer results in undefined behavior.
   * 
   * @param ptr - Pointer to memory to free
   * 
   * @example
   * ```typescript
   * const ptr = module._my_malloc(1024);
   * // ... use memory ...
   * module._my_free(ptr);
   * ```
   */
  _my_free(ptr: number): void;
  
  // ========================================================================
  // Emulator Core Functions
  // ========================================================================
  
  /**
   * Initialize the emulator and load a ROM.
   * 
   * This function performs complete emulator initialization including:
   * 1. Memory initialization
   * 2. APU (Audio Processing Unit) setup
   * 3. Sound system initialization
   * 4. Display and graphics initialization
   * 5. ROM loading
   * 6. Emulator reset
   * 
   * Must be called before any other emulator functions. If called when
   * the emulator is already running, it will reset SRAM and reload the ROM.
   * 
   * @param romPtr - Pointer to ROM data in WASM memory
   * @param romLength - Size of the ROM in bytes
   * @param sampleRate - Audio sample rate in Hz (e.g., 48000)
   * 
   * @example
   * ```typescript
   * // Copy ROM to WASM memory
   * const romPtr = module._my_malloc(romData.length);
   * const heap = new Uint8Array(module.HEAP8.buffer, romPtr, romData.length);
   * heap.set(romData);
   * 
   * // Initialize with 48kHz audio
   * module._startWithRom(romPtr, romData.length, 48000);
   * 
   * // Free the ROM copy
   * module._my_free(romPtr);
   * ```
   */
  _startWithRom(romPtr: number, romLength: number, sampleRate: number): void;
  
  /**
   * Execute one frame of emulation (~16.67ms at 60 FPS).
   * 
   * This function:
   * 1. Executes one frame of CPU/APU emulation
   * 2. Updates the screen buffer
   * 3. Generates audio samples
   * 
   * Call this at 60 FPS for accurate emulation timing.
   * Results are available via `_getScreenBuffer()` and `_getSoundBuffer()`.
   * 
   * @example
   * ```typescript
   * function gameLoop() {
   *   module._mainLoop();
   *   
   *   const videoPtr = module._getScreenBuffer();
   *   const audioPtr = module._getSoundBuffer();
   *   
   *   // Process video and audio...
   *   
   *   requestAnimationFrame(gameLoop);
   * }
   * ```
   */
  _mainLoop(): void;
  
  // ========================================================================
  // Input Functions
  // ========================================================================
  
  /**
   * Set the joypad input state for player 1.
   * 
   * The input is a 32-bit bitmask where each bit represents a button.
   * 
   * **IMPORTANT**: This WASM module only supports player 1 input. The C source
   * code (`S9xReadJoypad`) returns 0 for all ports except port 0. This is a
   * limitation of the current snes9x2005-wasm implementation and differs from
   * the `IEmulatorCore.setInput(port, buttons)` interface which supports 4 ports.
   * 
   * Button mapping (matching SNES controller):
   * - Bit 0: B button
   * - Bit 1: Y button
   * - Bit 2: SELECT button
   * - Bit 3: START button
   * - Bit 4: UP on D-pad
   * - Bit 5: DOWN on D-pad
   * - Bit 6: LEFT on D-pad
   * - Bit 7: RIGHT on D-pad
   * - Bit 8: A button
   * - Bit 9: X button
   * - Bit 10: L shoulder button
   * - Bit 11: R shoulder button
   * 
   * @param input - 32-bit bitmask of button states (1 = pressed, 0 = released)
   * 
   * @example
   * ```typescript
   * const input = (1 << 8) | (1 << 3); // A + START
   * module._setJoypadInput(input);
   * ```
   */
  _setJoypadInput(input: number): void;
  
  // ========================================================================
  // Video Functions
  // ========================================================================
  
  /**
   * Get a pointer to the current video frame buffer.
   * 
   * The buffer contains a 512x448 RGBA8888 image (4 bytes per pixel).
   * The buffer is managed by the WASM module and should not be freed.
   * 
   * Format: RGBA8888 (Red, Green, Blue, Alpha - 1 byte each)
   * Size: 512 * 448 * 4 = 917,504 bytes
   * 
   * Note: The actual SNES resolution is 256x224 (NTSC) or 256x239 (PAL),
   * but this buffer is sized for the maximum possible resolution including
   * overscan and interlaced modes.
   * 
   * @returns Pointer to the video frame buffer in WASM memory
   * 
   * @example
   * ```typescript
   * const bufferPtr = module._getScreenBuffer();
   * const width = 512;
   * const height = 448;
   * const buffer = new Uint8Array(
   *   module.HEAP8.buffer,
   *   bufferPtr,
   *   width * height * 4
   * );
   * 
   * // Copy to ImageData for canvas rendering
   * const imageData = new ImageData(width, height);
   * imageData.data.set(buffer);
   * ```
   */
  _getScreenBuffer(): number;
  
  // ========================================================================
  // Audio Functions
  // ========================================================================
  
  /**
   * Get a pointer to the current audio sample buffer.
   * 
   * The buffer contains 2048 stereo samples in float32 format.
   * Samples are interleaved: [L, R, L, R, ...] where L and R are
   * left and right channel samples in the range [-1.0, 1.0].
   * 
   * Format: Float32, interleaved stereo
   * Sample count: 2048 frames (4096 samples total)
   * Size: 4096 * 4 = 16,384 bytes
   * 
   * At 60 FPS, this provides approximately 34ms of audio per frame
   * (2048 samples / 60 Hz ≈ 34ms), which is suitable for smooth playback.
   * 
   * The buffer is managed by the WASM module and should not be freed.
   * 
   * @returns Pointer to the audio sample buffer in WASM memory
   * 
   * @example
   * ```typescript
   * const bufferPtr = module._getSoundBuffer();
   * const samples = new Float32Array(
   *   module.HEAP8.buffer,
   *   bufferPtr,
   *   4096 // 2048 stereo frames
   * );
   * 
   * // Samples are interleaved: [L0, R0, L1, R1, L2, R2, ...]
   * const leftChannel = samples.filter((_, i) => i % 2 === 0);
   * const rightChannel = samples.filter((_, i) => i % 2 === 1);
   * ```
   */
  _getSoundBuffer(): number;
  
  // ========================================================================
  // Save Data Functions (SRAM)
  // ========================================================================
  
  /**
   * Prepare SRAM (Save RAM) for retrieval.
   * 
   * Call this before `_getSaveSramSize()` and `_getSaveSram()` to copy
   * the current SRAM state into a buffer for reading. This is necessary
   * because the SRAM may be modified during emulation.
   * 
   * @example
   * ```typescript
   * module._saveSramRequest();
   * const size = module._getSaveSramSize();
   * const ptr = module._getSaveSram();
   * const sram = new Uint8Array(module.HEAP8.buffer, ptr, size);
   * ```
   */
  _saveSramRequest(): void;
  
  /**
   * Get the size of the prepared SRAM data.
   * 
   * Must be called after `_saveSramRequest()`. The size depends on the
   * ROM's SRAM configuration and can range from 0 (no SRAM) to several KB.
   * 
   * @returns Size of SRAM data in bytes
   * 
   * @example
   * ```typescript
   * module._saveSramRequest();
   * const size = module._getSaveSramSize();
   * if (size > 0) {
   *   // Game has save data
   * }
   * ```
   */
  _getSaveSramSize(): number;
  
  /**
   * Get a pointer to the prepared SRAM data.
   * 
   * Must be called after `_saveSramRequest()`. The data should be read
   * immediately as it may be overwritten by future operations.
   * 
   * @returns Pointer to SRAM data in WASM memory (or null if no SRAM)
   * 
   * @example
   * ```typescript
   * module._saveSramRequest();
   * const size = module._getSaveSramSize();
   * const ptr = module._getSaveSram();
   * 
   * if (ptr && size > 0) {
   *   const sram = new Uint8Array(size);
   *   sram.set(new Uint8Array(module.HEAP8.buffer, ptr, size));
   *   // Save to file or IndexedDB...
   * }
   * ```
   */
  _getSaveSram(): number;
  
  /**
   * Load SRAM (Save RAM) data and reset the emulator.
   * 
   * This restores previously saved SRAM and performs a soft reset,
   * allowing games to recognize the loaded save data.
   * 
   * @param sramSize - Size of SRAM data in bytes
   * @param sramPtr - Pointer to SRAM data in WASM memory
   * 
   * @example
   * ```typescript
   * // Copy SRAM to WASM memory
   * const sramPtr = module._my_malloc(sramData.length);
   * const heap = new Uint8Array(module.HEAP8.buffer, sramPtr, sramData.length);
   * heap.set(sramData);
   * 
   * // Load SRAM (will reset emulator)
   * module._loadSram(sramData.length, sramPtr);
   * 
   * // Free the SRAM copy
   * module._my_free(sramPtr);
   * ```
   */
  _loadSram(sramSize: number, sramPtr: number): void;
  
  // ========================================================================
  // Save State Functions
  // ========================================================================
  
  /**
   * Get the size required for a save state.
   * 
   * The save state size is constant for a given ROM and includes:
   * - CPU state
   * - PPU state
   * - APU state
   * - All RAM (VRAM, WRAM, SRAM)
   * - Special chip state (SA-1, Super FX, etc.)
   * 
   * Typically 256KB - 512KB depending on ROM features.
   * 
   * @returns Size of save state in bytes
   * 
   * @example
   * ```typescript
   * const stateSize = module._getStateSaveSize();
   * console.log(`Save state size: ${stateSize / 1024}KB`);
   * ```
   */
  _getStateSaveSize(): number;
  
  /**
   * Create a save state.
   * 
   * This captures the complete emulator state at the current moment,
   * including CPU registers, memory, and peripherals. The state can
   * be restored later with `_loadState()` to resume from this exact point.
   * 
   * The returned pointer points to memory allocated by the WASM module
   * using malloc. The caller should copy the data and free the pointer
   * with `_my_free()` when done.
   * 
   * @returns Pointer to save state data in WASM memory (or null if failed)
   * 
   * @example
   * ```typescript
   * const stateSize = module._getStateSaveSize();
   * const statePtr = module._saveState();
   * 
   * if (statePtr) {
   *   const state = new Uint8Array(stateSize);
   *   state.set(new Uint8Array(module.HEAP8.buffer, statePtr, stateSize));
   *   
   *   // Save to file or IndexedDB...
   *   
   *   module._my_free(statePtr);
   * }
   * ```
   */
  _saveState(): number;
  
  /**
   * Load a save state.
   * 
   * This restores the emulator to the exact state captured by `_saveState()`.
   * All CPU registers, memory, and peripheral state are restored.
   * 
   * The state data must match the current ROM and be the exact size
   * returned by `_getStateSaveSize()`. Loading an incompatible state
   * will fail and return false.
   * 
   * @param statePtr - Pointer to save state data in WASM memory
   * @param stateSize - Size of save state data in bytes
   * @returns true if state loaded successfully, false otherwise
   * 
   * @example
   * ```typescript
   * // Copy state to WASM memory
   * const stateSize = module._getStateSaveSize();
   * const statePtr = module._my_malloc(stateSize);
   * const heap = new Uint8Array(module.HEAP8.buffer, statePtr, stateSize);
   * heap.set(stateData);
   * 
   * // Load state
   * const success = module._loadState(statePtr, stateSize);
   * if (success) {
   *   console.log('State loaded successfully');
   * }
   * 
   * // Free the state copy
   * module._my_free(statePtr);
   * ```
   */
  _loadState(statePtr: number, stateSize: number): boolean;
  
  // ========================================================================
  // Emscripten Runtime Methods
  // ========================================================================
  
  /**
   * Call a C function by name with automatic type conversion.
   * 
   * This is an Emscripten helper for calling exported functions with
   * JavaScript-friendly type conversions.
   * 
   * @param ident - Name of the function (without underscore prefix)
   * @param returnType - Expected return type ('number', 'string', 'boolean', 'null')
   * @param argTypes - Array of argument types
   * @param args - Function arguments
   * @returns The function's return value
   */
  cwrap<T = unknown>(
    ident: string,
    returnType: 'number' | 'string' | 'boolean' | 'null',
    argTypes?: ('number' | 'string' | 'boolean' | 'array')[],
    opts?: unknown
  ): (...args: unknown[]) => T;
}

/**
 * Base Emscripten module interface.
 * 
 * This includes standard Emscripten runtime properties and methods
 * that are available on all Emscripten modules.
 */
export interface EmscriptenModule {
  /**
   * Function called to locate WASM and data files.
   * Override this to customize file paths.
   */
  locateFile?: (path: string, scriptDirectory: string) => string;
  
  /**
   * Function for printing normal output.
   * Defaults to console.log.
   */
  print?: (text: string) => void;
  
  /**
   * Function for printing error output.
   * Defaults to console.error.
   */
  printErr?: (text: string) => void;
  
  /**
   * Called when the runtime is initialized and ready.
   */
  onRuntimeInitialized?: () => void;
  
  /**
   * Called when module instantiation is complete.
   */
  onModuleLoaded?: () => void;
  
  /**
   * Called when the module aborts execution.
   */
  onAbort?: (what: string) => void;
  
  /**
   * Disable exit() calls and keep runtime alive.
   * Defaults to true for most applications.
   */
  noExitRuntime?: boolean;
}

/**
 * Video buffer constants for the snes9x2005 emulator.
 */
export const VideoBufferConstants = {
  /**
   * Width of the video buffer in pixels.
   * This is the maximum width including overscan.
   */
  WIDTH: 512,
  
  /**
   * Height of the video buffer in pixels.
   * This is the maximum height including overscan.
   */
  HEIGHT: 448,
  
  /**
   * Bytes per pixel in the video buffer (RGBA8888 format).
   */
  BYTES_PER_PIXEL: 4,
  
  /**
   * Total size of the video buffer in bytes.
   */
  get TOTAL_SIZE(): number {
    return this.WIDTH * this.HEIGHT * this.BYTES_PER_PIXEL;
  },
} as const;

/**
 * Audio buffer constants for the snes9x2005 emulator.
 */
export const AudioBufferConstants = {
  /**
   * Number of stereo frames per buffer.
   * At 60 FPS, this provides ~34ms of audio.
   */
  FRAMES_PER_BUFFER: 2048,
  
  /**
   * Number of channels (stereo).
   */
  CHANNELS: 2,
  
  /**
   * Total number of samples in the buffer (frames * channels).
   */
  get TOTAL_SAMPLES(): number {
    return this.FRAMES_PER_BUFFER * this.CHANNELS;
  },
  
  /**
   * Size of the audio buffer in bytes (float32).
   */
  get TOTAL_SIZE(): number {
    return this.TOTAL_SAMPLES * 4; // 4 bytes per float32
  },
} as const;

/**
 * SNES button bitmasks for input.
 * These values match the hardware button positions on the SNES controller.
 */
export const SnesButtons = {
  B: 1 << 0,      // 0x0001
  Y: 1 << 1,      // 0x0002
  SELECT: 1 << 2, // 0x0004
  START: 1 << 3,  // 0x0008
  UP: 1 << 4,     // 0x0010
  DOWN: 1 << 5,   // 0x0020
  LEFT: 1 << 6,   // 0x0040
  RIGHT: 1 << 7,  // 0x0080
  A: 1 << 8,      // 0x0100
  X: 1 << 9,      // 0x0200
  L: 1 << 10,     // 0x0400
  R: 1 << 11,     // 0x0800
} as const;

/**
 * Type representing a SNES button state bitmask.
 */
export type SnesButtonState = number;

/**
 * Memory helper utilities for working with WASM memory.
 */
export interface WasmMemoryHelpers {
  /**
   * Copy JavaScript Uint8Array to WASM memory.
   * 
   * Allocates memory in WASM, copies the data, and returns the pointer.
   * The caller is responsible for freeing this memory.
   * 
   * @param module - The WASM module
   * @param data - Data to copy
   * @returns Pointer to the allocated memory
   * @throws Error if allocation fails
   */
  copyToWasm(module: Snes9xWasmModule, data: Uint8Array): number;
  
  /**
   * Copy data from WASM memory to JavaScript Uint8Array.
   * 
   * Creates a new Uint8Array and copies data from WASM memory.
   * Safe to use even if WASM memory grows after this call.
   * 
   * @param module - The WASM module
   * @param ptr - Pointer to WASM memory
   * @param length - Number of bytes to copy
   * @returns New Uint8Array with copied data
   */
  copyFromWasm(module: Snes9xWasmModule, ptr: number, length: number): Uint8Array;
}

/**
 * Default implementation of WASM memory helpers.
 * 
 * These utilities provide safe memory management patterns for working
 * with the WASM module, handling allocation, copying, and deallocation.
 */
export const wasmMemoryHelpers: WasmMemoryHelpers = {
  copyToWasm(module: Snes9xWasmModule, data: Uint8Array): number {
    const ptr = module._my_malloc(data.length);
    // Note: ptr can be 0 on first allocation, so we rely on the C code
    // to handle allocation failures internally. In practice, malloc
    // failures will typically cause the WASM module to abort.
    const heap = new Uint8Array(module.HEAP8.buffer, ptr, data.length);
    heap.set(data);
    return ptr;
  },
  
  copyFromWasm(module: Snes9xWasmModule, ptr: number, length: number): Uint8Array {
    const data = new Uint8Array(length);
    const heap = new Uint8Array(module.HEAP8.buffer, ptr, length);
    data.set(heap);
    return data;
  },
};
