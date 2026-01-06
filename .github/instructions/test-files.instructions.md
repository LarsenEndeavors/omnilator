---
applyTo: "**/*.test.ts?(x)"
---

## Test File Requirements

All test files in Omnilator must follow these standards using **Vitest** and **React Testing Library**.

### 1. Test File Structure

**File naming and location:**
- Test files: `ComponentName.test.tsx` or `moduleName.test.ts`
- Located in `src/test/` directory, mirroring source structure
- Import from source: `import { Component } from '../../components/Component'`

### 2. Test Organization

**Use describe blocks to organize tests:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should render with default props', () => {
      // Test implementation
    });
  });

  describe('user interactions', () => {
    it('should handle click events correctly', async () => {
      // Test implementation
    });
  });

  describe('error handling', () => {
    it('should display error message on failure', async () => {
      // Test implementation
    });
  });
});
```

### 3. Test Naming

**Test names must:**
- Start with "should"
- Describe the expected behavior
- Be specific and clear

```typescript
// Good
it('should display FPS counter when emulator is running', () => { ... });
it('should throw error when ROM file exceeds 8MB', () => { ... });

// Bad
it('FPS test', () => { ... });
it('works', () => { ... });
```

### 4. Test Structure (AAA Pattern)

**Every test should follow Arrange-Act-Assert:**
```typescript
it('should update state when button is clicked', async () => {
  // Arrange - Set up test data and render component
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} />);
  const button = screen.getByRole('button');

  // Act - Perform the action
  await userEvent.click(button);

  // Assert - Verify the result
  expect(handleClick).toHaveBeenCalledOnce();
});
```

### 5. Testing React Components

**Use React Testing Library queries:**
```typescript
// Preferred: Accessible queries (in order of priority)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByPlaceholderText(/enter email/i)
screen.getByText(/welcome/i)

// Avoid: Implementation details
screen.getByTestId('submit-button')
container.querySelector('.button-class')
```

**Test user interactions:**
```typescript
import { userEvent } from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  render(<Form onSubmit={handleSubmit} />);
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(handleSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

### 6. Async Testing

**Use waitFor for async operations:**
```typescript
it('should load ROM data asynchronously', async () => {
  render(<EmulatorScreen />);
  
  const fileInput = screen.getByLabelText(/load rom/i);
  await userEvent.upload(fileInput, mockROMFile);
  
  await waitFor(() => {
    expect(screen.getByText(/rom loaded/i)).toBeInTheDocument();
  });
});
```

### 7. Mocking

**Mock external dependencies:**
```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('../../core/SnesCore', () => ({
  SnesCore: vi.fn().mockImplementation(() => ({
    loadROM: vi.fn().mockResolvedValue(undefined),
    runFrame: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
  })),
}));

// Mock function
const mockLoadROM = vi.fn();

// Restore mocks
afterEach(() => {
  vi.clearAllMocks();
});
```

### 8. Testing Hooks

**Test custom hooks with renderHook:**
```typescript
import { renderHook, act } from '@testing-library/react';

describe('useInput', () => {
  it('should update button mask on key press', () => {
    const { result } = renderHook(() => useInput());
    
    act(() => {
      // Simulate key press
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    
    expect(result.current.buttons).toBe(SnesButton.UP);
  });
});
```

### 9. Error Testing

**Test error conditions:**
```typescript
it('should throw error for invalid ROM size', async () => {
  const largeFile = new File(['x'.repeat(9 * 1024 * 1024)], 'large.smc');
  
  await expect(async () => {
    await loadROM(largeFile);
  }).rejects.toThrow('ROM file too large');
});
```

### 10. Coverage Requirements

**Aim for high coverage:**
- Unit tests: 80%+ coverage
- Hook tests: 90%+ coverage
- Component tests: 70%+ coverage

**Run coverage:**
```bash
npm run test:coverage
```

### 11. Testing Best Practices

**Do:**
- Test behavior, not implementation
- Test edge cases and error conditions
- Keep tests simple and focused
- Use meaningful test data
- Clean up after tests

**Don't:**
- Test implementation details
- Test third-party libraries
- Write brittle tests tied to DOM structure
- Use actual timers (mock them)
- Skip cleanup

### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('feature category', () => {
    it('should describe expected behavior', async () => {
      // Arrange
      const props = { /* ... */ };
      render(<ComponentName {...props} />);

      // Act
      await userEvent.click(screen.getByRole('button'));

      // Assert
      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
    });
  });
});
```

### Common Testing Patterns

**Testing loading states:**
```typescript
it('should show loading spinner while loading ROM', async () => {
  render(<EmulatorScreen />);
  
  const loadButton = screen.getByRole('button', { name: /load/i });
  await userEvent.click(loadButton);
  
  expect(screen.getByRole('status')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
```

**Testing error states:**
```typescript
it('should display error message when ROM loading fails', async () => {
  const mockCore = {
    loadROM: vi.fn().mockRejectedValue(new Error('Failed to load')),
  };
  
  render(<EmulatorScreen core={mockCore} />);
  
  await userEvent.upload(fileInput, mockFile);
  
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
  });
});
```
