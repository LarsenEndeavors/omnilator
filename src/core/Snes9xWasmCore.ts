import type { IEmulatorCore } from './IEmulatorCore';

/**
 * Snes9xWasm API environment commands
 * These constants match the snes9x.h API specification
 */
const RetroEnvironment = {
  SET_ROTATION: 1,
  GET_OVERSCAN: 2,
  GET_CAN_DUPE: 3,
  SET_MESSAGE: 6,
  SHUTDOWN: 7,
  SET_PERFORMANCE_LEVEL: 8,
  GET_SYSTEM_DIRECTORY: 9,
  SET_PIXEL_FORMAT: 10,
  SET_INPUT_DESCRIPTORS: 11,
  SET_KEYBOARD_CALLBACK: 12,
  SET_DISK_CONTROL_INTERFACE: 13,
  SET_HW_RENDER: 14,
  GET_VARIABLE: 15,
  SET_VARIABLES: 16,
  GET_VARIABLE_UPDATE: 17,
  SET_SUPPORT_NO_GAME: 18,
  GET_LIBRETRO_PATH: 19,
  SET_FRAME_TIME_CALLBACK: 21,
  SET_AUDIO_CALLBACK: 22,
  GET_RUMBLE_INTERFACE: 23,
  GET_INPUT_DEVICE_CAPABILITIES: 24,
  GET_SENSOR_INTERFACE: 25,
  GET_CAMERA_INTERFACE: 26,
  GET_LOG_INTERFACE: 27,
  GET_PERF_INTERFACE: 28,
  GET_LOCATION_INTERFACE: 29,
  GET_CONTENT_DIRECTORY: 30,
  GET_SAVE_DIRECTORY: 31,
  SET_SYSTEM_AV_INFO: 32,
  SET_PROC_ADDRESS_CALLBACK: 33,
  SET_SUBSYSTEM_INFO: 34,
  SET_CONTROLLER_INFO: 35,
  SET_MEMORY_MAPS: 36,
  SET_GEOMETRY: 37,
  GET_USERNAME: 38,
  GET_LANGUAGE: 39,
} as const;

/**
 * Snes9xWasm pixel formats
 */
const RetroPixelFormat = {
  RGB1555: 0, // 0RGB1555, native endian. 0 bit must be set to 0.
  XRGB8888: 1, // XRGB8888, native endian. X bits are ignored.
  RGB565: 2, // RGB565, native endian.
} as const;

/**
 * Snes9xWasm device types
 */
const RetroDeviceType = {
  NONE: 0,
  JOYPAD: 1,
  MOUSE: 2,
  KEYBOARD: 3,
  LIGHTGUN: 4,
  ANALOG: 5,
  POINTER: 6,
} as const;

/**
 * System AV info structure
 */
interface RetroSystemAvInfo {
  geometry: {
    base_width: number;
    base_height: number;
    max_width: number;
    max_height: number;
    aspect_ratio: number;
  };
  timing: {
    fps: number;
    sample_rate: number;
  };
}

/**
 * Emscripten Module interface
 * Represents the runtime interface provided by Emscripten-compiled WASM modules
 */
interface EmscriptenModule {
  HEAP8: Int8Array & { buffer: ArrayBuffer };
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  addFunction: (func: Function, signature: string) => number;
  _retro_set_environment: (callback: number) => void;
  _retro_set_video_refresh: (callback: number) => void;
  _retro_set_audio_sample: (callback: number) => void;
  _retro_set_audio_sample_batch: (callback: number) => void;
  _retro_set_input_poll: (callback: number) => void;
  _retro_set_input_state: (callback: number) => void;
  _retro_init: () => void;
  _retro_load_game: (gameInfoPtr: number) => boolean;
  _retro_get_system_av_info: (avInfoPtr: number) => void;
  _retro_run: () => void;
  _retro_serialize_size: () => number;
  _retro_serialize: (statePtr: number, size: number) => boolean;
  _retro_unserialize: (statePtr: number, size: number) => boolean;
  _retro_reset: () => void;
  _retro_unload_game: () => void;
  _retro_deinit: () => void;
  _retro_get_system_info_name?: () => number;
  _retro_get_system_info_version?: () => number;
}

