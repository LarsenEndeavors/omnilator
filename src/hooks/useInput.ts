import { useEffect, useState } from 'react';
import { SnesButton } from '../core/IEmulatorCore';

/**
 * KEYBOARD TO SNES CONTROLLER MAPPING
 * 
 * This mapping is designed to match the specifications in README.md exactly.
 * Each keyboard key maps to exactly ONE SNES button with NO inversions or transformations.
 * 
 * SNES Controller Layout (for reference):
 * ┌─────────────────────────────────┐
 * │        L                    R   │
 * │                                 │
 * │   D-Pad          Y   X          │
 * │    ↑           ◄     ►          │
 * │  ◄ ► ↓                          │
 * │                B   A            │
 * │       SELECT START              │
 * └─────────────────────────────────┘
 * 
 * LibRetro Standard Button Bit Positions:
 * - Bit 0:  B button      (0x1)
 * - Bit 1:  Y button      (0x2)
 * - Bit 2:  SELECT        (0x4)
 * - Bit 3:  START         (0x8)
 * - Bit 4:  UP            (0x10)
 * - Bit 5:  DOWN          (0x20)
 * - Bit 6:  LEFT          (0x40)
 * - Bit 7:  RIGHT         (0x80)
 * - Bit 8:  A button      (0x100)
 * - Bit 9:  X button      (0x200)
 * - Bit 10: L button      (0x400)
 * - Bit 11: R button      (0x800)
 * 
 * References:
 * - README.md "Controls" section
 * - libretro.h RETRO_DEVICE_ID_JOYPAD_* definitions
 * - Emulatrix_SuperNintendo.htm input configuration
 */
const KEYBOARD_MAP: Record<string, number> = {
  // ═══════════════════════════════════════════════════════════════
  // D-PAD CONTROLS (Primary: Arrow Keys)
  // ═══════════════════════════════════════════════════════════════
  'ArrowUp':    SnesButton.UP,      // 0x10 - D-pad Up
  'ArrowDown':  SnesButton.DOWN,    // 0x20 - D-pad Down
  'ArrowLeft':  SnesButton.LEFT,    // 0x40 - D-pad Left
  'ArrowRight': SnesButton.RIGHT,   // 0x80 - D-pad Right
  
  // ═══════════════════════════════════════════════════════════════
  // D-PAD CONTROLS (Alternative: WASD)
  // ═══════════════════════════════════════════════════════════════
  'w': SnesButton.UP,      // 0x10 - D-pad Up (WASD alternative)
  'W': SnesButton.UP,      // 0x10 - D-pad Up (WASD alternative, uppercase)
  's': SnesButton.DOWN,    // 0x20 - D-pad Down (WASD alternative)
  'S': SnesButton.DOWN,    // 0x20 - D-pad Down (WASD alternative, uppercase)
  'a': SnesButton.LEFT,    // 0x40 - D-pad Left (WASD alternative)
  'A': SnesButton.LEFT,    // 0x40 - D-pad Left (WASD alternative, uppercase)
  'd': SnesButton.RIGHT,   // 0x80 - D-pad Right (WASD alternative)
  'D': SnesButton.RIGHT,   // 0x80 - D-pad Right (WASD alternative, uppercase)
  
  // ═══════════════════════════════════════════════════════════════
  // FACE BUTTONS (Right side of controller)
  // ═══════════════════════════════════════════════════════════════
  'x': SnesButton.A,       // 0x100 - A button (right face button)
  'X': SnesButton.A,       // 0x100 - A button (uppercase)
  'z': SnesButton.B,       // 0x1   - B button (bottom face button)
  'Z': SnesButton.B,       // 0x1   - B button (uppercase)
  'v': SnesButton.X,       // 0x200 - X button (top face button)
  'V': SnesButton.X,       // 0x200 - X button (uppercase)
  'c': SnesButton.Y,       // 0x2   - Y button (left face button)
  'C': SnesButton.Y,       // 0x2   - Y button (uppercase)
  
  // ═══════════════════════════════════════════════════════════════
  // SHOULDER BUTTONS (Top of controller)
  // ═══════════════════════════════════════════════════════════════
  'q': SnesButton.L,       // 0x400 - L shoulder button
  'Q': SnesButton.L,       // 0x400 - L shoulder button (uppercase)
  'e': SnesButton.R,       // 0x800 - R shoulder button
  'E': SnesButton.R,       // 0x800 - R shoulder button (uppercase)
  
  // ═══════════════════════════════════════════════════════════════
  // SYSTEM BUTTONS (Center of controller)
  // ═══════════════════════════════════════════════════════════════
  'Enter':      SnesButton.START,   // 0x8 - START button
  'Shift':      SnesButton.SELECT,  // 0x4 - SELECT button
  'ShiftLeft':  SnesButton.SELECT,  // 0x4 - SELECT button (left shift)
  'ShiftRight': SnesButton.SELECT,  // 0x4 - SELECT button (right shift)
};

