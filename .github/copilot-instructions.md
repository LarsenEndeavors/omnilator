# Omnilator - GitHub Copilot Instructions

## Project Overview

Omnilator is a web-based SNES (Super Nintendo Entertainment System) emulator built with React, TypeScript, and Vite. The project enables playing classic SNES games directly in modern web browsers with full emulation support.

### MVP: Multi-Environment Gaming

The **Minimum Viable Product (MVP)** demonstrates SNES games being loadable and playable across multiple environments:

- **Cross-Device Connectivity**: A PC and a phone can both load the site simultaneously
- **Distributed Gaming**: One device (e.g., phone) can host the game session
- **Remote Playback**: Another device (e.g., PC) can play the hosted game
- **Seamless Experience**: Games run in the browser with no native installation required

This multi-environment architecture enables collaborative gaming, remote play, and flexible device usage patterns.

## Reference Materials

This project follows software engineering best practices from these foundational texts, available in `docs/Reference_Documentation/`:

- **"Tidy First?"** by Kent Beck - Our primary guide for making incremental, safe code improvements
- **"Clean Code"** by Robert Martin - Standards for readable, maintainable code
- **"Code Complete"** by Steve McConnell - Comprehensive construction practices
- **"Exploring Requirements"** - Quality-first requirements analysis

### Tidy First Principles (Core to Our SDLC)

We follow the **tidy-first** approach from Kent Beck:

1. **Make the change easy** (this may be hard)
2. **Then make the easy change**

**In Practice:**
- Before adding a feature, first refactor to make the feature easy to add
- Small, incremental changes over large rewrites
- Each commit should leave the code better than you found it
- Separate tidying commits from behavioral changes
- Use guard clauses to reduce nesting
- Extract long methods into smaller, named functions
- Move related code closer together

**Example Workflow:**
```
1. Tidy: Extract complex logic into well-named helper function (separate commit)
2. Tidy: Reorganize imports and reduce coupling (separate commit)  
3. Feature: Add new functionality using the tidied code (separate commit)
4. Test: Verify behavior hasn't changed
```

This approach reduces risk, improves code quality, and makes features easier to implement.

## The Holy Texts: Core Architectural Principles

These fundamental principles guide all development decisions in Omnilator. They are the "holy texts" that must be understood and followed:

### 1. Interface-First Design

**Principle**: All major systems start with a well-defined TypeScript interface before implementation.

**Example**: `IEmulatorCore` defines the contract for emulator implementations:

```typescript
interface IEmulatorCore {
  loadROM(romData: Uint8Array): Promise<void>;
  runFrame(): Promise<void>;
  getBuffer(): ImageData;
  getAudioSamples(): Float32Array;
  setInput(port: number, buttons: number): void;
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;
  reset(): void;
  cleanup(): void;
}
```

**Why**: Interface-first design ensures:
- Clear contracts between components
- Easy testing with mocks
- Future extensibility (multiple emulator cores)
- Self-documenting code structure

### 2. Separation of Concerns

**Components are organized by responsibility**:

- `core/` - Emulator logic (platform-agnostic)
- `components/` - React UI components
- `hooks/` - React custom hooks for lifecycle management
- `audio/` - Audio system (WebAudio API)
- `data/` - Game metadata and configuration

**Why**: Each directory has a single, clear purpose. Missing features are obvious from the directory structure itself.

### 3. Browser-First APIs

**Principle**: Leverage native browser APIs for optimal performance:

- **Canvas API** for hardware-accelerated rendering
- **WebAudio API** with AudioWorklet for low-latency audio
- **Gamepad API** for controller support
- **requestAnimationFrame** for smooth 60 FPS rendering

**Why**: Native APIs provide better performance than polyfills and ensure broad browser compatibility.

### 4. Immutable State Management

**Principle**: Use React's state management patterns with immutability:

```typescript
const [saveStates, setSaveStates] = useState<Map<number, Uint8Array>>(new Map());

const handleSaveState = (slot: number) => {
  const state = core.saveState();
  setSaveStates(prev => new Map(prev).set(slot, state)); // New Map instance
};
```

