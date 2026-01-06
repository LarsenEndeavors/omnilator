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
 * Skeleton implementation of a SNES9x WASM-backed emulator core.
 *
 * This class wires the {@link IEmulatorCore} interface to a provided
 * {@link Snes9xWasmModule}. The implementation intentionally keeps logic
 * minimal while establishing the structure for future, fuller features.
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
   * @param coreName - Optional core name (kept for compatibility)
   * @param coreUrl - Optional core URL (reserved for future loaders)
   * @param moduleLoader - Optional loader returning a {@link Snes9xWasmModule}
   */
  constructor(
    coreName: string = 'snes9x_2005',
    coreUrl?: string,
    moduleLoader?: ModuleLoader
  ) {
    this.moduleLoader =
      moduleLoader ??
      (() =>
        Promise.reject(
          new Error(
            `Snes9xWasmCore loader not configured for ${coreName}${
              coreUrl ? ` (${coreUrl})` : ''
            }`
          )
        ));

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
    this.module._startWithRom(romPtr, romData.length, this.sampleRate);
    this.module._my_free(romPtr);
    this.romLoaded = true;
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

    // Only player 1 input is supported by the current WASM build.
    this.module._setJoypadInput(this.inputStates[0]);
    this.module._mainLoop();
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
    return this.audioBuffer.slice();
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
    this.inputStates[port] = buttons;

    // Current WASM core supports player 1 only; update immediately when available.
    if (port === 0 && this.module) {
      this.module._setJoypadInput(buttons);
    }
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

    const state = wasmMemoryHelpers.copyFromWasm(this.module, statePtr, size);
    this.module._my_free(statePtr);
    return state;
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
    this.audioBuffer = new Float32Array(AudioBufferConstants.TOTAL_SAMPLES);
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
    const frameData = new Uint8Array(
      this.module.HEAP8.buffer,
      screenPtr,
      VideoBufferConstants.TOTAL_SIZE
    );
    this.videoBuffer = new ImageData(
      new Uint8ClampedArray(frameData),
      VideoBufferConstants.WIDTH,
      VideoBufferConstants.HEIGHT
    );
  }

  private captureAudio(): void {
    if (!this.module) {
      return;
    }
    const audioPtr = this.module._getSoundBuffer();
    const samples = new Float32Array(
      this.module.HEAP8.buffer,
      audioPtr,
      AudioBufferConstants.TOTAL_SAMPLES
    );
    this.audioBuffer = new Float32Array(samples);
  }
}
