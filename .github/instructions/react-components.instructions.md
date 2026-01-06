---
applyTo: "**/components/**/*.tsx"
---

## React Component Requirements

When writing React components in Omnilator, follow these guidelines:

### 1. Component Structure

**Every component must have:**
- TypeScript interface for props (even if empty)
- Functional component (no class components)
- Proper TypeScript types (no `any`)

```typescript
interface EmulatorScreenProps {
  initialROM?: Uint8Array;
  onError?: (error: Error) => void;
}

export function EmulatorScreen({ initialROM, onError }: EmulatorScreenProps): JSX.Element {
  // Component implementation
}
```

### 2. Hooks Usage

**Use hooks for state and lifecycle:**
- `useState` for component state
- `useEffect` for side effects (cleanup required!)
- `useRef` for DOM references and mutable values
- `useCallback` for memoized callbacks
- `useMemo` for expensive computations

**Custom hooks over inline logic:**
- Extract reusable logic into custom hooks
- Hooks must follow `use*` naming convention
- Hooks must be in `src/hooks/` directory

### 3. Props Interface

**Props must be:**
- Defined as TypeScript interface
- Named `ComponentNameProps`
- Documented with JSDoc if non-obvious

```typescript
/**
 * Props for the EmulatorScreen component
 */
interface EmulatorScreenProps {
  /** Optional ROM data to load on mount */
  initialROM?: Uint8Array;
  /** Callback for error handling */
  onError?: (error: Error) => void;
}
```

### 4. State Management

**Follow immutability principles:**
```typescript
// Good: Create new Map instance
setSaveStates(prev => new Map(prev).set(slot, state));

// Bad: Mutate existing Map
setSaveStates(prev => {
  prev.set(slot, state);
  return prev;
});
```

### 5. Event Handlers

**Event handlers must:**
- Be named with `handle` prefix: `handleClick`, `handleChange`
- Use `useCallback` if passed as props
- Have proper TypeScript event types

```typescript
const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    loadROMFile(file);
  }
}, [loadROMFile]);
```

### 6. Cleanup

**Always cleanup side effects:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    updateFPS();
  }, 1000);

  // Cleanup function
  return () => {
    clearInterval(interval);
  };
}, [updateFPS]);
```

### 7. Component Files

**File organization:**
- One component per file: `ComponentName.tsx`
- Co-located CSS: `ComponentName.css`
- Tests: `ComponentName.test.tsx` in `src/test/components/`
- Export component directly (no default exports for components)

### 8. JSX Best Practices

**Write clear, accessible JSX:**
- Use semantic HTML elements
- Add ARIA labels where needed
- Keep JSX simple (extract complex logic)
- Use fragments over empty divs

```typescript
// Good
return (
  <>
    <canvas ref={canvasRef} aria-label="Game display" />
    <Controls onPlay={handlePlay} onPause={handlePause} />
  </>
);

// Bad
return (
  <div>
    <canvas ref={canvasRef} />
    {playing ? <button onClick={() => setPlaying(false)}>Pause</button> 
             : <button onClick={() => setPlaying(true)}>Play</button>}
  </div>
);
```

### 9. Performance

**Optimize when needed:**
- Use `React.memo` for expensive components
- Use `useCallback` for callbacks passed as props
- Use `useMemo` for expensive calculations
- Avoid inline object/array creation in render

### 10. Testing

**Every component needs tests:**
- Test user interactions
- Test error states
- Test accessibility
- Mock external dependencies

See `src/test/components/` for examples.

### Component Template

```typescript
import { useState, useEffect, useCallback } from 'react';
import './ComponentName.css';

/**
 * Brief description of what this component does
 */
interface ComponentNameProps {
  /** Description of prop */
  propName: string;
}

/**
 * ComponentName - One line description
 * 
 * Longer description if needed explaining purpose and usage.
 */
export function ComponentName({ propName }: ComponentNameProps): JSX.Element {
  const [state, setState] = useState<Type>(initialValue);

  const handleEvent = useCallback(() => {
    // Handle event
  }, []);

  useEffect(() => {
    // Side effect
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  );
}
```