**Why**: Immutability prevents bugs and makes state changes predictable.

### 5. Self-Documenting Code

**Principle**: Code structure makes missing features obvious:

- If a method is in the interface but has a mock implementation, it's incomplete
- If a hook exists but isn't used, it's waiting for integration
- If a component has TODOs in comments, those are explicit next steps

**Example**: `SnesCore` uses mock implementations clearly labeled:

```typescript
// Internal WASM module mock
this.wasmModule = {
  loadROM: (data: Uint8Array) => {
    console.log('Mock: ROM loaded', data.length, 'bytes');
    return true; // WASM module returns boolean
  },
  // ... other methods
};

// IEmulatorCore implementation wraps it
async loadROM(romData: Uint8Array): Promise<void> {
  if (!this.wasmModule || !this.wasmModule.loadROM(romData)) {
    throw new Error('Failed to load ROM');
  }
}
```

## Project Architecture

### Core Components

#### 1. IEmulatorCore Interface (`core/IEmulatorCore.ts`)

The foundational interface defining emulator operations. All emulator implementations must satisfy this interface.

**Key Methods**:
- `loadROM()` - Load a ROM file
- `runFrame()` - Execute one frame of emulation (~16.67ms for 60 FPS)
- `getBuffer()` - Retrieve current video frame as ImageData
- `getAudioSamples()` - Retrieve audio samples for playback
- `setInput()` - Update controller state
- `saveState()` / `loadState()` - Save/restore emulator state

**Button Bitmasks**: Defined as `SnesButton` constants (B, Y, SELECT, START, UP, DOWN, LEFT, RIGHT, A, X, L, R)

#### 2. SnesCore Implementation (`core/SnesCore.ts`)

The SNES emulator implementation wrapping the Snes9x WASM module.

**Current State**: Mock implementation for development
- Generates colorful gradient patterns to visualize emulation
- Provides placeholder audio (simple sine wave)
- Demonstrates the interface contract

**Future**: Will integrate actual Snes9x WASM module

#### 3. EmulatorScreen Component (`components/EmulatorScreen.tsx`)

The main UI component that orchestrates emulation.

**Responsibilities**:
- Render canvas for video output
- Display FPS and gamepad status
- Handle ROM file loading
- Manage save states (4 slots)
- Provide play/pause/reset controls
- Show keyboard control reference

#### 4. useEmulator Hook (`hooks/useEmulator.ts`)

Manages the emulator rendering loop and lifecycle.

**Key Features**:
- Frame rate limiting (target 60 FPS)
- requestAnimationFrame-based rendering loop
- FPS counter
- Start/stop/toggle controls
- Canvas reference management

#### 5. useInput Hook (`hooks/useInput.ts`)

Handles keyboard and gamepad input with SNES controller mapping.

**Keyboard Mapping**:
- D-Pad: Arrow Keys or WASD
- A: X, B: Z, X: V, Y: C
- L: Q, R: E
- Start: Enter, Select: Shift

**Gamepad**: Standard gamepad mapping with automatic detection

**Output**: Combined button bitmask updated on every input change

#### 6. AudioSystem (`audio/AudioSystem.ts`)

WebAudio-based audio streaming system.

**Features**:
- AudioWorklet for low-latency audio (with ScriptProcessor fallback)
- 48kHz sample rate
- Volume control
- Suspend/resume based on emulator state

### Data Flow

```
User Input (Keyboard/Gamepad)
  ↓ [useInput hook]
Button Bitmask
  ↓ [setInput()]
IEmulatorCore
  ↓ [runFrame()]
Video Frame + Audio Samples
  ↓ 
Canvas (via useEmulator) + WebAudio (via AudioSystem)
  ↓
Browser Display + Speakers
```

## Multi-Environment Architecture

### Current Implementation

The codebase is structured to support multi-environment scenarios:

