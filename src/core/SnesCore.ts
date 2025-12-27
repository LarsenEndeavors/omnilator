import type { IEmulatorCore } from './IEmulatorCore';

/**
 * Interface for WASM module functions
 * This defines the expected API of a SNES emulator WASM module.
 * In a real implementation, this would be provided by snes9x or similar.
 */
interface WasmModule {
  loadROM: (data: Uint8Array) => boolean;
  runFrame: () => boolean;
  getVideoBuffer: () => Uint8Array;
  getAudioSamples: () => Float32Array;
  setInput: (port: number, state: number) => void;
  saveState: () => Uint8Array;
  loadState: (state: Uint8Array) => void;
  reset: () => void;
}

/**
 * SNES emulator core implementation wrapping Snes9x WASM
 * 
 * ⚠️ CURRENT STATUS: This is a demo/mock implementation.
 * 
 * This class demonstrates the emulator infrastructure (rendering loop, input handling,
 * audio system, save states) but does not actually emulate SNES ROMs. It generates
 * a gradient pattern with button indicators to show that all systems are functional.
 * 
 * For integrating a real SNES emulator, see docs/EMULATOR_INTEGRATION.md
 * 
 * The architecture is designed to make it easy to swap this mock implementation
 * for a real WASM-based emulator without changing any other code.
 */
export class SnesCore implements IEmulatorCore {
  private wasmModule: WasmModule | null = null;
  private width = 256;
  private height = 224;
  private audioBuffer: Float32Array = new Float32Array(2048);
  private videoBuffer: Uint8Array = new Uint8Array(this.width * this.height * 4);
  private inputState: number[] = [0, 0, 0, 0]; // Support 4 controller ports (0-3)
  private isInitialized = false;

  constructor() {
    // Initialize will happen when WASM module is loaded
  }

  /**
   * Initialize the WASM module
   */
  async initialize(): Promise<void> {
    try {
      // In a real implementation, this would load the Snes9x WASM module
      // For now, we'll create a mock implementation
      this.wasmModule = {
        loadROM: (data: Uint8Array) => {
          console.log('Mock: ROM loaded', data.length, 'bytes');
          return true;
        },
        runFrame: () => {
          // Simulate frame execution
          this.generateMockFrame();
          return true;
        },
        getVideoBuffer: () => this.videoBuffer,
        getAudioSamples: () => this.audioBuffer,
        setInput: (port: number, state: number) => {
          this.inputState[port] = state;
        },
        saveState: () => new Uint8Array(1024),
        loadState: (state: Uint8Array) => {
          console.log('Mock: State loaded', state.length, 'bytes');
        },
        reset: () => {
          console.log('Mock: Emulator reset');
        },
      };
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WASM module:', error);
      throw error;
    }
  }

