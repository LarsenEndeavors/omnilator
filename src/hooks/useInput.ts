import { useEffect, useState, useRef } from 'react';
import { SnesButton } from '../core/IEmulatorCore';

/**
 * COMPLETELY REDESIGNED Keyboard to SNES Button Mapping
 * 
 * This mapping is EXPLICITLY designed to match the README.md specification:
 * - D-Pad: Arrow Keys or WASD
 * - A Button: X key
 * - B Button: Z key
 * - X Button: V key
 * - Y Button: C key
 * - L Button: Q key
 * - R Button: E key
 * - Start: Enter key
 * - Select: Shift key
 * 
 * Each key maps to EXACTLY ONE SNES button using LibRetro bit positions.
 * NO inversions, NO bit manipulation, just direct 1:1 mapping.
 */
const KEYBOARD_MAP: Readonly<Record<string, number>> = {
  // ============================================
  // D-PAD MAPPING (Arrow Keys)
  // ============================================
  'ArrowUp': SnesButton.UP,       // 0x10 (bit 4)
  'ArrowDown': SnesButton.DOWN,   // 0x20 (bit 5)
  'ArrowLeft': SnesButton.LEFT,   // 0x40 (bit 6)
  'ArrowRight': SnesButton.RIGHT, // 0x80 (bit 7)
  
  // ============================================
  // D-PAD MAPPING (WASD Alternative)
  // ============================================
  'w': SnesButton.UP,    // 0x10 (bit 4)
  's': SnesButton.DOWN,  // 0x20 (bit 5)
  'a': SnesButton.LEFT,  // 0x40 (bit 6)
  'd': SnesButton.RIGHT, // 0x80 (bit 7)
  
  // ============================================
  // ACTION BUTTONS (per README.md)
  // ============================================
  'x': SnesButton.A, // X key → A button (0x100, bit 8)
  'z': SnesButton.B, // Z key → B button (0x1, bit 0)
  'v': SnesButton.X, // V key → X button (0x200, bit 9)
  'c': SnesButton.Y, // C key → Y button (0x2, bit 1)
  
  // ============================================
  // SHOULDER BUTTONS
  // ============================================
  'q': SnesButton.L, // Q key → L button (0x400, bit 10)
  'e': SnesButton.R, // E key → R button (0x800, bit 11)
  
  // ============================================
  // START / SELECT
  // ============================================
  'Enter': SnesButton.START,   // 0x8 (bit 3)
  'Shift': SnesButton.SELECT,  // 0x4 (bit 2)
} as const;

/**
 * Gamepad button mapping to SNES buttons (Standard Gamepad API)
 * Based on the W3C standard gamepad button layout
 */
const GAMEPAD_MAP: Readonly<Record<number, number>> = {
  0: SnesButton.B,      // Gamepad A → SNES B
  1: SnesButton.A,      // Gamepad B → SNES A
  2: SnesButton.Y,      // Gamepad X → SNES Y
  3: SnesButton.X,      // Gamepad Y → SNES X
  4: SnesButton.L,      // Left shoulder
  5: SnesButton.R,      // Right shoulder
  8: SnesButton.SELECT, // Select/Back button
  9: SnesButton.START,  // Start button
  12: SnesButton.UP,    // D-pad up
  13: SnesButton.DOWN,  // D-pad down
  14: SnesButton.LEFT,  // D-pad left
  15: SnesButton.RIGHT, // D-pad right
} as const;

interface UseInputOptions {
  port?: number;
  enabled?: boolean;
  onInputChange?: (buttons: number) => void;
}

interface UseInputResult {
  buttons: number;
  isGamepadConnected: boolean;
}

/**
 * COMPLETELY REDESIGNED Custom Hook for Handling Keyboard and Gamepad Input
 * 
 * This hook manages SNES controller input from keyboard and gamepad sources.
 * It combines inputs from both sources and provides a single button state bitmask.
 * 
 * Key features:
 * - Explicit keyboard mapping matching README.md specification
 * - Proper cleanup of event listeners
 * - Respects enabled flag
 * - Only calls onInputChange when buttons actually change
 * - Tracks pressed keys properly to handle simultaneous inputs
 */
