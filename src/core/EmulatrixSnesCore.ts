import type { IEmulatorCore } from './IEmulatorCore';

// Minimal typings for the Emscripten Module and BrowserFS FS used by this core
interface EmulatrixEmscriptenModule {
  canvas?: HTMLCanvasElement;
  exit?: () => void;
  callMain?: (args: string[]) => void;
  setCanvasSize?: (width: number, height: number, noUpdates?: boolean) => void;
  preRun?: Array<() => void>;
  postRun?: Array<() => void>;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  setStatus?: (text: string) => void;
  totalDependencies?: number;
  monitorRunDependencies?: (left: number) => void;
  onRuntimeInitialized?: () => void;
  locateFile?: (path: string) => string;
}

interface EmulatrixBrowserFS {
  createDataFile(
    parent: string,
    name: string,
    data: Uint8Array | string,
    canRead: boolean,
    canWrite: boolean
  ): void;
  createFolder(parent: string, name: string, canRead: boolean, canWrite: boolean): void;
  unlink(path: string): void;
  readFile(path: string): Uint8Array;
}

// Declare global types for Emscripten Module and BrowserFS
declare global {
  interface Window {
    Module?: EmulatrixEmscriptenModule;
    FS?: EmulatrixBrowserFS;
  }
}

/**
 * Emulatrix SNES Core - Uses RetroArch WASM implementation
 * 
 * This core loads the proven Emulatrix RetroArch build which includes:
 * - Full RetroArch emulator with BrowserFS
 * - Automatic input handling via configuration
 * - Automatic audio with optimal latency settings
 * - Self-contained emulation loop
 * 
 * Unlike the custom snes9x wrapper, this implementation is much simpler:
 * - RetroArch manages its own frame loop (no manual runFrame needed)
 * - RetroArch handles audio directly (no custom AudioSystem needed)
 * - RetroArch reads keyboard input via config (no custom input hooks needed)
 */
export class EmulatrixSnesCore implements IEmulatorCore {
  // Canvas dimensions - SNES native resolution (256x224) scaled 3x for better pixel clarity
  private static readonly CANVAS_WIDTH = 768;
  private static readonly CANVAS_HEIGHT = 672;
  
  // Maximum allowed ROM size (8MB)
  private static readonly MAX_ROM_SIZE = 8 * 1024 * 1024;
  
  // Configuration verification settings
  private static readonly CONFIG_VERIFICATION_MAX_ATTEMPTS = 5;
  private static readonly CONFIG_VERIFICATION_INITIAL_DELAY_MS = 50;
  
  // Module initialization settings  
  private static readonly MODULE_INIT_POLL_INTERVAL_MS = 50;
  private static readonly MODULE_INIT_MAX_WAIT_MS = 2000;

  private isInitialized = false;
  private canvasElement: HTMLCanvasElement | null = null;

  constructor() {
    // Simple constructor - initialization happens in initialize()
  }

