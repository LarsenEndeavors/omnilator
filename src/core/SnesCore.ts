import type { IEmulatorCore } from './IEmulatorCore';
import { LibRetroCore } from './LibRetroCore';
import { MockSnesCore } from './MockSnesCore';

/**
 * SNES emulator core implementation using LibRetro
 * 
 * This class provides a SNES-specific wrapper around LibRetroCore, making it easy to
 * instantiate a SNES emulator without knowing the details of LibRetro.
 * 
 * The LibRetro architecture allows for loose coupling between the emulator frontend
 * (this application) and the emulator core (snes9x, bsnes, etc.). This means:
 * 
 * - Easy to swap between different SNES cores
 * - Core updates don't require code changes
 * - Can support multiple systems by using different cores
 * 
 * Implementation Strategy:
 * 
 * This class delegates all work to LibRetroCore, which handles the low-level
 * details of:
 * - WASM module loading and initialization
 * - Memory management between JS and WASM
 * - Pixel format conversion (RGB565/XRGB8888 → RGBA)
 * - Audio sample format conversion (int16 → float32)
 * - LibRetro callback implementation
 * 
 * Fallback Mode:
 * 
 * If the LibRetro core fails to load (network issues, missing files), the class
 * automatically falls back to MockSnesCore which provides a demo mode showing
 * that the emulator infrastructure is working without requiring external dependencies.
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
 * Core Selection:
 * 
 * By default, this uses the 'snes9x' core from the LibRetro buildbot.
 * You can customize the core by passing a different name or URL to the constructor:
 * 
 * ```typescript
 * // Use bsnes core instead
 * const core = new SnesCore('bsnes');
 * 
 * // Use a locally hosted core (recommended for production)
 * const core = new SnesCore('snes9x', '/cores/snes9x_libretro.js');
 * ```
 * 
 * Available SNES Cores:
 * - snes9x: Fast, accurate, recommended for most games
 * - bsnes: Maximum accuracy, higher CPU requirements
 * - mednafen_snes: Good balance of speed and accuracy
 * 
 * **Important for Production:**
 * 
 * Download cores from https://buildbot.libretro.com/stable/latest/emscripten/
 * and host them in your public/ directory. The default buildbot URL may not be
 * accessible in all environments (CORS, network restrictions, etc.).
 */
export class SnesCore implements IEmulatorCore {
  private core: IEmulatorCore;
  private isUsingMock = false;

  /**
   * Create a new SNES emulator core
   * 
   * @param coreName - Name of the LibRetro core to use (default: 'snes9x')
   * @param coreUrl - Optional custom URL for the core. If not provided, attempts to load from LibRetro buildbot.
   *                  Will fall back to mock mode if loading fails.
   * 
   * @example
   * ```typescript
   * // Use default snes9x core (will fall back to mock if unavailable)
   * const core = new SnesCore();
   * 
   * // Use bsnes core for maximum accuracy
   * const core = new SnesCore('bsnes');
   * 
   * // Use locally hosted core (recommended for production)
   * const core = new SnesCore('snes9x', '/cores/snes9x_libretro.js');
   * ```
   */
  constructor(
    coreName: string = 'snes9x',
    coreUrl?: string
  ) {
    this.core = new LibRetroCore(coreName, coreUrl);
  }

  /**
   * Initialize the emulator core
   * 
   * This attempts to load the LibRetro WASM module and set up all callbacks.
   * If the LibRetro core fails to load (network issues, CORS, missing files),
   * it automatically falls back to MockSnesCore which provides a demo mode.
   * 
   * Must be called before any other operations.
   */
  async initialize(): Promise<void> {
    // Check if we're using LibRetroCore
    const isLibRetro = this.core instanceof LibRetroCore;
    
    if (isLibRetro) {
      try {
        await this.core.initialize();
        console.log('LibRetro core initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize LibRetro core, falling back to mock mode:', error);
        console.warn('To use real emulation, download a core from https://buildbot.libretro.com/stable/latest/emscripten/');
        console.warn('and host it locally, then use: new SnesCore("snes9x", "/cores/snes9x_libretro.js")');
        
        // Fall back to mock mode
        this.core = new MockSnesCore();
        await this.core.initialize();
        this.isUsingMock = true;
      }
    } else {
      // Already using mock or other implementation
      await this.core.initialize();
    }
  }

  /**
   * Check if the core is using mock mode
   * 
   * @returns true if using MockSnesCore (demo mode), false if using LibRetroCore
   */
  isInMockMode(): boolean {
    return this.isUsingMock;
  }

  /**
   * Load a ROM file into the emulator
   * 
   * Supports .smc and .sfc ROM formats. The ROM data is copied into WASM memory
   * and passed to the core's retro_load_game() function.
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
   * drawing to a canvas. The resolution is typically 256x224 for NTSC games
   * or 256x240 for some games that use overscan.
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
   * For SNES, the sample rate is typically ~32040 Hz, so each frame generates
   * approximately 534 samples (267 per channel).
   * 
   * Format: [L0, R0, L1, R1, L2, R2, ...]
   * 
   * @returns Float32Array containing interleaved stereo audio samples
   */
  getAudioSamples(): Float32Array {
    return this.core.getAudioSamples();
  }

  /**
   * Set controller input state
   * 
   * Updates the button state for a specific controller port. The SNES supports
   * up to 4 controllers (with a multitap accessory).
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
   * @param port - Controller port (0-3)
   * @param buttons - Button state bitmask
   * @throws Error if port is invalid
   * 
   * @example
   * ```typescript
   * import { SnesButton } from './IEmulatorCore';
   * 
   * // Press A and B buttons on port 1
   * core.setInput(0, SnesButton.A | SnesButton.B);
   * 
   * // Press START on port 2
   * core.setInput(1, SnesButton.START);
   * 
   * // Release all buttons on port 1
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
   * Save states are tied to the specific core and ROM. Loading a state
   * saved with a different core or ROM may cause crashes or corruption.
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
   * This is instantaneous and allows for:
   * - Quick save/load functionality
   * - Rewind feature (save states every frame)
   * - Tool-assisted speedrun (TAS) creation
   * - Testing specific game scenarios
   * 
   * ⚠️ Warning: The state must have been created with:
   * - The same core (snes9x state won't work with bsnes)
   * - The same ROM
   * - The same core version (may be incompatible across updates)
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
   * Equivalent to pressing the reset button on a real SNES console.
   * This will:
   * - Reset the CPU to the initial vector
   * - Clear all RAM
   * - Reset PPU and APU to power-on state
   * - Preserve cartridge SRAM (battery-backed save data)
   * 
   * The ROM remains loaded after reset.
   */
  reset(): void {
    this.core.reset();
  }

  /**
   * Clean up resources
   * 
   * Shuts down the emulator and frees all resources. After calling this,
   * the instance cannot be used anymore.
   * 
   * Should be called when:
   * - Unmounting the emulator component
   * - Loading a different core
   * - Closing the application
   */
  cleanup(): void {
    this.core.cleanup();
  }

  /**
   * Get information about the core
   * 
   * Returns metadata about the loaded core, including its name and version.
   * This can be useful for debugging or displaying in the UI.
   * 
   * @returns Object with core name and version
   * 
   * @example
   * ```typescript
   * const info = core.getCoreInfo();
   * console.log(`Using ${info.name} version ${info.version}`);
   * // Output: "Using Snes9x version 1.60"
   * ```
   */
  getCoreInfo(): { name: string; version: string } {
    if ('getCoreInfo' in this.core) {
      return (this.core as LibRetroCore).getCoreInfo();
    }
    return { name: 'Mock', version: 'demo' };
  }
}
