---
applyTo: "**/hooks/**/*.ts"
---

## React Hooks Requirements

When writing custom hooks in Omnilator, follow these React best practices.

### 1. Hook Naming

**ALL custom hooks MUST:**
- Start with `use` prefix: `useEmulator`, `useInput`, `useAudio`
- Use camelCase: `useEmulator`, not `UseEmulator`
- Be descriptive: `useEmulatorLifecycle` better than `useEmul`

### 2. Hook Structure

**Every hook must:**
- Return an object or tuple (array)
- Have a clear, typed return value
- Be documented with JSDoc

```typescript
/**
 * Custom hook for managing emulator lifecycle and rendering loop
 * 
 * @param options - Configuration options for the emulator
 * @returns Emulator state and control functions
 */
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  // Hook implementation
  
  return {
    isRunning,
    fps,
    canvasRef,
    start,
    stop,
    toggle,
  };
}
```

### 3. Type Definitions

**Define types for inputs and outputs:**

```typescript
interface UseEmulatorOptions {
  core: IEmulatorCore;
  targetFPS?: number;
  onError?: (error: Error) => void;
}

interface UseEmulatorResult {
  isRunning: boolean;
  fps: number;
  canvasRef: RefObject<HTMLCanvasElement>;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useEmulator(
  options: UseEmulatorOptions
): UseEmulatorResult {
  // Implementation
}
```

### 4. State Management

**Use appropriate React hooks:**

```typescript
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFPS] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // More implementation
}
```

### 5. Cleanup

**ALWAYS cleanup side effects:**

```typescript
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  const { core, targetFPS = 60 } = options;

  useEffect(() => {
    // Setup
    const interval = setInterval(() => {
      updateFPS();
    }, 1000);

    // REQUIRED: Cleanup function
    return () => {
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      core.cleanup();
    };
  }, [core]);

  // Rest of implementation
}
```

### 6. Dependencies

**Specify dependencies correctly:**

```typescript
// Good: Correct dependencies
useEffect(() => {
  if (isRunning) {
    startLoop();
  }
  return () => stopLoop();
}, [isRunning, startLoop, stopLoop]); // Include all used values

// Bad: Missing dependencies (ESLint will warn)
useEffect(() => {
  if (isRunning) {
    startLoop();
  }
  return () => stopLoop();
}, []); // isRunning, startLoop, stopLoop not listed!
```

### 7. Callback Stability

**Use useCallback for stable function references:**

```typescript
export function useInput(): UseInputResult {
  const [buttons, setButtons] = useState(0);

  // Stable callback reference
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const buttonMask = KEYBOARD_MAP[event.key];
    if (buttonMask !== undefined) {
      setButtons(prev => prev | buttonMask);
    }
  }, []); // No dependencies = stable reference

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { buttons };
}
```

### 8. Memoization

**Use useMemo for expensive calculations:**

```typescript
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  const [frameCount, setFrameCount] = useState(0);
  const [startTime] = useState(Date.now());

  // Expensive calculation - memoize it
  const averageFPS = useMemo(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    return elapsed > 0 ? frameCount / elapsed : 0;
  }, [frameCount, startTime]);

  return { averageFPS, /* ... */ };
}
```

### 9. Error Handling

**Handle errors gracefully:**

```typescript
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  const { core, onError } = options;
  const [error, setError] = useState<Error | null>(null);

  const runFrame = useCallback(async () => {
    try {
      await core.runFrame();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      // Stop emulation on error
      setIsRunning(false);
    }
  }, [core, onError]);

  return { error, /* ... */ };
}
```

### 10. Testing Hooks

**Test hooks with renderHook:**

```typescript
// src/test/hooks/useInput.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInput } from '../../hooks/useInput';

describe('useInput', () => {
  it('should initialize with no buttons pressed', () => {
    const { result } = renderHook(() => useInput());
    expect(result.current.buttons).toBe(0);
  });

  it('should update button mask on key down', () => {
    const { result } = renderHook(() => useInput());
    
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    
    expect(result.current.buttons).toBe(SnesButton.UP);
  });

  it('should clear button mask on key up', () => {
    const { result } = renderHook(() => useInput());
    
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
    });
    
    expect(result.current.buttons).toBe(0);
  });
});
```

### Hook Template

```typescript
/**
 * Brief description of what this hook does
 * 
 * @param options - Configuration options
 * @returns Hook state and functions
 * 
 * @example
 * ```tsx
 * const { value, setValue } = useMyHook({ initialValue: 0 });
 * ```
 */
export function useMyHook(options: UseMyHookOptions): UseMyHookResult {
  // Destructure options with defaults
  const { initialValue = 0, onError } = options;

  // State
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<Error | null>(null);

  // Refs for mutable values
  const intervalRef = useRef<number | null>(null);

  // Callbacks (use useCallback for stability)
  const increment = useCallback(() => {
    setValue(prev => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setValue(prev => prev - 1);
  }, []);

  // Effects with cleanup
  useEffect(() => {
    // Setup
    intervalRef.current = window.setInterval(() => {
      increment();
    }, 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [increment]);

  // Memoized values
  const isPositive = useMemo(() => value > 0, [value]);

  return {
    value,
    error,
    increment,
    decrement,
    isPositive,
  };
}

// Type definitions
interface UseMyHookOptions {
  initialValue?: number;
  onError?: (error: Error) => void;
}

interface UseMyHookResult {
  value: number;
  error: Error | null;
  increment: () => void;
  decrement: () => void;
  isPositive: boolean;
}
```

### Common Patterns

#### Animation Loop Hook

```typescript
export function useAnimationLoop(
  callback: () => void,
  enabled: boolean
): void {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);

  // Keep callback ref current
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const loop = () => {
      callbackRef.current();
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled]);
}
```

#### Event Listener Hook

```typescript
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement = window
): void {
  const handlerRef = useRef(handler);

  // Keep handler ref current
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[K]);
    };

    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}
```

### Best Practices

**Do:**
- Start hook names with `use`
- Define clear input/output types
- Use useCallback for stable callbacks
- Use useMemo for expensive calculations
- Always cleanup side effects
- Test hooks thoroughly
- Document with JSDoc and examples

**Don't:**
- Call hooks conditionally
- Call hooks in loops
- Call hooks in nested functions
- Forget cleanup functions
- Mutate state directly
- Create infinite loops (check dependencies)
- Skip dependency arrays