/**
 * Snes9xWasm core implementation for SNES emulation
 * 
 * This class implements the IEmulatorCore interface by wrapping a snes9x-compatible
 * SNES core (such as snes9x_snes9x or bsnes_snes9x) compiled to WebAssembly.
 * 
 * Snes9xWasm provides a standardized API that makes it easy to swap between different
 * emulator cores while maintaining the same interface. This implementation handles:
 * 
 * - WASM module loading and initialization
 * - Memory management between JavaScript and WebAssembly
 * - Video frame buffering and pixel format conversion
 * - Audio sample buffering
 * - Input state management for up to 4 controller ports
 * - Save state serialization/deserialization
 * 
 * Architecture:
 * 
 * The snes9x API uses a callback-based design where the core calls back into
 * the frontend (this class) for video/audio/input. The flow is:
 * 
 * 1. Frontend calls retro_run() to execute one frame
 * 2. Core executes emulation and calls video_refresh() with frame data
 * 3. Core calls audio_sample() or audio_sample_batch() with audio data
 * 4. Core calls input_poll() to signal it wants to read input
 * 5. Core calls input_state() for each button it wants to check
 * 6. retro_run() returns, frame is complete
 * 
 * @example
 * ```typescript
 * const core = new Snes9xWasmCore('snes9x');
 * await core.loadROM(romData);
 * await core.runFrame(); // Execute one frame
 * const frame = core.getBuffer(); // Get video output
 * const audio = core.getAudioSamples(); // Get audio output
 * ```
 */
export class Snes9xWasmCore implements IEmulatorCore {
  // WASM module and memory
  private module: EmscriptenModule | null = null;
  private memory: ArrayBuffer | null = null;
  
  // Core identification
  private coreName: string;
  private coreUrl: string;
  
  // Video state
  private width = 256;
  private height = 224;
  private pitch = 0; // Bytes per line
  private pixelFormat: number = RetroPixelFormat.RGB565;
  private videoBuffer: Uint8Array;
  private frameReady = false;
  
  // Audio state
  private audioBuffer: Float32Array;
  private audioWritePos = 0;
  private readonly maxAudioSamples = 8192; // Large buffer for variable frame audio
  
  // Input state for up to 4 controller ports
  private inputState: number[] = [0, 0, 0, 0];
  
  // Emulator state
  private isInitialized = false;
  private romLoaded = false;
  
  // System info from core
  private systemAvInfo: RetroSystemAvInfo | null = null;

  /**
   * Create a new Snes9xWasm core instance
   * @param coreName - Name of the core to load (e.g., 'snes9x', 'bsnes')
   * @param coreUrl - Optional custom URL for the core WASM file
   */
  constructor(coreName: string = 'snes9x', coreUrl?: string) {
    this.coreName = coreName;
    
    // Default to external SNES9x WASM URL if not provided
    // For production, these cores should be hosted locally in the public/ directory
    this.coreUrl = coreUrl || `https://kazuki-4ys.github.io/web_apps/snes9x-2005-wasm/snes9x_2005.js`;
    
    // Initialize buffers with default SNES resolution
    this.videoBuffer = new Uint8Array(this.width * this.height * 4); // RGBA
    this.audioBuffer = new Float32Array(this.maxAudioSamples * 2); // Stereo
  }

