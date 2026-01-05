import type { IEmulatorCore } from './IEmulatorCore';
import { Snes9xWasmCore } from './Snes9xWasmCore';
import { MockSnesCore } from './MockSnesCore';

/**
 * SNES emulator core implementation using SNES9x WASM
 * 
 * This class provides a SNES-specific wrapper around Snes9xWasmCore, making it easy to
 * instantiate a SNES emulator using the SNES9x WebAssembly module.
 * 
 * The SNES9x WASM architecture provides direct integration with the snes9x2005
 * emulator core compiled to WebAssembly. This means:
 * 
 * - High performance SNES emulation
 * - Accurate cycle-level emulation
 * - Native SNES9x features and compatibility
 * 
 * Implementation Strategy:
 * 
 * This class delegates all work to Snes9xWasmCore, which handles the low-level
 * details of:
 * - WASM module loading and initialization
 * - Memory management between JS and WASM
 * - Pixel format conversion (RGB565 → RGBA)
 * - Audio sample format conversion (int16 → float32)
 * - SNES9x callback implementation
 * 
 * Fallback Mode:
 * 
 * If the SNES9x WASM core fails to load (network issues, missing files), the class
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
 * Core Source:
 * 
 * By default, this uses the SNES9x-2005 WASM core from:
 * `https://kazuki-4ys.github.io/web_apps/snes9x-2005-wasm/snes9x_2005.js`
 * 
 * You can customize the core by passing a different URL to the constructor:
 * 
 * ```typescript
 * // Use default external SNES9x WASM core
 * const core = new SnesCore();
 * 
 * // Use a custom core location
 * const core = new SnesCore('snes9x_2005', '/custom/path/snes9x_2005.js');
 * ```
 * 
 * **SNES9x WASM Module:**
 * 
 * The SNES9x WASM module is loaded from an external CDN. The module consists of:
 * - `snes9x_2005.js` - JavaScript glue code
 * - `snes9x_2005.wasm` - WebAssembly binary
 * 
 * These files are maintained by the SNES9x WASM project.
 */
export class SnesCore implements IEmulatorCore {
  private core: IEmulatorCore;
  private isUsingMock = false;

  /**
   * Create a new SNES emulator core
   * 
   * @param coreName - Name of the SNES9x core to use (default: 'snes9x_2005')
   * @param coreUrl - Optional custom URL for the core. If not provided, uses external SNES9x WASM core.
   *                  Will fall back to mock mode if loading fails.
   * 
   * @example
   * ```typescript
   * // Use default external SNES9x WASM core
   * const core = new SnesCore();
   * 
   * // Use custom core URL
   * const core = new SnesCore('snes9x_2005', '/custom/path/snes9x_2005.js');
   * ```
   */
  constructor(
    coreName: string = 'snes9x_2005',
    coreUrl?: string
  ) {
    // Use external SNES9x WASM core by default
    this.core = new Snes9xWasmCore(
      coreName,
      coreUrl || 'https://kazuki-4ys.github.io/web_apps/snes9x-2005-wasm/snes9x_2005.js'
    );
  }

  /**
   * Initialize the emulator core
   * 
   * This attempts to load the SNES9x WASM module and set up all callbacks.
   * If the SNES9x WASM core fails to load (network issues, CORS, missing files),
   * it automatically falls back to MockSnesCore which provides a demo mode.
   * 
   * Must be called before any other operations.
   */
  async initialize(): Promise<void> {
    // Check if we're using Snes9xWasmCore
    const isSnes9xWasm = this.core instanceof Snes9xWasmCore;
    
    if (isSnes9xWasm) {
      try {
        await this.core.initialize();
        console.log('SNES9x WASM core initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize SNES9x WASM core, falling back to mock mode:', error);
        console.warn('Make sure the SNES9x WASM module is accessible');
        
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
   * @returns true if using MockSnesCore (demo mode), false if using Snes9xWasmCore
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
      return (this.core as Snes9xWasmCore).getCoreInfo();
    }
    return { name: 'Mock', version: 'demo' };
  }
}
