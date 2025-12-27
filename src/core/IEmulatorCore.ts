/**
 * Core interface for emulator implementations
 */
export interface IEmulatorCore {
  /**
   * Load a ROM file into the emulator
   * @param romData - The ROM file data as a Uint8Array
   * @returns Promise that resolves when ROM is loaded
   */
  loadROM(romData: Uint8Array): Promise<void>;

  /**
   * Execute one frame of emulation
   * @returns Promise that resolves when frame is complete
   */
  runFrame(): Promise<void>;

  /**
   * Get the current video buffer
   * @returns ImageData containing the current frame
   */
  getBuffer(): ImageData;

  /**
   * Get audio samples from the emulator
   * @returns Float32Array containing audio samples
   */
  getAudioSamples(): Float32Array;

  /**
   * Set controller input state
   * @param port - Controller port (0-3 for standard 4-player support)
   * @param buttons - Button state bitmask
   */
  setInput(port: number, buttons: number): void;

  /**
   * Save the current emulator state
   * @returns Uint8Array containing the save state
   */
  saveState(): Uint8Array;

  /**
   * Load a previously saved state
   * @param state - The save state data
   */
  loadState(state: Uint8Array): void;

  /**
   * Reset the emulator
   */
  reset(): void;

  /**
   * Clean up resources
   */
  cleanup(): void;
}

/**
 * SNES button bitmasks for input
 */
export const SnesButton = {
  B: 1 << 0,
  Y: 1 << 1,
  SELECT: 1 << 2,
  START: 1 << 3,
  UP: 1 << 4,
  DOWN: 1 << 5,
  LEFT: 1 << 6,
  RIGHT: 1 << 7,
  A: 1 << 8,
  X: 1 << 9,
  L: 1 << 10,
  R: 1 << 11,
} as const;
