import type { IEmulatorCore } from './IEmulatorCore';
import { EmulatrixSnesCore } from './EmulatrixSnesCore';

/**
 * SNES emulator core implementation using Emulatrix RetroArch WASM
 * 
 * This class provides a SNES-specific wrapper around EmulatrixSnesCore, which uses
 * the proven Emulatrix RetroArch implementation for reliable SNES emulation.
 * 
 * The Emulatrix RetroArch core provides:
 * - Full RetroArch emulator with BrowserFS
 * - Automatic input handling via configuration
 * - Automatic audio with optimal latency settings (audio_latency = 128)
 * - Self-contained emulation loop (no manual frame stepping needed)
 * - Proven stability and compatibility
 * 
 * Key Differences from Previous Implementation:
 * 
 * - Uses full RetroArch WASM build instead of minimal snes9x_2005
 * - RetroArch manages its own rendering loop (runFrame is a no-op)
 * - RetroArch handles audio directly (getAudioSamples returns empty)
 * - RetroArch reads input via configuration (setInput is a no-op)
 * - Much simpler integration - just load ROM and let RetroArch run
 * 
 * Usage:
 * ```typescript
 * const core = new SnesCore();
 * await core.initialize();
 * await core.loadROM(romData);
 * 
 * // That's it! RetroArch runs autonomously
 * // No manual frame loop needed
 * ```
 * 
 * Core Files:
 * 
 * The Emulatrix RetroArch files are located in /public/cores/Emulatrix/:
 * - `Emulatrix_SuperNintendo.js` - RetroArch glue code with BrowserFS (~503KB)
 * - `Emulatrix_SuperNintendo.wasm` - RetroArch WebAssembly binary (~3.8MB)
 * 
 * These files are the working implementation from the Emulatrix project.
 */
export class SnesCore implements IEmulatorCore {
  private core: EmulatrixSnesCore;

  /**
   * Create a new SNES emulator core using Emulatrix RetroArch
   * 
   * @example
   * ```typescript
   * // Create and initialize
   * const core = new SnesCore();
   * await core.initialize();
   * ```
   */
  constructor() {
    // Use Emulatrix RetroArch core - much simpler than custom wrapper
    this.core = new EmulatrixSnesCore();
  }

  /**
   * Initialize the emulator core
   * 
   * Loads the Emulatrix RetroArch WASM module and sets up the environment.
   * Must be called before any other operations.
   * 
   * @throws Error if WASM module fails to load
   */
  async initialize(): Promise<void> {
    await this.core.initialize();
    console.log('[SnesCore] Emulatrix RetroArch core initialized successfully');
  }

  /**
   * Load a ROM file into the emulator
   * 
   * Supports .smc and .sfc ROM formats. The ROM is loaded into RetroArch's
   * virtual filesystem and the emulator is started automatically.
   * 
   * @param romData - The ROM file data as a Uint8Array
   * @throws Error if ROM fails to load
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    await this.core.loadROM(romData);
  }

  /**
   * Execute one frame - NO-OP for RetroArch
   * 
   * RetroArch manages its own internal rendering loop, so this method
   * doesn't need to do anything. Kept for interface compatibility.
   */
  async runFrame(): Promise<void> {
    await this.core.runFrame();
  }

  /**
   * Get the current video frame - NOT USED with RetroArch
   * 
   * RetroArch renders directly to its canvas element, so this returns
   * an empty buffer. Kept for interface compatibility.
   * 
   * @returns Empty ImageData
   */
  getBuffer(): ImageData {
    return this.core.getBuffer();
  }

  /**
   * Get audio samples - NOT USED with RetroArch
   * 
   * RetroArch handles audio playback directly through WebAudio API,
   * so this returns an empty array. Kept for interface compatibility.
   * 
   * @returns Empty Float32Array
   */
  getAudioSamples(): Float32Array {
    return this.core.getAudioSamples();
  }

  /**
   * Set controller input - NOT USED with RetroArch
   * 
   * RetroArch reads keyboard input directly based on its configuration file,
   * so this method doesn't need to do anything. Kept for interface compatibility.
   * 
   * @param port - Controller port (ignored)
   * @param buttons - Button state bitmask (ignored)
   */
  setInput(port: number, buttons: number): void {
    this.core.setInput(port, buttons);
  }

  /**
   * Save the current emulator state
   * 
   * NOTE: Save states not yet fully integrated with RetroArch.
   * Users can use RetroArch's built-in hotkeys for save/load.
   * 
   * @returns Empty Uint8Array
   */
  saveState(): Uint8Array {
    return this.core.saveState();
  }

  /**
   * Load a previously saved state
   * 
   * NOTE: Save states not yet fully integrated with RetroArch.
   * Users can use RetroArch's built-in hotkeys for save/load.
   * 
   * @param state - Save state data (ignored)
   */
  loadState(state: Uint8Array): void {
    this.core.loadState(state);
  }

  /**
   * Reset the emulator
   * 
   * Triggers RetroArch's reset hotkey (F10 by default).
   */
  reset(): void {
    this.core.reset();
  }

  /**
   * Clean up resources
   * 
   * Shuts down RetroArch and frees all resources.
   */
  cleanup(): void {
    this.core.cleanup();
  }

  /**
   * Get the canvas element that RetroArch renders to
   * 
   * This should be added to the DOM for display.
   * 
   * @returns The canvas element or null if not initialized
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.core.getCanvas();
  }
}
