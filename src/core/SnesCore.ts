import type { IEmulatorCore } from './IEmulatorCore';
import { Snes9xWasmCore } from './Snes9xWasmCore';
import type { Snes9xWasmModule } from './types/Snes9xWasmModule';

/**
 * SNES emulator core implementation using SNES9x WASM
 * 
 * This class provides a SNES-specific wrapper around Snes9xWasmCore, making it easy to
 * instantiate a SNES emulator using the SNES9x WebAssembly module from Emulatrix.
 * 
 * The SNES9x WASM core (snes9x_2005) provides:
 * - High performance SNES emulation
 * - Accurate cycle-level emulation
 * - Native SNES9x features and compatibility
 * - Video output at 512x448 resolution (RGBA8888)
 * - Audio output at 48kHz (stereo float32)
 * - Save state support
 * 
 * Implementation:
 * 
 * This class delegates all work to Snes9xWasmCore, which handles:
 * - WASM module loading from /cores/snes9x_2005.js
 * - Memory management between JavaScript and WASM
 * - Video and audio buffer capture
 * - Input handling for player 1
 * - Save state serialization
 * 
 * Usage:
 * ```typescript
 * const core = new SnesCore();
 * await core.initialize();
 * await core.loadROM(romData);
 * 
 * // Run at 60 FPS
 * setInterval(async () => {
 *   await core.runFrame();
 *   const frame = core.getBuffer();
 *   const audio = core.getAudioSamples();
 *   // Render frame and play audio
 * }, 1000/60);
 * ```
 * 
 * Core Files:
 * 
 * The SNES9x WASM module files are located in /public/cores/:
 * - `snes9x_2005.js` - JavaScript glue code (Emscripten output)
 * - `snes9x_2005.wasm` - WebAssembly binary
 * 
 * These files are from the Emulatrix project and provide the actual
 * SNES emulation functionality.
 */
export class SnesCore implements IEmulatorCore {
  private core: Snes9xWasmCore;

  /**
   * Create a new SNES emulator core
   * 
   * @param coreUrl - Optional custom URL for the core (default: '/cores/snes9x_2005.js')
   * @param moduleLoader - Optional custom module loader for testing
   * 
   * @example
   * ```typescript
   * // Use default local core
   * const core = new SnesCore();
   * 
   * // Use custom core URL
   * const core = new SnesCore('/custom/path/snes9x_2005.js');
   * ```
   */
  constructor(
    coreUrl?: string,
    moduleLoader?: () => Promise<Snes9xWasmModule>
  ) {
    // Use local SNES9x WASM core from /public/cores/
    this.core = new Snes9xWasmCore(coreUrl, moduleLoader);
  }

  /**
   * Initialize the emulator core
   * 
   * Loads the SNES9x WASM module and sets up the emulation environment.
   * Must be called before any other operations.
   * 
   * @throws Error if WASM module fails to load
   */
  async initialize(): Promise<void> {
    await this.core.initialize();
    console.log('SNES9x WASM core initialized successfully');
  }

  /**
   * Load a ROM file into the emulator
   * 
   * Supports .smc and .sfc ROM formats. The ROM data is copied into WASM memory
   * and passed to the core's _startWithRom() function.
   * 
   * @param romData - The ROM file data as a Uint8Array
   * @throws Error if ROM fails to load (invalid format, unsupported mapper, etc.)
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    await this.core.loadROM(romData);
  }

  /**
   * Execute one frame of SNES emulation
   * 
   * This runs approximately 16.67ms of emulated time (1/60th of a second).
   * During execution, the core will:
   * - Execute CPU instructions
   * - Render one video frame
   * - Generate audio samples
   * - Read controller input
   * 
   * The frame and audio data can be retrieved after this call using
   * getBuffer() and getAudioSamples().
   * 
   * @throws Error if emulator is not initialized or no ROM is loaded
   */
  async runFrame(): Promise<void> {
    await this.core.runFrame();
  }

  /**
   * Get the current video frame
   * 
   * Returns the most recently rendered frame as an ImageData object ready for
   * drawing to a canvas. The resolution is 512x448 (maximum including overscan).
   * 
   * The pixel format is RGBA8888 (4 bytes per pixel, 8 bits per channel).
   * 
   * @returns ImageData containing the current frame
   */
  getBuffer(): ImageData {
    return this.core.getBuffer();
  }

  /**
   * Get audio samples from the last frame
   * 
   * Returns the audio samples generated during the last runFrame() call.
   * The samples are interleaved stereo float32 values in the range [-1, 1].
   * 
   * Format: [L0, R0, L1, R1, L2, R2, ...]
   * Sample count: 4096 samples (2048 stereo frames)
   * 
   * @returns Float32Array containing interleaved stereo audio samples
   */
  getAudioSamples(): Float32Array {
    return this.core.getAudioSamples();
  }

  /**
   * Set controller input state
   * 
   * Updates the button state for player 1 (port 0). The SNES9x WASM core
   * currently only supports single-player input.
   * 
   * The button bitmask uses the SnesButton constants from IEmulatorCore:
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
   * - Bit 10: L button
   * - Bit 11: R button
   * 
   * @param port - Controller port (0-3, but only 0 is supported)
   * @param buttons - Button state bitmask
   * @throws Error if port is invalid
   * 
   * @example
   * ```typescript
   * import { SnesButton } from './IEmulatorCore';
   * 
   * // Press A and B buttons
   * core.setInput(0, SnesButton.A | SnesButton.B);
   * 
   * // Press START
   * core.setInput(0, SnesButton.START);
   * 
   * // Release all buttons
   * core.setInput(0, 0);
   * ```
   */
  setInput(port: number, buttons: number): void {
    this.core.setInput(port, buttons);
  }

  /**
   * Save the current emulator state
   * 
   * Creates a complete snapshot of the emulator's state, including:
   * - CPU state (registers, program counter, flags)
   * - Memory (Work RAM, Video RAM, Audio RAM)
   * - PPU state (scanline, sprites, backgrounds)
   * - APU state (sound channels, DSP registers)
   * - Cartridge state (SRAM, special chips)
   * 
   * Save states are typically 150-300 KB depending on the game.
   * 
   * @returns Uint8Array containing the serialized state
   * @throws Error if save states are not supported or emulator is not initialized
   */
  saveState(): Uint8Array {
    return this.core.saveState();
  }

  /**
   * Load a previously saved state
   * 
   * Restores the emulator to exactly the state when saveState() was called.
   * 
   * ⚠️ Warning: The state must have been created with the same ROM.
   * 
   * @param state - Save state data from saveState()
   * @throws Error if state is invalid or incompatible
   */
  loadState(state: Uint8Array): void {
    this.core.loadState(state);
  }

  /**
   * Reset the emulator
   * 
   * Resets the emulator state. The ROM remains loaded after reset.
   */
  reset(): void {
    this.core.reset();
  }

  /**
   * Clean up resources
   * 
   * Shuts down the emulator and frees all resources. After calling this,
   * the instance cannot be used anymore.
   */
  cleanup(): void {
    this.core.cleanup();
  }

  /**
   * Get information about the core
   * 
   * Returns metadata about the loaded core.
   * 
   * @returns Object with core name and version
   */
  getCoreInfo(): { name: string; version: string } {
    return this.core.getCoreInfo();
  }
}