/**
 * STANDARD GAMEPAD TO SNES CONTROLLER MAPPING
 * 
 * This uses the Standard Gamepad API button layout.
 * Button indices are from the W3C Gamepad API specification.
 * 
 * Standard Gamepad Layout:
 * - Buttons 0-3: Face buttons (A/B/X/Y on Xbox, Cross/Circle/Square/Triangle on PlayStation)
 * - Buttons 4-5: Shoulder buttons (L/R)
 * - Buttons 8-9: Select/Start (Share/Options on PlayStation)
 * - Buttons 12-15: D-pad
 * 
 * Mapping Strategy:
 * The physical button positions match SNES controller positions:
 * - Gamepad bottom button (0) → SNES B button (bottom on SNES)
 * - Gamepad right button (1) → SNES A button (right on SNES)
 * - Gamepad left button (2) → SNES Y button (left on SNES)
 * - Gamepad top button (3) → SNES X button (top on SNES)
 * 
 * References:
 * - https://www.w3.org/TR/gamepad/#remapping
 * - Standard Gamepad API button indices
 */
const GAMEPAD_MAP: Record<number, number> = {
  // Face buttons (right side of controller)
  0: SnesButton.B,        // 0x1   - Bottom face button → SNES B
  1: SnesButton.A,        // 0x100 - Right face button → SNES A
  2: SnesButton.Y,        // 0x2   - Left face button → SNES Y
  3: SnesButton.X,        // 0x200 - Top face button → SNES X
  
  // Shoulder buttons
  4: SnesButton.L,        // 0x400 - Left shoulder → SNES L
  5: SnesButton.R,        // 0x800 - Right shoulder → SNES R
  
  // System buttons
  8: SnesButton.SELECT,   // 0x4   - Select/Share button → SNES SELECT
  9: SnesButton.START,    // 0x8   - Start/Options button → SNES START
  
  // D-pad
  12: SnesButton.UP,      // 0x10  - D-pad up
  13: SnesButton.DOWN,    // 0x20  - D-pad down
  14: SnesButton.LEFT,    // 0x40  - D-pad left
  15: SnesButton.RIGHT,   // 0x80  - D-pad right
};

/**
 * Options for the useInput hook
 */
interface UseInputOptions {
  /** Controller port number (0-3 for players 1-4). Default: 0 */
  port?: number;
  /** Enable input handling. When false, no input is processed. Default: true */
  enabled?: boolean;
  /** 
   * Callback invoked whenever the button state changes.
   * Receives the combined button bitmask as a parameter.
   * 
   * @param buttons - Combined button state bitmask
   * 
   * @example
   * ```typescript
   * onInputChange: (buttons) => {
   *   console.log(`Buttons pressed: 0x${buttons.toString(16)}`);
   *   core.setInput(0, buttons);
   * }
   * ```
   */
  onInputChange?: (buttons: number) => void;
}

