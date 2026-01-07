/**
 * Core interface for emulator implementations
 */
export interface IEmulatorCore {
  /**
   * Initialize the emulator core
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

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
 * SNES button bitmasks for input (LibRetro standard ordering)
 * These bit positions match the LibRetro/RetroArch SNES controller mapping
 * used by the snes9x_2005 WASM core.
 */
export const SnesButton = {
  B: 1 << 0,       // Bit 0: B button (bottom face button)
  Y: 1 << 1,       // Bit 1: Y button (left face button)
  SELECT: 1 << 2,  // Bit 2: SELECT button
  START: 1 << 3,   // Bit 3: START button
  UP: 1 << 4,      // Bit 4: D-pad UP
  DOWN: 1 << 5,    // Bit 5: D-pad DOWN
  LEFT: 1 << 6,    // Bit 6: D-pad LEFT
  RIGHT: 1 << 7,   // Bit 7: D-pad RIGHT
  A: 1 << 8,       // Bit 8: A button (right face button)
  X: 1 << 9,       // Bit 9: X button (top face button)
  L: 1 << 10,      // Bit 10: L shoulder button
  R: 1 << 11,      // Bit 11: R shoulder button
} as const;