  /**
   * Initialize the Emulatrix RetroArch core
   * Loads the JavaScript module and sets up the environment
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[EmulatrixSnesCore] Already initialized');
      return;
    }

    // Check if Module already exists (e.g., from previous initialization)
    if (window.Module && window.FS) {
      console.log('[EmulatrixSnesCore] Reusing existing RetroArch module');
      
      // Try to get the existing canvas
      const existingCanvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (existingCanvas) {
        this.canvasElement = existingCanvas;
        // CRITICAL: Update Module.canvas to point to our canvas
        window.Module.canvas = this.canvasElement;
        console.log('[EmulatrixSnesCore] Found existing canvas and updated Module.canvas');
      } else {
        // Create canvas if it doesn't exist
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.id = 'canvas';
        // Set canvas dimensions to match SNES resolution
        this.canvasElement.width = EmulatrixSnesCore.CANVAS_WIDTH;
        this.canvasElement.height = EmulatrixSnesCore.CANVAS_HEIGHT;
        // CRITICAL: Set Module.canvas to our new canvas
        window.Module.canvas = this.canvasElement;
        console.log('[EmulatrixSnesCore] Created new canvas for existing module');
      }
      
      this.isInitialized = true;
      return;
    }

    console.log('[EmulatrixSnesCore] Initializing RetroArch WASM core...');

    return new Promise((resolve, reject) => {
      // Create canvas element first
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.id = 'canvas';
      // Set canvas dimensions to match SNES resolution
      this.canvasElement.width = EmulatrixSnesCore.CANVAS_WIDTH;
      this.canvasElement.height = EmulatrixSnesCore.CANVAS_HEIGHT;

      // Set up Module configuration before loading the script
      // This is based on the Emulatrix pattern
      window.Module = {
        preRun: [],
        postRun: [],
        print: (text: string) => {
          console.log('[RetroArch] ' + text);
        },
        printErr: (text: string) => {
          console.error('[RetroArch Error] ' + text);
        },
        canvas: this.canvasElement,
        setStatus: (text: string) => {
          console.log('[RetroArch Status] ' + text);
        },
        totalDependencies: 0,
        monitorRunDependencies: (left: number) => {
          console.log('[RetroArch] Dependencies remaining: ' + left);
        },
        onRuntimeInitialized: () => {
          console.log('[EmulatrixSnesCore] RetroArch runtime initialized');
          this.isInitialized = true;
          resolve();
        },
        locateFile: (path: string) => {
          // Ensure WASM and data files are loaded from the correct location
          if (path.endsWith('.wasm') || path.endsWith('.data')) {
            return `/cores/Emulatrix/${path}`;
          }
          return path;
        }
      };

      // Check if script already loaded
      if (document.querySelector('script[src*="Emulatrix_SuperNintendo.js"]')) {
        console.log('[EmulatrixSnesCore] Script already loaded, checking initialization state...');

        // If FS is already available, we can resolve immediately without waiting
        if (window.FS) {
          console.log('[EmulatrixSnesCore] Module already initialized');
          // CRITICAL: Set Module.canvas to our canvas element
          if (window.Module && this.canvasElement) {
            window.Module.canvas = this.canvasElement;
          }
          console.log('[EmulatrixSnesCore] Module.canvas set to our canvas element');
          this.isInitialized = true;
          resolve();
          return;
        }

        // Otherwise, poll for FS becoming available with a bounded timeout
        const startTime = performance.now();

        const intervalId = window.setInterval(() => {
          if (window.FS) {
            window.clearInterval(intervalId);
            console.log('[EmulatrixSnesCore] Module initialized after script was loaded');
            // CRITICAL: Set Module.canvas to our canvas element
            if (window.Module && this.canvasElement) {
              window.Module.canvas = this.canvasElement;
            }
            console.log('[EmulatrixSnesCore] Module.canvas set to our canvas element');
            this.isInitialized = true;
            resolve();
            return;
          }

          if (performance.now() - startTime >= EmulatrixSnesCore.MODULE_INIT_MAX_WAIT_MS) {
            window.clearInterval(intervalId);
            reject(new Error('Module script loaded but FS not available within timeout'));
          }
        }, EmulatrixSnesCore.MODULE_INIT_POLL_INTERVAL_MS);
        return;
      }

      // Load the Emulatrix SuperNintendo JavaScript module
      const script = document.createElement('script');
      script.src = '/cores/Emulatrix/Emulatrix_SuperNintendo.js';
      script.async = true;

      script.onerror = () => {
        delete window.Module;
        reject(new Error('Failed to load Emulatrix SuperNintendo module'));
      };

      console.log('[EmulatrixSnesCore] Loading Emulatrix_SuperNintendo.js...');
      document.head.appendChild(script);
    });
  }

  /**
   * Load a ROM into the emulator
   * This creates the virtual filesystem and starts RetroArch
   */
  async loadROM(romData: Uint8Array): Promise<void> {
    // Validate initialization state
    if (!this.isInitialized) {
      throw new Error('Core not initialized. Call initialize() first.');
    }

    if (!window.FS) {
      throw new Error('BrowserFS not available. Module may not have loaded correctly.');
    }

    if (!this.canvasElement) {
      throw new Error('Canvas not available. Initialization may have failed.');
    }

    // Validate ROM data
    if (!romData || romData.length === 0) {
      throw new Error('ROM data is empty. Please provide a valid ROM file.');
    }

    if (romData.length > EmulatrixSnesCore.MAX_ROM_SIZE) {
      throw new Error(
        `ROM file too large (${romData.length} bytes). Maximum size is ${EmulatrixSnesCore.MAX_ROM_SIZE} bytes (8MB).`
      );
    }

    console.log(`[EmulatrixSnesCore] Loading ROM (${romData.length} bytes)...`);

    try {
      // CRITICAL: Canvas must be in DOM before calling Module.callMain()
      // RetroArch tries to create WebGL context immediately
      if (!this.canvasElement.parentElement) {
        throw new Error('Canvas must be added to DOM before loading ROM. Call getCanvas() and append it first.');
      }

      // Clean up old ROM if it exists
      try {
        window.FS.unlink('/game.smc');
        console.log('[EmulatrixSnesCore] Removed old ROM file');
      } catch (e) {
        // File doesn't exist, that's fine
      }

      // Create the ROM file in the virtual filesystem
      // This is exactly how Emulatrix does it
      window.FS.createDataFile('/', 'game.smc', romData, true, false);
      console.log('[EmulatrixSnesCore] ROM file created in virtual FS');

      // Create necessary directories for RetroArch config
      try {
        window.FS.createFolder('/home', 'web_user', true, true);
      } catch (e) {
        // Folder may already exist
      }
      try {
        window.FS.createFolder('/home/web_user', 'retroarch', true, true);
      } catch (e) {
        // Folder may already exist
      }
      try {
        window.FS.createFolder('/home/web_user/retroarch', 'userdata', true, true);
      } catch (e) {
        // Folder may already exist
      }

      // Remove old config if it exists
      try {
        window.FS.unlink('/home/web_user/retroarch/userdata/retroarch.cfg');
        console.log('[EmulatrixSnesCore] Removed old config file');
      } catch (e) {
        // File doesn't exist, that's fine
      }

      // Generate RetroArch config file
      // These settings are copied from the working Emulatrix implementation
      const config = this.generateRetroArchConfig();
      window.FS.createDataFile('/home/web_user/retroarch/userdata', 'retroarch.cfg', config, true, true);
      console.log('[EmulatrixSnesCore] RetroArch config created');

      // Define checkControls stub (required by RetroArch)
      // This function is called by RetroArch's main loop
      if (!(window as any).checkControls) {
        (window as any).checkControls = () => {
          // No-op for now - RetroArch expects this function
          // In the original Emulatrix, this handles mobile controls and parent notifications
        };
        console.log('[EmulatrixSnesCore] Defined checkControls stub');
      }

      // Wait for config file to be written and verified using bounded retries
      const configPath = '/home/web_user/retroarch/userdata/retroarch.cfg';
      const verifyConfigFile = async (): Promise<void> => {
        let delay = EmulatrixSnesCore.CONFIG_VERIFICATION_INITIAL_DELAY_MS;
        
        for (let attempt = 1; attempt <= EmulatrixSnesCore.CONFIG_VERIFICATION_MAX_ATTEMPTS; attempt++) {
          try {
            const fileContent = window.FS!.readFile(configPath);
            if (fileContent && fileContent.length === config.length) {
              console.log('[EmulatrixSnesCore] Config file verified');
              return;
            }
          } catch (error) {
            // Ignore and retry with backoff below
          }

          if (attempt === EmulatrixSnesCore.CONFIG_VERIFICATION_MAX_ATTEMPTS) {
            throw new Error(
              `Config file verification failed after ${EmulatrixSnesCore.CONFIG_VERIFICATION_MAX_ATTEMPTS} attempts`
            );
          }

          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      };

      try {
        await verifyConfigFile();
      } catch (error) {
        console.warn('[EmulatrixSnesCore] Config file verification did not succeed, proceeding anyway', error);
      }

      // Start RetroArch with the ROM
      // This is the key command that starts everything
      console.log('[EmulatrixSnesCore] Starting RetroArch...');
      if (window.Module?.callMain) {
        window.Module.callMain(['-v', '/game.smc']);
      } else {
        throw new Error('Module.callMain not available');
      }

      console.log('[EmulatrixSnesCore] RetroArch started successfully');

      // WORKAROUND: Resize canvas after delays to handle RetroArch initialization timing
      // Multiple timeouts ensure canvas is sized correctly even on slower devices
      // TODO: Replace with proper event listeners or RetroArch callbacks when available
      setTimeout(() => this.resizeCanvas(), 500);
      setTimeout(() => this.resizeCanvas(), 1000);
      setTimeout(() => this.resizeCanvas(), 1500);

    } catch (error) {
      console.error('[EmulatrixSnesCore] Error loading ROM:', error);
      // Preserve the original error with context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to load ROM: ${String(error)}`);
    }
  }

  /**
   * Generate RetroArch configuration file
   * Based on Emulatrix_SuperNintendo.htm settings
   */
  private generateRetroArchConfig(): string {
    const emptyValue = 'scroll_lock'; // For unused bindings

    let config = '';

    // Browser directory
    config += 'rgui_browser_directory = /\n';

    // Input configuration - Player 1
    // Using keyboard mappings that match common expectations
    config += 'input_player1_start = enter\n';
    config += 'input_player1_select = rshift\n';
    config += 'input_player1_a = x\n';
    config += 'input_player1_b = z\n';
    config += 'input_player1_x = s\n';
    config += 'input_player1_y = a\n';
    config += 'input_player1_l = q\n';
    config += 'input_player1_r = w\n';

    // D-Pad uses arrow keys (handled by RetroArch defaults)

    // Special functions
    config += 'input_audio_mute = f9\n';
    config += 'input_reset = f10\n';

    // Disable unwanted hotkeys
    const disabledKeys = [
      'input_toggle_fast_forward', 'input_hold_fast_forward',
      'input_toggle_slowmotion', 'input_hold_slowmotion',
      'input_save_state', 'input_load_state',
      'input_toggle_fullscreen', 'input_exit_emulator',
      'input_state_slot_increase', 'input_state_slot_decrease',
      'input_rewind', 'input_movie_record_toggle',
      'input_pause_toggle', 'input_frame_advance',
      'input_shader_next', 'input_shader_prev',
      'input_cheat_index_plus', 'input_cheat_index_minus',
      'input_cheat_toggle', 'input_screenshot',
      'input_osk_toggle', 'input_netplay_game_watch',
      'input_volume_up', 'input_volume_down',
      'input_overlay_next', 'input_disk_eject_toggle',
      'input_disk_next', 'input_disk_prev',
      'input_grab_mouse_toggle', 'input_game_focus_toggle',
      'input_menu_toggle', 'input_recording_toggle',
      'input_streaming_toggle'
    ];

    disabledKeys.forEach(key => {
      config += `${key} = ${emptyValue}\n`;
    });

    // Disable Player 2-5 inputs (all set to empty value)
    for (let player = 2; player <= 5; player++) {
      const playerInputs = [
        'up', 'down', 'left', 'right', 'start', 'select',
        'a', 'b', 'x', 'y', 'l', 'r', 'l2', 'l3', 'r2', 'r3',
        'l_x_plus', 'l_x_minus', 'l_y_plus', 'l_y_minus',
        'r_x_plus', 'r_x_minus', 'r_y_plus', 'r_y_minus',
        'gun_trigger', 'gun_trigger_axis', 'gun_trigger_btn', 'gun_trigger_mbtn',
        'gun_offscreen_shot', 'gun_aux_a', 'gun_aux_b', 'gun_aux_c',
        'gun_start', 'gun_select', 'gun_dpad_up', 'gun_dpad_down',
        'gun_dpad_left', 'gun_dpad_right', 'turbo'
      ];

      playerInputs.forEach(input => {
        config += `input_player${player}_${input} = ${emptyValue}\n`;
      });
    }

    // Video configuration
    const width = this.canvasElement?.width || 512;
    const height = this.canvasElement?.height || 448;
    config += 'video_vsync = true\n';
    config += 'video_scale = 1\n';
    config += `video_window_x = ${width}\n`;
    config += `video_window_y = ${height}\n`;
    config += 'aspect_ratio_index = 23\n';
    config += `custom_viewport_width = ${width}\n`;
    config += `custom_viewport_height = ${height}\n`;
    config += 'custom_viewport_x = 0\n';
    config += 'custom_viewport_y = 0\n';

    // Audio configuration - CRITICAL for smooth audio
    // This is the key setting from Emulatrix that fixes audio choppiness
    config += 'audio_latency = 128\n';

    // Hide notification messages
    config += 'video_message_pos_x = -100\n';
    config += 'video_message_pos_y = -100\n';
    config += 'menu_enable_widgets = false\n';

    return config;
  }

  /**
   * Resize the canvas to match SNES display dimensions
   */
  private resizeCanvas(): void {
    if (!this.canvasElement) return;

    try {
      const container = this.canvasElement.parentElement;
      if (container) {
        // Set canvas to SNES display dimensions
        const width = EmulatrixSnesCore.CANVAS_WIDTH;
        const height = EmulatrixSnesCore.CANVAS_HEIGHT;
        
        // Update canvas internal resolution
        this.canvasElement.width = width;
        this.canvasElement.height = height;
        
        // Update RetroArch's canvas size if available
        if (window.Module && window.Module.setCanvasSize) {
          window.Module.setCanvasSize(width, height, true);
        }
        
        console.log(`[EmulatrixSnesCore] Canvas resized to ${width}x${height}`);
      }
    } catch (error) {
      console.warn('[EmulatrixSnesCore] Failed to resize canvas:', error);
    }
  }

  /**
   * Get the canvas element for rendering
   * The parent component should add this to the DOM
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvasElement;
  }

  /**
   * Run one frame - NOT NEEDED for RetroArch
   * RetroArch manages its own rendering loop internally
   */
  async runFrame(): Promise<void> {
    // RetroArch runs its own loop, no action needed
  }

  /**
   * Get video buffer - NOT NEEDED for RetroArch
   * RetroArch renders directly to canvas
   */
  getBuffer(): ImageData {
    // RetroArch renders to canvas directly, return empty buffer
    return new ImageData(1, 1);
  }

  /**
   * Get audio samples - NOT NEEDED for RetroArch
   * RetroArch plays audio directly through WebAudio
   */
  getAudioSamples(): Float32Array {
    // RetroArch handles audio directly, return empty
    return new Float32Array(0);
  }

  /**
   * Set input - NOT NEEDED for RetroArch
   * RetroArch reads keyboard input directly via config
   */
  setInput(_port: number, _buttons: number): void {
    // RetroArch handles input through its config, no action needed
  }

  /**
   * Save state - RetroArch supports this via hotkeys
   * For now, return empty state
   */
  saveState(): Uint8Array {
    // TODO: Integrate with RetroArch's save state system
    console.warn('[EmulatrixSnesCore] Save state not yet implemented');
    return new Uint8Array(0);
  }

  /**
   * Load state - RetroArch supports this via hotkeys
   * For now, no-op
   */
  loadState(_state: Uint8Array): void {
    // TODO: Integrate with RetroArch's save state system
    console.warn('[EmulatrixSnesCore] Load state not yet implemented');
  }

  /**
   * Reset the emulator
   * Uses RetroArch's reset hotkey (F10)
   */
  reset(): void {
    console.log('[EmulatrixSnesCore] Reset requested');
    // Simulate F10 key press (reset hotkey as configured)
    // Dispatch to window since RetroArch typically listens for keyboard events there
    if (typeof window !== 'undefined') {
      const event = new KeyboardEvent('keydown', { key: 'F10' });
      window.dispatchEvent(event);
    }
  }

  /**
   * Cleanup resources
   * 
   * Note: This does not remove window.Module and window.FS globals as they
   * persist across instances and are reused by subsequent initializations.
   * This is intentional to support React StrictMode's double-mounting pattern.
   */
  cleanup(): void {
    console.log('[EmulatrixSnesCore] Cleaning up...');
    
    // Remove canvas from DOM if attached
    if (this.canvasElement && this.canvasElement.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }

    // Clean up RetroArch (if possible)
    // Note: This may not fully clean up the Module, which is intentional
    // for supporting reinitialization
    try {
      if (window.Module && window.Module.exit) {
        window.Module.exit();
      }
    } catch (error) {
      console.warn('[EmulatrixSnesCore] Error during cleanup:', error);
    }

    this.isInitialized = false;
    this.canvasElement = null;
  }
}