  /**
   * Initialize the Snes9xWasm core
   * 
   * This loads the WASM module and sets up all the snes9x callbacks.
   * The initialization process:
   * 
   * 1. Load the core's JavaScript wrapper and WASM module
   * 2. Set up memory for shared data between JS and WASM
   * 3. Register environment callbacks (retro_set_environment)
   * 4. Register video callback (retro_set_video_refresh)
   * 5. Register audio callbacks (retro_set_audio_sample, retro_set_audio_sample_batch)
   * 6. Register input callbacks (retro_set_input_poll, retro_set_input_state)
   * 7. Call retro_init() to initialize the core
   * 
   * @throws Error if WASM module fails to load or initialize
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load the Snes9xWasm core WASM module
      // The buildbot cores come with an Emscripten-generated JS loader
      const Module = await this.loadWasmModule();
      this.module = Module;
      
      // Get the WASM memory buffer
      this.memory = Module.HEAP8.buffer;
      
      // Set up snes9x environment callback
      // This is called by the core to query capabilities and configuration
      Module._retro_set_environment(
        Module.addFunction(this.environmentCallback.bind(this), 'iii')
      );
      
      // Set up video refresh callback
      // Called by the core when a new frame is ready
      Module._retro_set_video_refresh(
        Module.addFunction(this.videoRefreshCallback.bind(this), 'viiii')
      );
      
      // Set up audio sample callback (single sample, rarely used)
      Module._retro_set_audio_sample(
        Module.addFunction(this.audioSampleCallback.bind(this), 'vii')
      );
      
      // Set up audio sample batch callback (multiple samples, preferred)
      Module._retro_set_audio_sample_batch(
        Module.addFunction(this.audioSampleBatchCallback.bind(this), 'iii')
      );
      
      // Set up input poll callback
      // Called by the core before reading input state
      Module._retro_set_input_poll(
        Module.addFunction(this.inputPollCallback.bind(this), 'v')
      );
      
      // Set up input state callback
      // Called by the core to read button states
      Module._retro_set_input_state(
        Module.addFunction(this.inputStateCallback.bind(this), 'iiiii')
      );
      
      // Initialize the core
      Module._retro_init();
      
      this.isInitialized = true;
      console.log(`Snes9xWasm core '${this.coreName}' initialized successfully`);
    } catch (error) {
      console.error('Failed to initialize Snes9xWasm core:', error);
      throw new Error(`Failed to initialize Snes9xWasm core: ${error}`);
    }
  }

  /**
   * Load a WASM module from the specified URL
   * 
   * For Emscripten-compiled cores from buildbot, the .js file is a loader that
   * handles instantiating the WASM module with all necessary glue code.
   * 
   * @returns Promise resolving to the Module object
   * @private
   */
  private async loadWasmModule(): Promise<EmscriptenModule> {
    return new Promise((resolve, reject) => {
      // Create a script element to load the Emscripten-generated JS
      const script = document.createElement('script');
      script.src = this.coreUrl;
      
      // Set up Module object that Emscripten will populate
      const Module: Partial<EmscriptenModule> & {
        noInitialRun?: boolean;
        noExitRuntime?: boolean;
        onRuntimeInitialized?: () => void;
        onAbort?: (error: unknown) => void;
      } = {
        // Don't auto-run main()
        noInitialRun: true,
        // Don't exit on main() return
        noExitRuntime: true,
        // Handle module ready
        onRuntimeInitialized: () => {
          resolve(Module as EmscriptenModule);
        },
        // Handle errors
        onAbort: (error: unknown) => {
          reject(new Error(`Module load aborted: ${error}`));
        },
      };
      
      // Make Module available globally for the Emscripten loader
      // Use a unique namespace to avoid conflicts
      const globalObj = window as { __omnilatorModule?: typeof Module };
      globalObj.__omnilatorModule = Module;
      (window as { Module?: typeof Module }).Module = Module;
      
      script.onerror = () => {
        reject(new Error(`Failed to load core from ${this.coreUrl}`));
      };
      
      // Append script and track for cleanup
      document.head.appendChild(script);
      
      // Clean up script element after module loads
      const cleanup = () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        // Clean up global namespace
        delete (window as { Module?: typeof Module }).Module;
        delete (window as { __omnilatorModule?: typeof Module }).__omnilatorModule;
      };
      
      // Schedule cleanup after a delay to ensure module is fully initialized
      setTimeout(cleanup, 1000);
    });
  }

  /**
   * Environment callback - handles core queries about capabilities
   * 
   * This is called by the core to query the frontend's capabilities and to
   * set configuration options. The most important ones for SNES are:
   * 
   * - SET_PIXEL_FORMAT: Core tells us what pixel format it will use
   * - SET_SYSTEM_AV_INFO: Core tells us the resolution and frame rate
   * - GET_SYSTEM_DIRECTORY: Where to find system files (BIOS, etc.)
   * - GET_SAVE_DIRECTORY: Where to save game saves
   * 
   * @param cmd - Environment command ID
   * @param data - Pointer to command data in WASM memory
   * @returns 1 if command was handled, 0 otherwise
   * @private
   */
  private environmentCallback(cmd: number, data: number): number {
    switch (cmd) {
      case RetroEnvironment.GET_CAN_DUPE:
        // We support frame duplication (core can skip sending identical frames)
        if (data) {
          const view = new Uint8Array(this.memory!);
          view[data] = 1; // true
        }
        return 1;

      case RetroEnvironment.SET_PIXEL_FORMAT:
        // Core is telling us what pixel format it will use
        if (data) {
          const view = new Uint32Array(this.memory!);
          const format = view[data >> 2];
          this.pixelFormat = format;
          const formatName = format === RetroPixelFormat.RGB565 ? 'RGB565' : 
                            format === RetroPixelFormat.XRGB8888 ? 'XRGB8888' :
                            format === RetroPixelFormat.RGB1555 ? 'RGB1555' : 'Unknown';
          console.log(`Pixel format set to: ${format} (${formatName})`);
        }
        return 1;

      case RetroEnvironment.GET_SYSTEM_DIRECTORY:
      case RetroEnvironment.GET_SAVE_DIRECTORY:
        // For web, we don't have a persistent file system
        // Return null pointer to indicate no directory
        if (data) {
          const view = new Uint32Array(this.memory!);
          view[data >> 2] = 0;
        }
        return 1;

      case RetroEnvironment.SET_SYSTEM_AV_INFO:
        // Core is telling us the video/audio configuration
        if (data) {
          this.readSystemAvInfo(data);
        }
        return 1;

      case RetroEnvironment.SET_SUPPORT_NO_GAME:
        // Some cores can run without a game loaded
        // We don't support this for SNES
        return 0;

      default:
        // Unknown or unimplemented command
        console.log(`Unhandled environment command: ${cmd}`);
        return 0;
    }
  }

  /**
   * Read system AV info from WASM memory
   * 
   * The system AV info structure contains important information about
   * the emulated system's video and audio output:
   * 
   * - Video resolution (base and maximum)
   * - Aspect ratio
   * - Frame rate (typically 60.0 or 50.0 for PAL)
   * - Audio sample rate (typically 32040.5 Hz for SNES)
   * 
   * @param ptr - Pointer to retro_system_av_info structure in WASM memory
   * @private
   */
  private readSystemAvInfo(ptr: number): void {
    const view = new Uint32Array(this.memory!);
    const floatView = new Float32Array(this.memory!);
    
    // Read geometry structure
    const geometryPtr = ptr >> 2;
    const base_width = view[geometryPtr];
    const base_height = view[geometryPtr + 1];
    const max_width = view[geometryPtr + 2];
    const max_height = view[geometryPtr + 3];
    const aspect_ratio = floatView[geometryPtr + 4];
    
    // Read timing structure (comes after geometry)
    const timingPtr = geometryPtr + 5;
    const fps = floatView[timingPtr];
    const sample_rate = floatView[timingPtr + 1];
    
    this.systemAvInfo = {
      geometry: {
        base_width,
        base_height,
        max_width,
        max_height,
        aspect_ratio,
      },
      timing: {
        fps,
        sample_rate,
      },
    };
    
    // Update our video buffer to match the resolution
    this.width = base_width;
    this.height = base_height;
    this.videoBuffer = new Uint8Array(this.width * this.height * 4); // RGBA
    
    console.log('System AV info:', this.systemAvInfo);
  }

  /**
   * Video refresh callback - receives a new frame from the core
   * 
   * This is called by the core when it has rendered a new frame. The frame data
   * is in WASM memory and needs to be:
   * 
   * 1. Copied from WASM memory to our JavaScript buffer
   * 2. Converted from the core's pixel format (usually RGB565) to RGBA
   * 3. Stored for retrieval by getBuffer()
   * 
   * @param data - Pointer to frame data in WASM memory (0 means duplicate frame)
   * @param width - Frame width in pixels
   * @param height - Frame height in pixels
   * @param pitch - Bytes per line (may include padding)
   * @private
   */
  private videoRefreshCallback(data: number, width: number, height: number, pitch: number): void {
    // data == 0 means the core is requesting a frame dupe (reuse previous frame)
    if (data === 0) {
      this.frameReady = true;
      return;
    }
    
    // Update dimensions if they changed
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.videoBuffer = new Uint8Array(width * height * 4);
    }
    
    this.pitch = pitch;
    
    // Copy frame data from WASM memory and convert pixel format
    this.copyAndConvertFrame(data);
    
    this.frameReady = true;
  }

  /**
   * Copy frame data from WASM memory and convert pixel format
   * 
   * Handles conversion from various snes9x pixel formats to RGBA8888:
   * - RGB565: 16-bit, 5-6-5 bits per channel
   * - RGB1555: 16-bit, 5-5-5 bits per channel, 1 unused bit
   * - XRGB8888: 32-bit, 8-8-8 bits per channel, 8 unused bits
   * 
   * @param srcPtr - Pointer to source frame data in WASM memory
   * @private
   */
  private copyAndConvertFrame(srcPtr: number): void {
    const src = new Uint8Array(this.memory!, srcPtr, this.pitch * this.height);
    
    if (this.pixelFormat === RetroPixelFormat.RGB565) {
      // Convert RGB565 to RGBA8888
      // RGB565: RRRRRGGGGGGBBBBB (16-bit, little endian)
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIdx = y * this.pitch + x * 2;
          const dstIdx = (y * this.width + x) * 4;
          
          // Read 16-bit value (little endian)
          const pixel = src[srcIdx] | (src[srcIdx + 1] << 8);
          
          // Extract RGB components
          const r = (pixel >> 11) & 0x1F;
          const g = (pixel >> 5) & 0x3F;
          const b = pixel & 0x1F;
          
          // Scale to 8-bit (5-bit: *255/31, 6-bit: *255/63)
          this.videoBuffer[dstIdx] = (r * 255 / 31) | 0;
          this.videoBuffer[dstIdx + 1] = (g * 255 / 63) | 0;
          this.videoBuffer[dstIdx + 2] = (b * 255 / 31) | 0;
          this.videoBuffer[dstIdx + 3] = 255; // Alpha
        }
      }
    } else if (this.pixelFormat === RetroPixelFormat.XRGB8888) {
      // Convert XRGB8888 to RGBA8888 (just copy RGB, ignore X)
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIdx = y * this.pitch + x * 4;
          const dstIdx = (y * this.width + x) * 4;
          
          // XRGB8888 is usually BGRA in memory on little-endian
          this.videoBuffer[dstIdx] = src[srcIdx + 2]; // R
          this.videoBuffer[dstIdx + 1] = src[srcIdx + 1]; // G
          this.videoBuffer[dstIdx + 2] = src[srcIdx]; // B
          this.videoBuffer[dstIdx + 3] = 255; // A
        }
      }
    } else if (this.pixelFormat === RetroPixelFormat.RGB1555) {
      // Convert RGB1555 to RGBA8888
      // RGB1555: 0RRRRRGGGGGBBBBB (16-bit, little endian)
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIdx = y * this.pitch + x * 2;
          const dstIdx = (y * this.width + x) * 4;
          
          // Read 16-bit value (little endian)
          const pixel = src[srcIdx] | (src[srcIdx + 1] << 8);
          
          // Extract RGB components (ignore top bit)
          const r = (pixel >> 10) & 0x1F;
          const g = (pixel >> 5) & 0x1F;
          const b = pixel & 0x1F;
          
          // Scale to 8-bit
          this.videoBuffer[dstIdx] = (r * 255 / 31) | 0;
          this.videoBuffer[dstIdx + 1] = (g * 255 / 31) | 0;
          this.videoBuffer[dstIdx + 2] = (b * 255 / 31) | 0;
          this.videoBuffer[dstIdx + 3] = 255; // Alpha
        }
      }
    }
  }

  /**
   * Audio sample callback - receives a single audio sample (rarely used)
   * 
   * Most cores prefer to use the batch callback for efficiency.
   * 
   * Converts int16 samples to float32 in the range [-1, 1].
   * Note: int16 range is asymmetric (-32768 to 32767), but for audio
   * we treat it symmetrically by dividing by 32768.0.
   * 
   * @param left - Left channel sample (-32768 to 32767)
   * @param right - Right channel sample (-32768 to 32767)
   * @private
   */
  private audioSampleCallback(left: number, right: number): void {
    // Convert from int16 range to float32 range [-1, 1]
    // Using 32768.0 for both positive and negative values is acceptable for audio
    // as the error at -32768 (-1.00003) is negligible
    const leftFloat = left / 32768.0;
    const rightFloat = right / 32768.0;
    
    // Add to buffer
    if (this.audioWritePos < this.maxAudioSamples * 2) {
      this.audioBuffer[this.audioWritePos++] = leftFloat;
      this.audioBuffer[this.audioWritePos++] = rightFloat;
    }
  }

  /**
   * Audio sample batch callback - receives multiple audio samples
   * 
   * This is the preferred way for cores to send audio data. The samples are
   * interleaved stereo int16 values that need to be converted to float32.
   * 
   * Converts int16 samples to float32 in the range [-1, 1].
   * Note: int16 range is asymmetric (-32768 to 32767), but for audio
   * we treat it symmetrically by dividing by 32768.0.
   * 
   * @param data - Pointer to audio data in WASM memory
   * @param frames - Number of stereo frames (each frame is 2 samples: L+R)
   * @returns Number of frames processed
   * @private
   */
  private audioSampleBatchCallback(data: number, frames: number): number {
    // Read int16 samples from WASM memory
    const samples = new Int16Array(this.memory!, data, frames * 2);
    
    // Convert to float32 and copy to our buffer
    // Using 32768.0 for conversion is standard practice for audio
    for (let i = 0; i < frames * 2 && this.audioWritePos < this.maxAudioSamples * 2; i++) {
      this.audioBuffer[this.audioWritePos++] = samples[i] / 32768.0;
    }
    
    return frames;
  }

  /**
   * Input poll callback - called by core before reading input
   * 
   * This is called once per frame by the core to signal that it's about to
   * read input state. We don't need to do anything here since input is
   * already stored in this.inputState.
   * 
   * @private
   */
  private inputPollCallback(): void {
    // Input is already available in this.inputState
    // No action needed
  }

  /**
   * Input state callback - returns button state for a specific input
   * 
   * This is called by the core to check if a specific button is pressed.
   * The core will call this multiple times per frame for each button it
   * wants to check.
   * 
   * @param port - Controller port (0-3)
   * @param device - Device type (usually JOYPAD)
   * @param _index - For multi-pad devices, which pad (usually 0, unused for standard joypad)
   * @param id - Button ID (0-15 for standard joypad)
   * @returns 1 if button is pressed, 0 otherwise
   * @private
   */
  private inputStateCallback(port: number, device: number, _index: number, id: number): number {
    // Only handle joypad input for ports 0-3
    if (device !== RetroDeviceType.JOYPAD || port < 0 || port > 3) {
      return 0;
    }
    
    // Check if the button is pressed in our input state
    const buttonMask = 1 << id;
    return (this.inputState[port] & buttonMask) ? 1 : 0;
  }

  /**
   * Load a ROM file into the emulator
   * 
   * This allocates memory in the WASM heap, copies the ROM data, and calls
   * the core's retro_load_game() function.
   * 
   * @param romData - The ROM file data
   * @throws Error if ROM fails to load
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.module) {
      throw new Error('Module not initialized');
    }

    try {
      // Allocate memory for ROM data in WASM heap
      const romPtr = this.module._malloc(romData.length);
      if (!romPtr) {
        throw new Error('Failed to allocate memory for ROM');
      }

      // Copy ROM data to WASM memory
      const romView = new Uint8Array(this.memory!, romPtr, romData.length);
      romView.set(romData);

      // Create game info structure
      const gameInfoPtr = this.module._malloc(16); // sizeof(retro_game_info)
      const gameInfoView = new Uint32Array(this.memory!, gameInfoPtr, 4);
      gameInfoView[0] = 0; // path (null)
      gameInfoView[1] = romPtr; // data
      gameInfoView[2] = romData.length; // size
      gameInfoView[3] = 0; // meta (null)

      // Load the game
      const success = this.module._retro_load_game(gameInfoPtr);

      // Free the game info structure (ROM data is copied by core)
      this.module._free(gameInfoPtr);
      this.module._free(romPtr);

      if (!success) {
        throw new Error('Core rejected ROM file');
      }

      this.romLoaded = true;
      console.log(`ROM loaded successfully (${romData.length} bytes)`);

      // Get system AV info after loading
      const avInfoPtr = this.module._malloc(40); // sizeof(retro_system_av_info)
      this.module._retro_get_system_av_info(avInfoPtr);
      this.readSystemAvInfo(avInfoPtr);
      this.module._free(avInfoPtr);
    } catch (error) {
      console.error('Failed to load ROM:', error);
      throw error;
    }
  }

  /**
   * Execute one frame of emulation
   * 
   * This calls the core's retro_run() function, which will execute one frame
   * of SNES emulation (~16.67ms at 60 FPS). During execution, the core will
   * call our video and audio callbacks to deliver the output.
   * 
   * @throws Error if emulator is not initialized or ROM not loaded
   */
  async runFrame(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('No ROM loaded');
    }
    if (!this.module) {
      throw new Error('Module not initialized');
    }

    // Reset frame and audio state
    this.frameReady = false;
    this.audioWritePos = 0;

    // Run one frame of emulation
    // This will trigger video_refresh and audio callbacks
    this.module._retro_run();

    // Wait for frame to be ready (should be immediate since retro_run is synchronous)
    if (!this.frameReady) {
      console.warn('Frame not ready after retro_run()');
    }
  }

  /**
   * Get the current video frame buffer
   * 
   * Returns the last rendered frame as an ImageData object ready for
   * drawing to a canvas.
   * 
   * @returns ImageData containing the current frame in RGBA format
   */
  getBuffer(): ImageData {
    const imageData = new ImageData(this.width, this.height);
    imageData.data.set(this.videoBuffer);
    return imageData;
  }

  /**
   * Get audio samples from the last frame
   * 
   * Returns audio samples generated during the last runFrame() call.
   * The samples are interleaved stereo float32 values in the range [-1, 1].
   * 
   * @returns Float32Array containing stereo audio samples
   */
  getAudioSamples(): Float32Array {
    // Return only the portion of the buffer that was written
    return this.audioBuffer.slice(0, this.audioWritePos);
  }

  /**
   * Set controller input state for a specific port
   * 
   * The button bitmask matches the SnesButton constants from IEmulatorCore:
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
   * @param port - Controller port (0-3 for standard 4-player support)
   * @param buttons - Button state bitmask
   * @throws Error if port number is invalid
   */
  setInput(port: number, buttons: number): void {
    if (port < 0 || port > 3) {
      throw new Error(`Invalid port number: ${port}. Must be 0-3 for 4-player support.`);
    }
    this.inputState[port] = buttons;
  }

  /**
   * Save the current emulator state
   * 
   * Creates a snapshot of the entire emulator state that can be restored later.
   * This includes:
   * - CPU state (registers, flags)
   * - Memory (RAM, VRAM, etc.)
   * - PPU state (video processor)
   * - APU state (audio processor)
   * - Cartridge state (SRAM, etc.)
   * 
   * Save states are typically 150-300 KB for SNES.
   * 
   * @returns Uint8Array containing the serialized state
   * @throws Error if emulator is not initialized
   */
  saveState(): Uint8Array {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('No ROM loaded');
    }
    if (!this.module) {
      throw new Error('Module not initialized');
    }

    // Get save state size
    const size = this.module._retro_serialize_size();
    if (size === 0) {
      throw new Error('Core does not support save states');
    }

    // Allocate memory for save state
    const statePtr = this.module._malloc(size);
    if (!statePtr) {
      throw new Error('Failed to allocate memory for save state');
    }

    try {
      // Serialize emulator state
      const success = this.module._retro_serialize(statePtr, size);
      if (!success) {
        throw new Error('Failed to serialize state');
      }

      // Copy state data to JavaScript
      const stateView = new Uint8Array(this.memory!, statePtr, size);
      const state = new Uint8Array(size);
      state.set(stateView);

      return state;
    } finally {
      // Always free the allocated memory
      this.module._free(statePtr);
    }
  }

  /**
   * Load a previously saved emulator state
   * 
   * Restores the emulator to the exact state when saveState() was called.
   * This allows for:
   * - Quick save/load functionality
   * - Rewind feature (by saving states periodically)
   * - Tool-assisted speedrun (TAS) creation
   * 
   * @param state - The save state data from saveState()
   * @throws Error if state is invalid or fails to load
   */
  loadState(state: Uint8Array): void {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }
    if (!this.romLoaded) {
      throw new Error('No ROM loaded');
    }
    if (!this.module) {
      throw new Error('Module not initialized');
    }

    // Allocate memory for state data
    const statePtr = this.module._malloc(state.length);
    if (!statePtr) {
      throw new Error('Failed to allocate memory for state');
    }

    try {
      // Copy state data to WASM memory
      const stateView = new Uint8Array(this.memory!, statePtr, state.length);
      stateView.set(state);

      // Deserialize state
      const success = this.module._retro_unserialize(statePtr, state.length);
      if (!success) {
        throw new Error('Failed to deserialize state');
      }

      console.log('State loaded successfully');
    } finally {
      // Always free the allocated memory
      this.module._free(statePtr);
    }
  }

  /**
   * Reset the emulator to power-on state
   * 
   * This is equivalent to pressing the reset button on a real SNES.
   * All volatile state is cleared, but the ROM remains loaded.
   */
  reset(): void {
    if (!this.isInitialized || !this.module) {
      return;
    }
    if (this.romLoaded) {
      this.module._retro_reset();
      console.log('Emulator reset');
    }
  }

  /**
   * Clean up resources and shut down the emulator
   * 
   * This should be called when the emulator is no longer needed.
   * It frees all resources and makes the instance unusable.
   */
  cleanup(): void {
    if (this.isInitialized && this.module) {
      if (this.romLoaded) {
        this.module._retro_unload_game();
        this.romLoaded = false;
      }
      this.module._retro_deinit();
      this.isInitialized = false;
    }
    this.module = null;
    this.memory = null;
    console.log('Snes9xWasm core cleaned up');
  }

  /**
   * Get core information (name, version, etc.)
   * 
   * This can be called before initialization to get core metadata.
   * 
   * @returns Object containing core name and version information
   */
  getCoreInfo(): { name: string; version: string } {
    if (!this.isInitialized || !this.module) {
      return { name: this.coreName, version: 'unknown' };
    }

    // These functions return pointers to static strings in WASM memory
    const namePtr = this.module._retro_get_system_info_name?.() || 0;
    const versionPtr = this.module._retro_get_system_info_version?.() || 0;

    let name = this.coreName;
    let version = 'unknown';

    if (namePtr && this.memory) {
      const nameView = new Uint8Array(this.memory, namePtr);
      const nameBytes = [];
      for (let i = 0; nameView[i] !== 0; i++) {
        nameBytes.push(nameView[i]);
      }
      name = new TextDecoder().decode(new Uint8Array(nameBytes));
    }

    if (versionPtr && this.memory) {
      const versionView = new Uint8Array(this.memory, versionPtr);
      const versionBytes = [];
      for (let i = 0; versionView[i] !== 0; i++) {
        versionBytes.push(versionView[i]);
      }
      version = new TextDecoder().decode(new Uint8Array(versionBytes));
    }

    return { name, version };
  }
}