1. **Emulator Core Abstraction**: `IEmulatorCore` can run independently of UI
2. **State Serialization**: Save states are `Uint8Array` (network-transferable)
3. **Input Decoupling**: Controller state is a simple bitmask (network-friendly)
4. **Frame-by-Frame Processing**: Each `runFrame()` call is atomic

### Future Multi-Environment Features (Gaps to Fill)

The architecture makes these features obvious as next steps:

1. **Network Layer** (Gap: `network/` directory doesn't exist yet)
   - WebRTC for peer-to-peer connections
   - WebSocket for server-mediated connections
   - Message protocol for input/state sync

2. **Session Management** (Gap: No session types defined)
   - Host mode (runs emulator, broadcasts frames)
   - Client mode (sends input, receives frames)
   - Lobby system for matchmaking

3. **State Synchronization** (Gap: No sync hooks)
   - Periodic state sync to prevent drift
   - Input prediction for latency compensation
   - Frame buffering for smooth playback

## Coding Standards and Conventions

### TypeScript

- **Strict Mode**: Always enabled (`tsconfig.json`)
- **Type Everything**: No implicit `any` types
- **Interfaces Over Types**: Use `interface` for object shapes
- **Const Assertions**: Use `as const` for literal types (e.g., `SnesButton`)

### React

- **Functional Components**: No class components
- **Hooks**: Use built-in and custom hooks for state/lifecycle
- **Props Interface**: Every component has a typed props interface
- **Ref Management**: Use `useRef` for DOM references and mutable values

### File Organization

- **One Component Per File**: Each React component in its own `.tsx` file
- **Co-located Styles**: Component CSS files next to components
- **Index Exports**: Use barrel exports (`index.ts`) for clean imports
- **Type Definitions**: Interfaces in the same file or dedicated types file

### Naming Conventions

- **Components**: PascalCase (e.g., `EmulatorScreen`)
- **Hooks**: camelCase with `use` prefix (e.g., `useEmulator`)
- **Interfaces**: PascalCase with `I` prefix for core abstractions (e.g., `IEmulatorCore`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `KEYBOARD_MAP`)
- **Files**: Match primary export (e.g., `SnesCore.ts` exports `SnesCore` class)

### Comments

- **JSDoc**: Use for public APIs and interfaces
- **Inline Comments**: Explain "why" not "what"
- **TODO Comments**: Mark incomplete features clearly

Example:
```typescript
/**
 * Custom hook for managing emulator lifecycle and rendering loop
 */
export function useEmulator(options: UseEmulatorOptions): UseEmulatorResult {
  // ...
}
```

## Development Workflow

### Required Before Each Commit

**ALWAYS** run these commands before committing changes:

```bash
# 1. Lint the code (fix issues automatically where possible)
npm run lint

# 2. Run TypeScript compilation check
npm run build

# 3. Run tests
npm test

# Optional: Run tests with coverage
npm run test:coverage
```

### Initial Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:5173`

### Available Commands

```bash
# Development
npm run dev              # Start dev server with hot reload (localhost:5173)
npm run preview          # Preview production build locally

# Building
npm run build           # TypeScript compilation + Vite production build
                        # Output: dist/ directory (ready for deployment)

# Code Quality
npm run lint            # Run ESLint to check for code issues
                        # Config: eslint.config.js

# Testing
npm test                # Run Vitest test suite
npm run test:coverage   # Run tests with coverage report
npm run test:ui         # Run tests with interactive UI
```

### Build and Test Pipeline

**Before Starting Work:**
1. Pull latest changes: `git pull origin main`
2. Install/update dependencies: `npm install`
3. Verify build works: `npm run build`
4. Run existing tests: `npm test`

**During Development:**
1. Make small, incremental changes
2. Test frequently in browser: `npm run dev`
3. Run tests after each logical change: `npm test`
4. Verify TypeScript compiles: `npm run build`

**Before Committing:**
1. Run linter: `npm run lint` (fix all issues)
2. Run full build: `npm run build` (must succeed)
3. Run all tests: `npm test` (all must pass)
4. Manually verify in browser if UI changed
5. Review your changes with `git diff`

**Commit Message Format:**
- Use present tense: "Add feature" not "Added feature"
- First line: Brief summary (<50 chars)
- Body: Explain what and why, not how
- Reference issues: "Fixes #123" or "Part of #123"

Example:
```
Add WebRTC peer connection interface

Define IWebRTCPeer interface following interface-first
design principle. Includes connection lifecycle methods,
data channel management, and error handling.

Part of #45 (Network Layer Implementation)
```

### Preview Production Build

```bash
# Build and preview
npm run build
npm run preview
```

## Testing Strategy

### Testing Requirements

**All new code must include tests.** Testing framework: **Vitest** with React Testing Library.

### Test Structure

Tests are located in `src/test/` and organized by component type:
- `core/` - Emulator core tests
- `hooks/` - React hooks tests  
- `components/` - Component tests
- `audio/` - Audio system tests

### Writing Tests

**File Naming**: `ComponentName.test.tsx` or `moduleName.test.ts`

**Test Structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should have a clear, descriptive test name', () => {
    // Arrange
    const input = createInput();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Test Coverage Requirements

**Minimum Coverage:**
- Unit Tests: 80% coverage for core logic
- Hook Tests: 90% coverage (hooks are critical)
- Component Tests: 70% coverage (focus on behavior)

**What to Test:**
1. **Unit Tests**:
   - `IEmulatorCore` implementations
   - Button bitmask calculations
   - State serialization/deserialization
   - Input mapping logic
   - Audio sample processing

2. **Hook Tests**:
   - `useEmulator` lifecycle
   - `useInput` keyboard/gamepad mapping
   - FPS calculation accuracy
   - State updates and cleanup

3. **Integration Tests**:
   - ROM loading flow
   - Save state creation/restoration
   - Audio system initialization
   - Input to emulator core pipeline

4. **End-to-End Tests** (future):
   - Full emulation cycle
   - Multi-environment scenarios
   - Network synchronization

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run with interactive UI
npm run test:ui

# Run specific test file
npm test -- ComponentName.test.tsx

# Run in watch mode
npm test -- --watch
```

### Test-Driven Development (TDD)

For new features, follow TDD:
1. Write failing test first (red)
2. Write minimal code to pass (green)
3. Refactor while keeping tests green

### Manual Testing

After code changes, **manually verify in browser:**
1. Start dev server: `npm run dev`
2. Test the changed functionality
3. Test related functionality (regression)
4. Test in multiple browsers if possible
5. Take screenshots of UI changes

## Common Development Tasks

### Adding a New Emulator Core

1. **Define interface** (if extending `IEmulatorCore`)
2. **Write tests** for the new core
3. Create implementation in `core/` directory
4. Implement `IEmulatorCore` interface
5. Update `EmulatorScreen` to support selection
6. Verify all tests pass
7. Manual browser testing

### Adding a New Input Method

1. **Write tests** for input mapping
2. Extend `useInput` hook with new device mapping
3. Add to `KEYBOARD_MAP` or create new mapping object
4. Update control reference in UI
5. Test input bitmask generation
6. Verify tests pass
7. Manual testing with actual device

### Adding Network Features

1. **Define interfaces first** (IWebRTCPeer, ISessionManager, etc.)
2. **Write tests** for network protocol
3. Create `network/` directory
4. Define message protocol interface
5. Implement WebRTC or WebSocket transport
6. Add host/client modes to `EmulatorScreen`
7. Sync state via `saveState()`/`loadState()`
8. Test with multiple devices

### Adding New React Components

1. **Write component tests** first
2. Create component in `components/` directory
3. Define props interface
4. Implement component
5. Add CSS file if needed
6. Update parent component to use it
7. Verify tests pass
8. Manual browser verification

### Optimizing Performance

1. Measure first: Check FPS counter in UI
2. Profile with browser dev tools
3. Identify bottleneck: `runFrame()` execution time
4. Optimize hot paths in emulator core
5. Consider Web Workers for emulation thread
6. Re-measure to verify improvement
7. Don't optimize without measurements

## Browser Compatibility

### Minimum Requirements

- **Chrome/Edge**: 89+ (AudioWorklet support)
- **Firefox**: 76+ (AudioWorklet support)
- **Safari**: 14.1+ (AudioWorklet support)

### Feature Detection

The codebase gracefully degrades:
- AudioWorklet → ScriptProcessorNode (deprecated fallback)
- Gamepad API → Keyboard only

## Deployment

### Static Hosting

Omnilator is a static site. Deploy `dist/` folder to:
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

### Configuration

- Base URL: Set in `vite.config.ts` if not root path
- CORS: Ensure ROM files are served with proper headers

## Security Considerations

### Security Requirements

**All code must be secure by default.** Follow these security practices:

### Input Validation

**ALWAYS validate user input:**
- Validate ROM file size before loading (max: 8MB)
- Check save state integrity before loading
- Sanitize all network messages (future)
- Validate file types (only .smc, .sfc for ROMs)
- Never trust client-side data

**Example:**
```typescript
// Good: Validate before processing
function loadROM(file: File): Promise<void> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('ROM file too large (max 8MB)');
  }
  if (!file.name.match(/\.(smc|sfc)$/i)) {
    throw new Error('Invalid ROM file type');
  }
  // ... proceed with loading
}