/**
 * Return value from the useInput hook
 */
interface UseInputResult {
  /** 
   * Current combined button state bitmask.
   * This is the bitwise OR of all pressed buttons from both keyboard and gamepad.
   * 
   * @example
   * ```typescript
   * const { buttons } = useInput();
   * if (buttons & SnesButton.A) {
   *   console.log('A button is pressed');
   * }
   * ```
   */
  buttons: number;
  
  /** 
   * Whether a gamepad is currently connected.
   * Updates when gamepad connects/disconnects.
   */
  isGamepadConnected: boolean;
}

/**
 * Custom React hook for handling SNES controller input from keyboard and gamepad.
 * 
 * This hook provides a complete input solution for SNES emulation:
 * - **Keyboard support** with primary (Arrow keys, X/Z/C/V) and alternative (WASD) controls
 * - **Gamepad support** using the Standard Gamepad API with automatic detection
 * - **Multi-input merging** - keyboard and gamepad inputs are combined with bitwise OR
 * - **Real-time updates** - input state updates immediately on key/button press/release
 * 
 * ## Keyboard Controls
 * 
 * The keyboard mapping matches README.md specifications:
 * 
 * | Keys | SNES Button | Bit | Hex |
 * |------|-------------|-----|-----|
 * | Arrow Keys / WASD | D-pad | 4-7 | 0x10-0x80 |
 * | X | A button | 8 | 0x100 |
 * | Z | B button | 0 | 0x1 |
 * | V | X button | 9 | 0x200 |
 * | C | Y button | 1 | 0x2 |
 * | Q | L button | 10 | 0x400 |
 * | E | R button | 11 | 0x800 |
 * | Enter | START | 3 | 0x8 |
 * | Shift | SELECT | 2 | 0x4 |
 * 
 * ## Gamepad Controls
 * 
 * Standard gamepad button layout is supported with automatic mapping to SNES buttons.
 * Gamepads are auto-detected when connected. The hook polls gamepad state at 60 FPS
 * using requestAnimationFrame.
 * 
 * ## Button State Bitmask
 * 
 * The returned `buttons` value is a 32-bit integer where each bit represents a button:
 * 
 * ```
 * Bit:  11 10  9  8  7  6  5  4  3  2  1  0
 * Btn:  R  L  X  A  →  ←  ↓  ↑  ▶  ⏯  Y  B
 * Hex:  800 400 200 100 80 40 20 10 8 4 2 1
 * ```
 * 
 * Multiple buttons pressed simultaneously are represented by ORing their bits:
 * - A + B = 0x101
 * - UP + A = 0x110
 * - START + SELECT = 0xC
 * 
 * ## Usage Example
 * 
 * ```typescript
 * import { useInput } from './hooks/useInput';
 * import { SnesButton } from './core/IEmulatorCore';
 * 
 * function EmulatorComponent() {
 *   const { buttons, isGamepadConnected } = useInput({
 *     port: 0,
 *     enabled: true,
 *     onInputChange: (buttons) => {
 *       core.setInput(0, buttons);
 *     },
 *   });
 * 
 *   return (
 *     <div>
 *       <p>Gamepad: {isGamepadConnected ? 'Connected' : 'Not connected'}</p>
 *       <p>Buttons: 0x{buttons.toString(16)}</p>
 *       <p>A pressed: {(buttons & SnesButton.A) ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @param options - Configuration options for input handling
 * @returns Current input state and gamepad connection status
 * 
 * @see {@link SnesButton} for button bit definitions
 * @see {@link KEYBOARD_MAP} for keyboard to button mapping
 * @see {@link GAMEPAD_MAP} for gamepad to button mapping
 */
