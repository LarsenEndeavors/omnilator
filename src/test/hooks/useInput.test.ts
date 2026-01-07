import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInput } from '../../hooks/useInput';
import { SnesButton } from '../../core/IEmulatorCore';

describe('useInput - Keyboard Mapping', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
  });

  describe('D-Pad Controls - Arrow Keys', () => {
    const testCases: Array<[string, number, string]> = [
      ['ArrowUp', SnesButton.UP, 'UP (0x10)'],
      ['ArrowDown', SnesButton.DOWN, 'DOWN (0x20)'],
      ['ArrowLeft', SnesButton.LEFT, 'LEFT (0x40)'],
      ['ArrowRight', SnesButton.RIGHT, 'RIGHT (0x80)'],
    ];

    testCases.forEach(([key, expectedButton, description]) => {
      it(`should map ${key} to SNES ${description}`, () => {
        const onInputChange = vi.fn();
        const { result } = renderHook(() => 
          useInput({ port: 0, enabled: true, onInputChange })
        );

        // Simulate key down
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        // Verify button state
        expect(result.current.buttons).toBe(expectedButton);
        expect(onInputChange).toHaveBeenCalledWith(expectedButton);

        // Simulate key up
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        });

        // Verify button released
        expect(result.current.buttons).toBe(0);
      });
    });
  });

  describe('D-Pad Controls - WASD Alternative', () => {
    const testCases: Array<[string, number, string]> = [
      ['w', SnesButton.UP, 'UP (0x10)'],
      ['s', SnesButton.DOWN, 'DOWN (0x20)'],
      ['a', SnesButton.LEFT, 'LEFT (0x40)'],
      ['d', SnesButton.RIGHT, 'RIGHT (0x80)'],
      ['W', SnesButton.UP, 'UP (0x10) uppercase'],
      ['S', SnesButton.DOWN, 'DOWN (0x20) uppercase'],
      ['A', SnesButton.LEFT, 'LEFT (0x40) uppercase'],
      ['D', SnesButton.RIGHT, 'RIGHT (0x80) uppercase'],
    ];

    testCases.forEach(([key, expectedButton, description]) => {
      it(`should map "${key}" to SNES ${description}`, () => {
        const onInputChange = vi.fn();
        const { result } = renderHook(() => 
          useInput({ port: 0, enabled: true, onInputChange })
        );

        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        expect(result.current.buttons).toBe(expectedButton);
        expect(onInputChange).toHaveBeenCalledWith(expectedButton);
      });
    });
  });

  describe('Face Buttons', () => {
    const testCases: Array<[string, number, string]> = [
      ['x', SnesButton.A, 'A button (0x100)'],
      ['X', SnesButton.A, 'A button (0x100) uppercase'],
      ['z', SnesButton.B, 'B button (0x1)'],
      ['Z', SnesButton.B, 'B button (0x1) uppercase'],
      ['v', SnesButton.X, 'X button (0x200)'],
      ['V', SnesButton.X, 'X button (0x200) uppercase'],
      ['c', SnesButton.Y, 'Y button (0x2)'],
      ['C', SnesButton.Y, 'Y button (0x2) uppercase'],
    ];

    testCases.forEach(([key, expectedButton, description]) => {
      it(`should map "${key}" key to SNES ${description}`, () => {
        const onInputChange = vi.fn();
        const { result } = renderHook(() => 
          useInput({ port: 0, enabled: true, onInputChange })
        );

        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        expect(result.current.buttons).toBe(expectedButton);
        expect(onInputChange).toHaveBeenCalledWith(expectedButton);
      });
    });

    it('should verify keyboard X maps to SNES A (not D-pad)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      // X key should be SNES A button (0x100), NOT RIGHT arrow (0x80)
      expect(result.current.buttons).toBe(SnesButton.A);
      expect(result.current.buttons).toBe(0x100);
      expect(result.current.buttons).not.toBe(SnesButton.RIGHT);
      expect(result.current.buttons).not.toBe(0x80);
    });

    it('should verify keyboard Z maps to SNES B (not down arrow)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      });

      // Z key should be SNES B button (0x1), NOT any D-pad direction
      expect(result.current.buttons).toBe(SnesButton.B);
      expect(result.current.buttons).toBe(0x1);
      expect(result.current.buttons).not.toBe(SnesButton.DOWN);
    });
  });

  describe('Shoulder Buttons', () => {
    const testCases: Array<[string, number, string]> = [
      ['q', SnesButton.L, 'L button (0x400)'],
      ['Q', SnesButton.L, 'L button (0x400) uppercase'],
      ['e', SnesButton.R, 'R button (0x800)'],
      ['E', SnesButton.R, 'R button (0x800) uppercase'],
    ];

    testCases.forEach(([key, expectedButton, description]) => {
      it(`should map "${key}" key to SNES ${description}`, () => {
        const onInputChange = vi.fn();
        const { result } = renderHook(() => 
          useInput({ port: 0, enabled: true, onInputChange })
        );

        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        expect(result.current.buttons).toBe(expectedButton);
        expect(onInputChange).toHaveBeenCalledWith(expectedButton);
      });
    });
  });

  describe('System Buttons', () => {
    it('should map Enter to START button (0x8)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(result.current.buttons).toBe(SnesButton.START);
      expect(result.current.buttons).toBe(0x8);
    });

    it('should map Shift to SELECT button (0x4)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      });

      expect(result.current.buttons).toBe(SnesButton.SELECT);
      expect(result.current.buttons).toBe(0x4);
    });

    it('should map ShiftLeft to SELECT button (0x4)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ShiftLeft' }));
      });

      expect(result.current.buttons).toBe(SnesButton.SELECT);
    });

    it('should map ShiftRight to SELECT button (0x4)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ShiftRight' }));
      });

      expect(result.current.buttons).toBe(SnesButton.SELECT);
    });
  });

  describe('Multiple Button Combinations', () => {
    it('should handle multiple buttons pressed simultaneously (A + B)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // B
      });

      const expected = SnesButton.A | SnesButton.B; // 0x100 | 0x1 = 0x101
      expect(result.current.buttons).toBe(expected);
      expect(result.current.buttons).toBe(0x101);
    });

    it('should handle D-pad + face button (UP + A)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); // UP
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
      });

      const expected = SnesButton.UP | SnesButton.A; // 0x10 | 0x100 = 0x110
      expect(result.current.buttons).toBe(expected);
    });

    it('should handle START + SELECT', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); // START
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); // SELECT
      });

      const expected = SnesButton.START | SnesButton.SELECT; // 0x8 | 0x4 = 0xC
      expect(result.current.buttons).toBe(expected);
      expect(result.current.buttons).toBe(0xC);
    });

    it('should handle 4-button combo (all face buttons)', () => {
      const { result } = renderHook(() => useInput());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // B
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' })); // X
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // Y
      });

      const expected = SnesButton.A | SnesButton.B | SnesButton.X | SnesButton.Y;
      // 0x100 | 0x1 | 0x200 | 0x2 = 0x303
      expect(result.current.buttons).toBe(expected);
      expect(result.current.buttons).toBe(0x303);
    });
  });

  describe('Button Release', () => {
    it('should release single button correctly', () => {
      const { result } = renderHook(() => useInput());

      // Press A
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(SnesButton.A);

      // Release A
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(0);
    });

    it('should release one button while keeping others pressed', () => {
      const { result } = renderHook(() => useInput());

      // Press A and B
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // A
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // B
      });
      expect(result.current.buttons).toBe(0x101); // A | B

      // Release A, keep B
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
      });
      expect(result.current.buttons).toBe(SnesButton.B);
      expect(result.current.buttons).toBe(0x1);
    });

    it('should release all buttons when all keys released', () => {
      const { result } = renderHook(() => useInput());

      // Press multiple buttons
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      });
      expect(result.current.buttons).not.toBe(0);

      // Release all
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      });
      expect(result.current.buttons).toBe(0);
    });
  });

  describe('Hook Options', () => {
    it('should initialize with zero buttons pressed', () => {
      const { result } = renderHook(() => useInput());
      expect(result.current.buttons).toBe(0);
      expect(result.current.isGamepadConnected).toBe(false);
    });

    it('should not process input when disabled', () => {
      const onInputChange = vi.fn();
      const { result } = renderHook(() => 
        useInput({ enabled: false, onInputChange })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      expect(result.current.buttons).toBe(0);
      // Note: onInputChange may be called once with 0 during initialization (keyboard | gamepad = 0 | 0)
      // But it should not be called with any non-zero button value
      const nonZeroCalls = onInputChange.mock.calls.filter(call => call[0] !== 0);
      expect(nonZeroCalls.length).toBe(0);
    });

    it('should call onInputChange callback when buttons change', () => {
      const onInputChange = vi.fn();
      renderHook(() => useInput({ onInputChange }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      });

      expect(onInputChange).toHaveBeenCalledWith(SnesButton.A);
      expect(onInputChange).toHaveBeenCalledWith(0x100);
    });
  });

  describe('README.md Compliance', () => {
    it('should match README control mappings exactly', () => {
      const readmeMapping: Array<[string, number, string]> = [
        // D-Pad
        ['ArrowUp', SnesButton.UP, 'D-pad UP'],
        ['ArrowDown', SnesButton.DOWN, 'D-pad DOWN'],
        ['ArrowLeft', SnesButton.LEFT, 'D-pad LEFT'],
        ['ArrowRight', SnesButton.RIGHT, 'D-pad RIGHT'],
        // Face buttons
        ['x', SnesButton.A, 'A button'],
        ['z', SnesButton.B, 'B button'],
        ['v', SnesButton.X, 'X button'],
        ['c', SnesButton.Y, 'Y button'],
        // Shoulders
        ['q', SnesButton.L, 'L button'],
        ['e', SnesButton.R, 'R button'],
        // System
        ['Enter', SnesButton.START, 'START'],
        ['Shift', SnesButton.SELECT, 'SELECT'],
      ];

      const { result } = renderHook(() => useInput());

      readmeMapping.forEach(([key, expectedButton, description]) => {
        act(() => {
          // Clear previous state
          window.dispatchEvent(new KeyboardEvent('keyup', { key }));
          
          // Test key
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        expect(result.current.buttons).toBe(expectedButton);
        
        // Clean up for next test
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        });
      });
    });
  });
});
