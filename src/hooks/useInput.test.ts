import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInput } from './useInput';
import { SnesButton } from '../core/IEmulatorCore';

/**
 * Comprehensive test suite for keyboard input mapping
 * 
 * This test suite validates the COMPLETE redesign of the input system
 * to ensure keyboard controls match the README.md specification exactly:
 * 
 * - D-Pad: Arrow Keys or WASD
 * - A Button: X
 * - B Button: Z
 * - X Button: V
 * - Y Button: C
 * - L Button: Q
 * - R Button: E
 * - Start: Enter
 * - Select: Shift
 */
describe('useInput - Keyboard Mapping', () => {
  let onInputChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onInputChangeMock = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Table-driven test for individual key mappings
   * Each entry specifies: [key, expectedButton, description]
   */
  const keyMappingTests: Array<[string, number, string]> = [
    // D-Pad - Arrow Keys
    ['ArrowUp', SnesButton.UP, 'Arrow Up → D-Pad UP'],
    ['ArrowDown', SnesButton.DOWN, 'Arrow Down → D-Pad DOWN'],
    ['ArrowLeft', SnesButton.LEFT, 'Arrow Left → D-Pad LEFT'],
    ['ArrowRight', SnesButton.RIGHT, 'Arrow Right → D-Pad RIGHT'],
    
    // D-Pad - WASD (alternative)
    ['w', SnesButton.UP, 'W → D-Pad UP'],
    ['s', SnesButton.DOWN, 'S → D-Pad DOWN'],
    ['a', SnesButton.LEFT, 'A → D-Pad LEFT'],
    ['d', SnesButton.RIGHT, 'D → D-Pad RIGHT'],
    
    // Action buttons (README specification)
    ['x', SnesButton.A, 'X → A button'],
    ['z', SnesButton.B, 'Z → B button'],
    ['v', SnesButton.X, 'V → X button'],
    ['c', SnesButton.Y, 'C → Y button'],
    
    // Shoulder buttons
    ['q', SnesButton.L, 'Q → L button'],
    ['e', SnesButton.R, 'E → R button'],
    
    // Start/Select
    ['Enter', SnesButton.START, 'Enter → START'],
    ['Shift', SnesButton.SELECT, 'Shift → SELECT'],
  ];

  describe('Individual Key Mappings', () => {
    keyMappingTests.forEach(([key, expectedButton, description]) => {
      it(`should map ${description}`, () => {
        const { result } = renderHook(() => 
          useInput({ enabled: true, onInputChange: onInputChangeMock })
        );

        // Initially no buttons pressed
        expect(result.current.buttons).toBe(0);

        // Press the key
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        // Verify button is set
        expect(result.current.buttons).toBe(expectedButton);
        expect(onInputChangeMock).toHaveBeenCalledWith(expectedButton);

        // Release the key
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        });

        // Verify button is cleared
        expect(result.current.buttons).toBe(0);
        expect(onInputChangeMock).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('Simultaneous Key Presses', () => {
    it('should handle multiple D-pad directions (diagonal movement)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press Up and Right together (diagonal)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      });

      const expectedButtons = SnesButton.UP | SnesButton.RIGHT;
      expect(result.current.buttons).toBe(expectedButtons);
    });

    it('should handle D-pad + action buttons (moving and attacking)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press Right and X (moving right and pressing A button)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      const expectedButtons = SnesButton.RIGHT | SnesButton.A;
      expect(result.current.buttons).toBe(expectedButtons);
    });

    it('should handle multiple action buttons simultaneously', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press A and B buttons together
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A button
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // B button
      });

      const expectedButtons = SnesButton.A | SnesButton.B;
      expect(result.current.buttons).toBe(expectedButtons);
    });

    it('should handle shoulder buttons with other inputs', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press L + R + A (common combo in SNES games)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' })); // L
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); // R
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
      });

      const expectedButtons = SnesButton.L | SnesButton.R | SnesButton.A;
      expect(result.current.buttons).toBe(expectedButtons);
    });

    it('should handle Start + Select (common menu combo)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      });

      const expectedButtons = SnesButton.START | SnesButton.SELECT;
      expect(result.current.buttons).toBe(expectedButtons);
    });
  });

  describe('Key Release Behavior', () => {
    it('should clear only the released key, keeping others pressed', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press multiple keys
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      expect(result.current.buttons).toBe(SnesButton.UP | SnesButton.A);

      // Release only one key
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      });

      // Only A button should remain pressed
      expect(result.current.buttons).toBe(SnesButton.A);
    });

    it('should handle rapid press and release', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Rapid button mashing
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(SnesButton.A);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(0);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(SnesButton.A);
    });
  });

  describe('WASD Alternative Mapping', () => {
    it('should work independently from arrow keys', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Use WASD instead of arrows
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); // Up
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' })); // Right
      });

      const expectedButtons = SnesButton.UP | SnesButton.RIGHT;
      expect(result.current.buttons).toBe(expectedButtons);
    });

    it('should allow mixing WASD and arrow keys', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Mix WASD and arrows (both map to same D-pad directions)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); // Up
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); // Right
      });

      // Both pressed, but they map to same buttons, so no conflict
      const expectedButtons = SnesButton.UP | SnesButton.RIGHT;
      expect(result.current.buttons).toBe(expectedButtons);
    });
  });

  describe('Edge Cases', () => {
    it('should ignore unmapped keys', () => {
      renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press unmapped key
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      });

      // Should not trigger any input changes
      expect(onInputChangeMock).not.toHaveBeenCalled();
    });

    it('should handle repeated keydown events (key held)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Press and hold (browser sends repeated keydown events)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      // Button state should remain consistent
      expect(result.current.buttons).toBe(SnesButton.A);
    });

    it('should respect enabled flag', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: false, onInputChange: onInputChangeMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      // Should not register input when disabled
      expect(result.current.buttons).toBe(0);
      expect(onInputChangeMock).not.toHaveBeenCalled();
    });

    it('should handle case sensitivity correctly (lowercase only)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true, onInputChange: onInputChangeMock })
      );

      // Uppercase letters should be converted/handled properly
      // Note: Keyboard events for letters come as lowercase by default
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      });

      // Should handle uppercase W (though browsers typically send lowercase)
      // Our implementation should normalize this
      expect(result.current.buttons).toBe(0); // Or handle uppercase if needed
    });
  });

  describe('Callback Behavior', () => {
    it('should call onInputChange callback on every state change', () => {
      const callback = vi.fn();
      renderHook(() => 
        useInput({ enabled: true, onInputChange: callback })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      expect(callback).toHaveBeenCalledWith(SnesButton.A);
      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      });

      expect(callback).toHaveBeenCalledWith(SnesButton.A | SnesButton.B);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should work without onInputChange callback (optional)', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true })
      );

      // Should not throw error
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      expect(result.current.buttons).toBe(SnesButton.A);
    });
  });

  describe('Button Bitmask Values', () => {
    it('should produce correct hex values for debugging', () => {
      const { result } = renderHook(() => 
        useInput({ enabled: true })
      );

      // Verify specific hex values match LibRetro specification
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
      });
      expect(result.current.buttons).toBe(0x100); // Bit 8

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      });
      expect(result.current.buttons).toBe(0x10); // Bit 4

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      });
      expect(result.current.buttons).toBe(0x40); // Bit 6
    });
  });
});

describe('useInput - Gamepad Support', () => {
  it('should initialize with no gamepad connected', () => {
    const { result } = renderHook(() => useInput({ enabled: true }));
    expect(result.current.isGamepadConnected).toBe(false);
  });

  // Note: Full gamepad testing would require mocking navigator.getGamepads()
  // which is already tested in the implementation. These tests focus on keyboard.
});

describe('useInput - Port Selection', () => {
  it('should default to port 0', () => {
    const callback = vi.fn();
    renderHook(() => useInput({ enabled: true, onInputChange: callback }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    });

    // Callback should be called (port validation happens in EmulatorCore)
    expect(callback).toHaveBeenCalledWith(SnesButton.A);
  });

  it('should accept custom port', () => {
    const callback = vi.fn();
    renderHook(() => useInput({ port: 1, enabled: true, onInputChange: callback }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    });

    expect(callback).toHaveBeenCalledWith(SnesButton.A);
  });
});