export function useInput({
  port = 0,
  enabled = true,
  onInputChange,
}: UseInputOptions = {}): UseInputResult {
  const [keyboardButtons, setKeyboardButtons] = useState(0);
  const [gamepadButtons, setGamepadButtons] = useState(0);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // Derive combined button state instead of storing it separately
  // This avoids setState in effect and ensures buttons is always in sync
  const buttons = keyboardButtons | gamepadButtons;

  // Notify parent component when combined state changes
  useEffect(() => {
    onInputChange?.(buttons);
  }, [buttons, onInputChange]);

  // Keyboard event handlers
  useEffect(() => {
    if (!enabled) return;

    // Track currently pressed keys to handle multiple simultaneous key presses
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      if (button !== undefined) {
        // Prevent default browser behavior for mapped keys (e.g., arrow key scrolling)
        event.preventDefault();
        
        // Add key to pressed set
        pressedKeys.add(event.key);
        
        // Calculate combined button bitmask from all currently pressed keys
        let newButtons = 0;
        pressedKeys.forEach(key => {
          const btn = KEYBOARD_MAP[key];
          if (btn !== undefined) {
            newButtons |= btn;
          }
        });
        
        // Debug logging: Show key name, SNES button name, and hex value
        const buttonNames: Record<number, string> = {
          [SnesButton.B]: 'B',
          [SnesButton.Y]: 'Y',
          [SnesButton.SELECT]: 'SELECT',
          [SnesButton.START]: 'START',
          [SnesButton.UP]: 'UP',
          [SnesButton.DOWN]: 'DOWN',
          [SnesButton.LEFT]: 'LEFT',
          [SnesButton.RIGHT]: 'RIGHT',
          [SnesButton.A]: 'A',
          [SnesButton.X]: 'X',
          [SnesButton.L]: 'L',
          [SnesButton.R]: 'R',
        };
        const btnName = buttonNames[button] || 'UNKNOWN';
        console.log(`[useInput] Key DOWN: "${event.key}" → SNES ${btnName} (0x${button.toString(16)}), Combined state: 0x${newButtons.toString(16)}`);
        
        setKeyboardButtons(newButtons);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      if (button !== undefined) {
        event.preventDefault();
        
        // Remove key from pressed set
        pressedKeys.delete(event.key);
        
        // Recalculate button bitmask without the released key
        let newButtons = 0;
        pressedKeys.forEach(key => {
          const btn = KEYBOARD_MAP[key];
          if (btn !== undefined) {
            newButtons |= btn;
          }
        });
        
        console.log(`[useInput] Key UP: "${event.key}", Combined state: 0x${newButtons.toString(16)}`);
        setKeyboardButtons(newButtons);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  // Gamepad polling
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    let hasGamepad = false;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[port];

      if (gamepad) {
        hasGamepad = true;
        setIsGamepadConnected(true);
        
        let newButtons = 0;

        // Check buttons
        gamepad.buttons.forEach((button, index) => {
          if (button.pressed) {
            const snesButton = GAMEPAD_MAP[index];
            if (snesButton !== undefined) {
              newButtons |= snesButton;
            }
          }
        });

        // Check axes (for analog stick as D-pad)
        if (gamepad.axes.length >= 2) {
          const threshold = 0.5;
          if (gamepad.axes[0] < -threshold) newButtons |= SnesButton.LEFT;
          if (gamepad.axes[0] > threshold) newButtons |= SnesButton.RIGHT;
          if (gamepad.axes[1] < -threshold) newButtons |= SnesButton.UP;
          if (gamepad.axes[1] > threshold) newButtons |= SnesButton.DOWN;
        }

        setGamepadButtons(newButtons);
      } else {
        if (hasGamepad) {
          // Gamepad was disconnected, clear gamepad buttons
          hasGamepad = false;
          setIsGamepadConnected(false);
          setGamepadButtons(0);
        }
      }

      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log('Gamepad connected:', event.gamepad.id);
      setIsGamepadConnected(true);
    };

    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log('Gamepad disconnected:', event.gamepad.id);
      setIsGamepadConnected(false);
      setGamepadButtons(0);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    animationFrameId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, port]);

  return {
    buttons,
    isGamepadConnected,
  };
}