  async loadROM(romData: Uint8Array): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.wasmModule || !this.wasmModule.loadROM(romData)) {
      throw new Error('Failed to load ROM');
    }
  }

  async runFrame(): Promise<void> {
    if (!this.wasmModule) {
      throw new Error('Emulator not initialized');
    }
    this.wasmModule.runFrame();
  }

  getBuffer(): ImageData {
    const imageData = new ImageData(this.width, this.height);
    imageData.data.set(this.videoBuffer);
    return imageData;
  }

  getAudioSamples(): Float32Array {
    return this.audioBuffer;
  }

  setInput(port: number, buttons: number): void {
    if (port < 0 || port > 3) {
      throw new Error(`Invalid port number: ${port}. Must be 0-3 for 4-player support.`);
    }
    if (this.wasmModule) {
      this.wasmModule.setInput(port, buttons);
    }
    this.inputState[port] = buttons;
  }

  saveState(): Uint8Array {
    if (!this.wasmModule) {
      throw new Error('Emulator not initialized');
    }
    return this.wasmModule.saveState();
  }

  loadState(state: Uint8Array): void {
    if (!this.wasmModule) {
      throw new Error('Emulator not initialized');
    }
    this.wasmModule.loadState(state);
  }

  reset(): void {
    if (this.wasmModule) {
      this.wasmModule.reset();
    }
  }

  cleanup(): void {
    this.wasmModule = null;
    this.isInitialized = false;
  }

  /**
   * Generate a mock frame for testing purposes
   * Creates a visual pattern that responds to controller input to demonstrate
   * that the emulator loop and input handling are working correctly.
   * 
   * NOTE: This is a placeholder. A real implementation requires integrating
   * a SNES emulator WASM module (e.g., snes9x compiled to WebAssembly).
   */
  private generateMockFrame(): void {
    const time = Date.now() / 1000;
    
    // Base gradient background
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 4;
        const r = Math.floor(128 + 127 * Math.sin(x / 32 + time));
        const g = Math.floor(128 + 127 * Math.sin(y / 32 + time));
        const b = Math.floor(128 + 127 * Math.sin((x + y) / 32 + time));
        
        this.videoBuffer[index] = r;
        this.videoBuffer[index + 1] = g;
        this.videoBuffer[index + 2] = b;
        this.videoBuffer[index + 3] = 255;
      }
    }

    // Draw input indicators to show buttons are being registered
    const drawBox = (x: number, y: number, width: number, height: number, r: number, g: number, b: number) => {
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
            const index = (py * this.width + px) * 4;
            this.videoBuffer[index] = r;
            this.videoBuffer[index + 1] = g;
            this.videoBuffer[index + 2] = b;
            this.videoBuffer[index + 3] = 255;
          }
        }
      }
    };

    // Button indicators
    const buttonSize = 20;
    const padding = 10;
    const yPos = padding;

    // D-Pad indicators
    if (this.inputState[0] & (1 << 4)) { // UP
      drawBox(this.width / 2 - buttonSize / 2, yPos, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 5)) { // DOWN
      drawBox(this.width / 2 - buttonSize / 2, yPos + buttonSize * 2, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 6)) { // LEFT
      drawBox(this.width / 2 - buttonSize * 1.5, yPos + buttonSize, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 7)) { // RIGHT
      drawBox(this.width / 2 + buttonSize / 2, yPos + buttonSize, buttonSize, buttonSize, 255, 255, 0);
    }

    // Action buttons (right side)
    const buttonX = this.width - padding - buttonSize * 3;
    if (this.inputState[0] & (1 << 0)) { // B
      drawBox(buttonX, yPos + buttonSize, buttonSize, buttonSize, 255, 0, 0);
    }
    if (this.inputState[0] & (1 << 8)) { // A
      drawBox(buttonX + buttonSize * 2, yPos + buttonSize, buttonSize, buttonSize, 0, 255, 0);
    }
    if (this.inputState[0] & (1 << 1)) { // Y
      drawBox(buttonX, yPos, buttonSize, buttonSize, 0, 0, 255);
    }
    if (this.inputState[0] & (1 << 9)) { // X
      drawBox(buttonX + buttonSize * 2, yPos, buttonSize, buttonSize, 0, 255, 255);
    }

    // Shoulder buttons
    if (this.inputState[0] & (1 << 10)) { // L
      drawBox(padding, padding, buttonSize * 2, buttonSize, 200, 200, 200);
    }
    if (this.inputState[0] & (1 << 11)) { // R
      drawBox(this.width - padding - buttonSize * 2, padding, buttonSize * 2, buttonSize, 200, 200, 200);
    }

    // Start/Select
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    if (this.inputState[0] & (1 << 3)) { // START
      drawBox(centerX + buttonSize, centerY, buttonSize, buttonSize / 2, 255, 255, 255);
    }
    if (this.inputState[0] & (1 << 2)) { // SELECT
      drawBox(centerX - buttonSize * 2, centerY, buttonSize, buttonSize / 2, 150, 150, 150);
    }

    // Generate mock audio samples (simple sine wave)
    for (let i = 0; i < this.audioBuffer.length; i++) {
      this.audioBuffer[i] = Math.sin(time * 440 * Math.PI * 2 * i / 48000) * 0.1;
    }
  }
}