export function useInput({
  port = 0,
  enabled = true,
  onInputChange,
}: UseInputOptions = {}): UseInputResult {
  const [buttons, setButtons] = useState(0);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  
  // Track keyboard state separately
  const [keyboardButtons, setKeyboardButtons] = useState(0);
  const [gamepadButtons, setGamepadButtons] = useState(0);
  
  // Use ref to track the previous combined button state
  // This prevents duplicate onInputChange calls
  const previousButtonsRef = useRef(0);

  // Combine keyboard and gamepad inputs (OR operation)
  // This allows both keyboard and gamepad to be used simultaneously
  useEffect(() => {
    const combined = keyboardButtons | gamepadButtons;
    setButtons(combined);
    
    // Only call onInputChange if the combined state actually changed
    // AND if we have a callback
    if (combined !== previousButtonsRef.current && onInputChange) {
      onInputChange(combined);
      previousButtonsRef.current = combined;
    }
  }, [keyboardButtons, gamepadButtons, onInputChange]);

  // ============================================
  // KEYBOARD INPUT HANDLING
  // ============================================
  useEffect(() => {
    if (!enabled) {
      // When disabled, clear keyboard state
      setKeyboardButtons(0);
      return;
    }

    // Track which keys are currently pressed
    // Using a Set ensures each key is only tracked once
    const pressedKeys = new Set<string>();

    /**
     * Calculate the button bitmask from currently pressed keys
     */
    const calculateButtonMask = (): number => {
      let mask = 0;
      pressedKeys.forEach(key => {
        const button = KEYBOARD_MAP[key];
        if (button !== undefined) {
          mask |= button;
        }
      });
      return mask;
    };

    /**
     * Handle keydown events
     * Only mapped keys trigger state changes and preventDefault
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      
      // Only handle mapped keys
      if (button === undefined) {
        return; // Ignore unmapped keys
      }
      
      // Prevent default browser behavior for game controls
      event.preventDefault();
      
      // Add key to pressed set (Set automatically handles duplicates)
      pressedKeys.add(event.key);
      
      // Recalculate button mask
      const newButtons = calculateButtonMask();
      setKeyboardButtons(newButtons);
    };

    /**
     * Handle keyup events
     */
    const handleKeyUp = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      
      // Only handle mapped keys
      if (button === undefined) {
        return; // Ignore unmapped keys
      }
      
      event.preventDefault();
      
      // Remove key from pressed set
      pressedKeys.delete(event.key);
      
      // Recalculate button mask
      const newButtons = calculateButtonMask();
      setKeyboardButtons(newButtons);
    };

    // Register event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup: remove event listeners and clear state
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedKeys.clear();
    };
  }, [enabled]);

  // ============================================
  // GAMEPAD INPUT HANDLING
  // ============================================
  useEffect(() => {
    if (!enabled) {
      // When disabled, clear gamepad state
      setGamepadButtons(0);
      setIsGamepadConnected(false);
      return;
    }

    let animationFrameId: number;
    let currentlyConnected = false;

    /**
     * Poll gamepad state at 60Hz using requestAnimationFrame
     * This matches the typical gamepad polling rate
     */
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[port];

      if (gamepad) {
        // Gamepad is connected
        if (!currentlyConnected) {
          currentlyConnected = true;
          setIsGamepadConnected(true);
        }
        
        let newButtons = 0;

        // Check digital buttons
        gamepad.buttons.forEach((button, index) => {
          if (button.pressed) {
            const snesButton = GAMEPAD_MAP[index];
            if (snesButton !== undefined) {
              newButtons |= snesButton;
            }
          }
        });

        // Check analog stick axes (map to D-pad)
        if (gamepad.axes.length >= 2) {
          const threshold = 0.5;
          const xAxis = gamepad.axes[0];
          const yAxis = gamepad.axes[1];
          
          if (xAxis < -threshold) newButtons |= SnesButton.LEFT;
          if (xAxis > threshold) newButtons |= SnesButton.RIGHT;
          if (yAxis < -threshold) newButtons |= SnesButton.UP;
          if (yAxis > threshold) newButtons |= SnesButton.DOWN;
        }

        setGamepadButtons(newButtons);
      } else {
        // Gamepad disconnected
        if (currentlyConnected) {
          currentlyConnected = false;
          setIsGamepadConnected(false);
          setGamepadButtons(0);
        }
      }

      // Continue polling
      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    /**
     * Handle gamepad connection events
     */
    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log('[useInput] Gamepad connected:', event.gamepad.id);
      setIsGamepadConnected(true);
    };

    /**
     * Handle gamepad disconnection events
     */
    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log('[useInput] Gamepad disconnected:', event.gamepad.id);
      setIsGamepadConnected(false);
      setGamepadButtons(0);
    };

    // Register gamepad event listeners
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Start polling
    animationFrameId = requestAnimationFrame(pollGamepad);

    // Cleanup
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
