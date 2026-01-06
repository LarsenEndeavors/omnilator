import type { IEmulatorCore } from './IEmulatorCore';
import {
  AudioBufferConstants,
  VideoBufferConstants,
  wasmMemoryHelpers,
} from './types/Snes9xWasmModule';
import type { Snes9xWasmModule } from './types/Snes9xWasmModule';

type ModuleLoader = () => Promise<Snes9xWasmModule>;

const DEFAULT_SAMPLE_RATE = 48_000;

/**
 * Default module loader for snes9x_2005 core.
 * Loads the WASM module from /cores/snes9x_2005.js
 */
async function createDefaultModuleLoader(coreUrl: string): Promise<Snes9xWasmModule> {
  return new Promise((resolve, reject) => {
    // Set up Module configuration before loading the script
    // The Emscripten script will use this global Module object
    const moduleConfig: Partial<Snes9xWasmModule> = {
      locateFile: (path: string) => {
        // Ensure WASM file is loaded from the correct location
        if (path.endsWith('.wasm')) {
          return coreUrl.replace('.js', '.wasm');
        }
        return path;
      },
      onRuntimeInitialized: function(this: Snes9xWasmModule) {
        // Module is ready - resolve with it
        // Note: Don't delete the global Module yet, as it's still being used
        // The Emscripten runtime references Module internally
        resolve(this);
      },
      onAbort: (error: string) => {
        reject(new Error(`WASM module aborted: ${error}`));
      },
    };

    // Set the global Module object that the Emscripten script will use
    (window as any).Module = moduleConfig;

    // Create script element to load the Emscripten module
    const script = document.createElement('script');
    script.src = coreUrl;
    script.async = true;

    script.onerror = () => {
      delete (window as any).Module;
      reject(new Error(`Failed to load WASM module from ${coreUrl}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Implementation of a SNES9x WASM-backed emulator core.
 *
 * This class wires the {@link IEmulatorCore} interface to the
 * {@link Snes9xWasmModule} loaded from the snes9x_2005 core files.
 */
export class Snes9xWasmCore implements IEmulatorCore {
  private module: Snes9xWasmModule | null = null;
  private readonly moduleLoader: ModuleLoader;
  private videoBuffer: ImageData;
  private audioBuffer: Float32Array;
  private inputStates: number[] = [0, 0, 0, 0];
  private initialized = false;
  private romLoaded = false;
  private readonly sampleRate: number;

  /**
   * Create a new Snes9xWasmCore instance.
   *
   * @param _coreName - Optional core name (unused, kept for compatibility)
   * @param coreUrl - Optional core URL (default: '/cores/snes9x_2005.js')
   * @param moduleLoader - Optional custom loader returning a {@link Snes9xWasmModule}
   */
  constructor(
    _coreName: string = 'snes9x_2005',
    coreUrl?: string,
    moduleLoader?: ModuleLoader
  ) {
    const url = coreUrl || '/cores/snes9x_2005.js';
    this.moduleLoader = moduleLoader ?? (() => createDefaultModuleLoader(url));

    this.sampleRate = DEFAULT_SAMPLE_RATE;
    this.videoBuffer = new ImageData(
      VideoBufferConstants.WIDTH,
      VideoBufferConstants.HEIGHT
    );
    this.audioBuffer = new Float32Array(AudioBufferConstants.TOTAL_SAMPLES);
  }

  /**
   * Load the underlying WASM module. Safe to call multiple times.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.module = await this.moduleLoader();
    this.initialized = true;
  }

  /**
   * Load a ROM into the emulator.
   *
   * @param romData - Raw ROM bytes
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.module) {
      throw new Error('Snes9x WASM module not loaded');
    }

    const romPtr = wasmMemoryHelpers.copyToWasm(this.module, romData);
    try {
      this.module._startWithRom(romPtr, romData.length, this.sampleRate);
      this.romLoaded = true;
    } finally {
      this.module._my_free(romPtr);
    }
  }

  /**
   * Execute a single frame of emulation.
   */
  async runFrame(): Promise<void> {
    if (!this.initialized || !this.module) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('ROM not loaded');
    }

    // Set input state before running the frame
    // Only player 1 input is supported by the current WASM build.
    this.module._setJoypadInput(this.inputStates[0]);
    
    // Run one frame of emulation
    this.module._mainLoop();
    
    // Capture video and audio immediately after emulation
    this.captureVideo();
    this.captureAudio();
  }

  /**
   * Get the most recent video frame.
   */
  getBuffer(): ImageData {
    return this.videoBuffer;
  }

  /**
   * Get audio samples generated during the last frame.
   */
  getAudioSamples(): Float32Array {
    return this.audioBuffer;
  }

  /**
   * Set controller input for a given port.
   *
   * @param port - Controller port (0-3)
   * @param buttons - Bitmask matching {@link SnesButton}
   */
  setInput(port: number, buttons: number): void {
    if (port < 0 || port > 3) {
      throw new Error('Port must be between 0 and 3');
    }
    // Store input state - it will be applied in runFrame() before each frame
    this.inputStates[port] = buttons;
  }

  /**
   * Serialize emulator state.
   */
  saveState(): Uint8Array {
    if (!this.initialized || !this.module) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('ROM not loaded');
    }

    const size = this.module._getStateSaveSize();
    if (size <= 0) {
      throw new Error('Save states not supported by core');
    }

    const statePtr = this.module._saveState();
    if (!statePtr) {
      throw new Error('Failed to create save state');
    }

    try {
      return wasmMemoryHelpers.copyFromWasm(this.module, statePtr, size);
    } finally {
      this.module._my_free(statePtr);
    }
  }

  /**
   * Restore a previously saved state.
   *
   * @param state - Serialized state from {@link saveState}
   */
  loadState(state: Uint8Array): void {
    if (!this.initialized || !this.module) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('ROM not loaded');
    }

    const statePtr = wasmMemoryHelpers.copyToWasm(this.module, state);
    const success = this.module._loadState(statePtr, state.length);
    this.module._my_free(statePtr);

    if (!success) {
      throw new Error('Failed to load state');
    }
  }

  /**
   * Reset emulator state. ROM remains loaded.
   */
  reset(): void {
    this.inputStates = [0, 0, 0, 0];
    if (this.module) {
      this.module._setJoypadInput(0);
    }
    this.audioBuffer.fill(0);
    this.videoBuffer.data.fill(0);
  }

  /**
   * Release resources held by the core.
   */
  cleanup(): void {
    this.module = null;
    this.initialized = false;
    this.romLoaded = false;
  }

  /**
   * Lightweight metadata about the core.
   */
  getCoreInfo(): { name: string; version: string } {
    return { name: 'snes9x-wasm', version: 'skeleton' };
  }

  private captureVideo(): void {
    if (!this.module) {
      return;
    }
    const screenPtr = this.module._getScreenBuffer();
    if (!screenPtr) {
      return;
    }
    const frameData = wasmMemoryHelpers.copyFromWasm(
      this.module,
      screenPtr,
      VideoBufferConstants.TOTAL_SIZE
    );
    this.videoBuffer.data.set(frameData);
  }

  private captureAudio(): void {
    if (!this.module) {
      return;
    }
    const audioPtr = this.module._getSoundBuffer();
    if (!audioPtr) {
      return;
    }
    const audioBytes = wasmMemoryHelpers.copyFromWasm(
      this.module,
      audioPtr,
      AudioBufferConstants.TOTAL_SIZE
    );
    const samples = new Float32Array(audioBytes.buffer);
    this.audioBuffer.set(samples);
  }
}
