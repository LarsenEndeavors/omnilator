import { useEffect, useState, useCallback } from 'react';
import { SnesButton } from '../core/IEmulatorCore';

/**
 * Keyboard mapping to SNES buttons
 */
const KEYBOARD_MAP: Record<string, number> = {
  // Arrow keys for D-pad
  ArrowUp: SnesButton.UP,
  ArrowDown: SnesButton.DOWN,
  ArrowLeft: SnesButton.LEFT,
  ArrowRight: SnesButton.RIGHT,
  
  // WASD for D-pad (alternative)
  w: SnesButton.UP,
  s: SnesButton.DOWN,
  a: SnesButton.LEFT,
  d: SnesButton.RIGHT,
  
  // Action buttons
  z: SnesButton.B,
  x: SnesButton.A,
  c: SnesButton.Y,
  v: SnesButton.X,
  
  // Shoulder buttons
  q: SnesButton.L,
  e: SnesButton.R,
  
  // Start/Select
  Enter: SnesButton.START,
  Shift: SnesButton.SELECT,
};

/**
 * Gamepad button mapping to SNES buttons
 */
const GAMEPAD_MAP: Record<number, number> = {
  0: SnesButton.B,     // A button
  1: SnesButton.A,     // B button
  2: SnesButton.Y,     // X button
  3: SnesButton.X,     // Y button
  4: SnesButton.L,     // Left shoulder
  5: SnesButton.R,     // Right shoulder
  8: SnesButton.SELECT, // Select
  9: SnesButton.START,  // Start
  12: SnesButton.UP,    // D-pad up
  13: SnesButton.DOWN,  // D-pad down
  14: SnesButton.LEFT,  // D-pad left
  15: SnesButton.RIGHT, // D-pad right
};

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
 * Custom hook for handling keyboard and gamepad input
 */
export function useInput({
  port = 0,
  enabled = true,
  onInputChange,
}: UseInputOptions = {}): UseInputResult {
  const [buttons, setButtons] = useState(0);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  const updateButtons = useCallback((newButtons: number) => {
    setButtons(newButtons);
    onInputChange?.(newButtons);
  }, [onInputChange]);

  // Keyboard event handlers
  useEffect(() => {
    if (!enabled) return;

    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      if (button !== undefined) {
        event.preventDefault();
        pressedKeys.add(event.key);
        
        // Calculate button bitmask
        let newButtons = 0;
        pressedKeys.forEach(key => {
          const btn = KEYBOARD_MAP[key];
          if (btn !== undefined) {
            newButtons |= btn;
          }
        });
        
        updateButtons(newButtons);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const button = KEYBOARD_MAP[event.key];
      if (button !== undefined) {
        event.preventDefault();
        pressedKeys.delete(event.key);
        
        // Calculate button bitmask
        let newButtons = 0;
        pressedKeys.forEach(key => {
          const btn = KEYBOARD_MAP[key];
          if (btn !== undefined) {
            newButtons |= btn;
          }
        });
        
        updateButtons(newButtons);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, updateButtons]);

  // Gamepad polling
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[port];

      if (gamepad) {
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

        updateButtons(newButtons);
      } else {
        setIsGamepadConnected(false);
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
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    animationFrameId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, port, updateButtons]);

  return {
    buttons,
    isGamepadConnected,
  };
}