// Bad: No validation
function loadROM(file: File): Promise<void> {
  return file.arrayBuffer(); // Unchecked!
}
```

### Data Handling

- **ROM Files**: Loaded from user's device or public URLs only
- **No Server Storage**: No server-side ROM storage (legal compliance)
- **User Responsibility**: User responsible for ROM ownership
- **Memory Safety**: Always clean up WASM memory
- **Type Safety**: Use TypeScript strict mode

### Network Security (Future)

When implementing network features:
- Use WebRTC encryption (DTLS/SRTP)
- Validate all peer messages
- Implement rate limiting
- Sanitize all text inputs
- Never execute remote code
- Use Content Security Policy headers

### Browser Security

- Respect CORS policies
- Use secure WebSocket (WSS) only
- Implement CSP headers in production
- No `eval()` or `Function()` constructors
- Sanitize any dynamic HTML

## Code Quality Standards

### Clean Code Principles

Based on "Clean Code" by Robert Martin, follow these standards:

#### 1. Meaningful Names

**Variables, functions, and classes must have descriptive names:**
```typescript
// Good
const audioBufferSizeInSamples = 2048;
function calculateFramesPerSecond(): number { ... }

// Bad
const abs = 2048;
function calc(): number { ... }
```

#### 2. Functions Should Be Small

- **One responsibility** per function
- **Maximum 20-30 lines** (guideline, not rule)
- **Extract complex logic** into named functions

```typescript
// Good: Small, focused functions
function loadROMAndInitialize(file: File): Promise<void> {
  validateROMFile(file);
  const data = await readROMData(file);
  await initializeEmulator(data);
}

