import type { IEmulatorCore } from './IEmulatorCore';

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
 */
export class SnesCore implements IEmulatorCore {
  private wasmModule: WasmModule | null = null;
  private width = 256;
  private height = 224;
  private audioBuffer: Float32Array = new Float32Array(2048);
  private videoBuffer: Uint8Array = new Uint8Array(this.width * this.height * 4);
  private inputState: number[] = [0, 0];
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
    if (port < 0 || port > 1) {
      throw new Error('Invalid port number');
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
   * Creates a gradient pattern to visualize the emulator is running
   */
  private generateMockFrame(): void {
    const time = Date.now() / 1000;
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

    // Generate mock audio samples (simple sine wave)
    for (let i = 0; i < this.audioBuffer.length; i++) {
      this.audioBuffer[i] = Math.sin(time * 440 * Math.PI * 2 * i / 48000) * 0.1;
    }
  }
}
