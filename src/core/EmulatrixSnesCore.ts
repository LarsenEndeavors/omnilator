import type { IEmulatorCore } from './IEmulatorCore';

// Declare global types for Emscripten Module and BrowserFS
declare global {
  interface Window {
    Module: any;
    FS: any;
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

    console.log('[EmulatrixSnesCore] Initializing RetroArch WASM core...');

    return new Promise((resolve, reject) => {
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
        canvas: (() => {
          // Create canvas element for RetroArch to render to
          this.canvasElement = document.createElement('canvas');
          this.canvasElement.id = 'canvas';
          this.canvasElement.style.width = '100%';
          this.canvasElement.style.height = '100%';
          return this.canvasElement;
        })(),
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
    if (!this.isInitialized) {
      throw new Error('Core not initialized. Call initialize() first.');
    }

    if (!window.FS) {
      throw new Error('BrowserFS not available. Module may not have loaded correctly.');
    }

    console.log(`[EmulatrixSnesCore] Loading ROM (${romData.length} bytes)...`);

    try {
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

      // Generate RetroArch config file
      // These settings are copied from the working Emulatrix implementation
      const config = this.generateRetroArchConfig();
      window.FS.createDataFile('/home/web_user/retroarch/userdata', 'retroarch.cfg', config, true, true);
      console.log('[EmulatrixSnesCore] RetroArch config created');

      // Wait a bit for the filesystem to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start RetroArch with the ROM
      // This is the key command that starts everything
      console.log('[EmulatrixSnesCore] Starting RetroArch...');
      window.Module.callMain(['-v', '/game.smc']);

      console.log('[EmulatrixSnesCore] RetroArch started successfully');

      // Resize canvas after a delay (workaround for initialization timing)
      setTimeout(() => this.resizeCanvas(), 500);
      setTimeout(() => this.resizeCanvas(), 1000);
      setTimeout(() => this.resizeCanvas(), 1500);

    } catch (error) {
      console.error('[EmulatrixSnesCore] Error loading ROM:', error);
      throw new Error(`Failed to load ROM: ${error}`);
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
   * Resize the canvas to match container
   */
  private resizeCanvas(): void {
    if (!this.canvasElement) return;

    try {
      const container = this.canvasElement.parentElement;
      if (container && window.Module && window.Module.setCanvasSize) {
        const width = container.clientWidth || 512;
        const height = container.clientHeight || 448;
        window.Module.setCanvasSize(width, height, true);
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
   * Uses RetroArch's reset hotkey
   */
  reset(): void {
    console.log('[EmulatrixSnesCore] Reset requested');
    // Simulate F10 key press (reset hotkey as configured)
    if (this.canvasElement) {
      const event = new KeyboardEvent('keydown', { key: 'F10' });
      this.canvasElement.dispatchEvent(event);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('[EmulatrixSnesCore] Cleaning up...');
    
    // Remove canvas from DOM if attached
    if (this.canvasElement && this.canvasElement.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }

    // Clean up RetroArch (if possible)
    try {
      if (window.Module && window.Module.exit) {
        window.Module.exit();
      }
    } catch (error) {
      console.warn('[EmulatrixSnesCore] Error during cleanup:', error);
    }

    this.isInitialized = false;
  }
}