// Bad: One giant function doing everything
function loadROMAndInitialize(file: File): Promise<void> {
  if (file.size > 8MB) throw new Error(...);
  if (!file.name.match(...)) throw new Error(...);
  const reader = new FileReader();
  reader.onload = () => { ... 100 more lines ... };
}
```

#### 3. No Side Effects

Functions should do what their name says, nothing more:
```typescript
// Good: Function name reflects all actions
function loadROMAndResetState(data: Uint8Array): void {
  this.loadROM(data);
  this.reset();
}

// Bad: Hidden side effect
function loadROM(data: Uint8Array): void {
  this.romData = data;
  this.reset(); // Surprise! Not mentioned in name
}
```

#### 4. Comments Explain Why, Not What

```typescript
// Good: Explains why
// Use 2048 samples to balance latency (<50ms) with stability
const audioBufferSize = 2048;

// Bad: States the obvious
// Set audio buffer size to 2048
const audioBufferSize = 2048;

// Good: No comment needed (self-documenting)
const targetFramesPerSecond = 60;
```

#### 5. Error Handling

**Use exceptions, not error codes:**
```typescript
// Good
async function loadROM(data: Uint8Array): Promise<void> {
  if (!this.wasmModule) {
    throw new Error('WASM module not initialized');
  }
  await this.wasmModule.loadROM(data);
}

// Bad
function loadROM(data: Uint8Array): number {
  if (!this.wasmModule) return -1; // Error code
  return this.wasmModule.loadROM(data);
}
```

#### 6. DRY (Don't Repeat Yourself)

Extract repeated logic into reusable functions:
```typescript
// Good: Reusable validation
function validateButtonMask(buttons: number): void {
  if (buttons < 0 || buttons > 0xFFFF) {
    throw new Error('Invalid button mask');
  }
}

// Bad: Repeated validation
setInput(port: number, buttons: number): void {
  if (buttons < 0 || buttons > 0xFFFF) throw new Error(...);
  // ...
}

updateInput(buttons: number): void {
  if (buttons < 0 || buttons > 0xFFFF) throw new Error(...);
  // ...
}
```

### Code Review Checklist

Before submitting code, ensure:
- [ ] All functions have single responsibility
- [ ] Names are descriptive and meaningful
- [ ] No magic numbers (use named constants)
- [ ] Error handling is comprehensive
- [ ] Tests cover all paths (including errors)
- [ ] No code duplication
- [ ] Comments explain "why" not "what"
- [ ] TypeScript strict mode passes
- [ ] ESLint shows no warnings
- [ ] All tests pass
- [ ] Manual testing in browser complete

## Performance Targets

### Emulation

- **Target FPS**: 60 (SNES native)
- **Frame Time**: ~16.67ms
- **Audio Latency**: <50ms

### Rendering

- **Canvas Updates**: 60 FPS via requestAnimationFrame
- **Audio Buffer Size**: 2048 samples (~42ms at 48kHz)

## Troubleshooting

### Audio Not Working

- Check browser autoplay policy
- Audio must initialize after user interaction
- Verify AudioWorklet file availability

### Low FPS

- Check `runFrame()` execution time
- Reduce audio buffer size
- Ensure canvas size is reasonable

### Gamepad Not Detected

- Press any button to wake gamepad
- Check browser's gamepad API support
- Use browser gamepad tester to verify device

## Future Roadmap

Based on the codebase structure, these features are natural next steps:

1. **Real Snes9x Integration**: Replace mock with actual WASM module
2. **Network Play**: Add WebRTC for multi-environment gaming
3. **Save State Management**: Persistent storage via IndexedDB
4. **Game Library UI**: Browse and select games from `games.json`
5. **Settings Panel**: Audio volume, video filters, key remapping
6. **Mobile UI**: Touch controls for phone devices
7. **Performance Metrics**: Detailed frame timing and profiling
8. **Cheat Code Support**: Add GameShark/Action Replay codes

## Getting Help

### Resources

- **Snes9x Documentation**: For emulator core details
- **WebAudio API Docs**: For audio system
- **React 19 Docs**: For component patterns
- **TypeScript Handbook**: For type system

### Code Examples

All code follows the patterns established in existing files:
- Study `SnesCore.ts` for interface implementation
- Study `useEmulator.ts` for custom hooks
- Study `EmulatorScreen.tsx` for component structure

## System Development Life Cycle (SDLC)

### Our Development Process

We follow an **incremental, iterative, tidy-first approach** based on Kent Beck's methodology:

#### Phase 1: Understand the Requirement
1. **Read the issue/task carefully**
2. **Check dependencies** in `docs/TASK_BREAKDOWN.md`
3. **Review related code** to understand context
4. **Identify what needs to change**

#### Phase 2: Plan the Change (Tidy First)
1. **Before adding the feature**, ask:
   - "What would make this change easy?"
   - "What code needs tidying first?"
2. **Plan tidying commits** (refactoring, cleanup)
3. **Plan feature commits** (new behavior)
4. **Keep them separate**

#### Phase 3: Tidy (If Needed)
1. **Make small tidying changes** that don't change behavior
2. **One tidy per commit**: "Extract validation logic into helper"
3. **Run tests** to verify behavior unchanged
4. **Commit each tidy separately**

Examples of tidying:
- Extract long method into smaller functions
- Move related code closer together
- Rename unclear variables
- Remove dead code
- Add missing type annotations
- Reduce nesting with guard clauses

#### Phase 4: Implement the Feature
1. **Write tests first** (TDD)
2. **Write minimal code** to pass tests
3. **Run tests frequently**
4. **Commit when tests pass**

#### Phase 5: Validate
1. **Run full test suite**: `npm test`
2. **Run linter**: `npm run lint`
3. **Build**: `npm run build`
4. **Manual browser testing**
5. **Take screenshots** if UI changed

#### Phase 6: Review and Refine
1. **Review your changes**: `git diff`
2. **Check against code quality checklist**
3. **Update documentation** if needed
4. **Write clear commit message**
5. **Push and create PR**

### Decision Framework

When making technical decisions:

1. **Simple over clever** - Prefer straightforward solutions
2. **Explicit over implicit** - Make intentions clear
3. **Boring over exciting** - Proven patterns over novel approaches
4. **Tested over theoretical** - Verify with tests
5. **Documented over obvious** - If it took you time to understand, document it

### Working with Existing Code

**When modifying existing code:**

1. **Understand first** - Read the code and related tests
2. **Respect patterns** - Match existing style and structure
3. **Preserve behavior** - Don't break existing functionality
4. **Add tests** - Even if none existed before
5. **Leave it better** - Small improvements as you go

**Red flags to watch for:**
- Functions over 50 lines
- Deeply nested conditionals (>3 levels)
- Repeated code blocks
- Magic numbers without constants
- Missing error handling
- Functions doing multiple things

### Dealing with Technical Debt

When you encounter technical debt:

1. **Document it** - Add TODO comment with issue reference
2. **Fix if related** - If it blocks your work, fix it first
3. **Defer if unrelated** - Create issue for later
4. **Don't accumulate** - Each change should improve code quality

### Documentation Standards

**When to update documentation:**

- Adding new interfaces or APIs → Update this file
- Changing workflow → Update `docs/QUICK_START_GUIDE.md`
- Completing a phase → Update `docs/PROJECT_ROADMAP.md`
- Fixing a bug → Add to troubleshooting section
- Learning something non-obvious → Update relevant doc

**Documentation should be:**
- Accurate (test your examples)
- Concise (respect the reader's time)
- Practical (include examples)
- Up-to-date (update when code changes)

## Summary for AI Agents

When working on this codebase:

1. **Start with the interface**: Check `IEmulatorCore.ts` to understand the contract
2. **Follow the holy texts**: Interface-first, separation of concerns, browser APIs
3. **Apply tidy-first**: Refactor before adding features, keep commits separate
4. **Look for gaps**: Missing directories/files indicate future features
5. **Maintain patterns**: Match existing code style and structure
6. **Write tests first**: TDD ensures correct behavior
7. **Self-document**: Write code that explains itself through structure
8. **Think multi-environment**: Design features to work across devices
9. **Test in browser**: This is a web app - always verify in the browser
10. **Follow Clean Code**: Meaningful names, small functions, no side effects
11. **Security first**: Validate all inputs, handle errors properly
12. **Commit frequently**: Small, focused commits with clear messages

The codebase is designed to make missing features obvious. If you can't find something, it's probably a gap that needs filling. The architecture supports it - you just need to implement it following the established patterns.

### Quick Reference Checklist

Before committing ANY code:
- [ ] Interface defined (for new components)
- [ ] Tests written and passing
- [ ] Code follows tidy-first principles
- [ ] Names are descriptive
- [ ] Functions are small (<30 lines guideline)
- [ ] No code duplication
- [ ] Error handling complete
- [ ] TypeScript compiles: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Manual browser testing done
- [ ] Documentation updated
- [ ] Commit message is clear
