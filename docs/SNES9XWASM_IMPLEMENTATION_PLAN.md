# Snes9xWasm Implementation Plan

**Document Version**: 1.0  
**Last Updated**: 2025-12-28  
**Status**: Planning Phase  
**Target Audience**: Junior to Senior Developers

---

## Executive Summary

This document provides a comprehensive plan for transitioning the Omnilator SNES emulator from the current LibRetro-based architecture to a direct integration with the snes9x2005-wasm library.

**Key Goals:**
- ✅ Achieve 100% test coverage for the new implementation
- ✅ Maintain backward compatibility with existing code
- ✅ Provide a clear, risk-mitigated transition path
- ✅ Create junior developer-ready task breakdown
- ✅ Comprehensive documentation updates

---

## Table of Contents

1. [Discovery Process](#1-discovery-process)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [100% Test Coverage Strategy](#4-100-test-coverage-strategy)
5. [Transition Plan](#5-transition-plan)
6. [Testing Plan](#6-testing-plan)
7. [Documentation Update Plan](#7-documentation-update-plan)
8. [Junior Dev Ready Task List](#8-junior-dev-ready-task-list)
9. [Risk Management](#9-risk-management)
10. [Success Criteria](#10-success-criteria)

---

## 1. Discovery Process

### 1.1 How to Transition from LibRetro to Snes9xWasm

#### Understanding the Architectural Difference

**Current LibRetro Approach:**
- Generic abstraction layer supporting multiple cores
- Loads cores dynamically via URL
- Complex callback system for video, audio, and input
- Requires external core files
- Network-dependent for core loading

**New Snes9xWasm Approach:**
- Direct integration with snes9x2005-wasm
- Built from source as part of the project
- Simplified API specific to SNES emulation
- Self-contained (no external dependencies at runtime)
- Optimized for web performance

#### Key Technical Differences

| Aspect | LibRetro | Snes9xWasm |
|--------|----------|------------|
| **Core Loading** | Dynamic URL loading | Static build integration |
| **API Surface** | Generic libretro.h | Custom SNES-specific API |
| **Callbacks** | 6+ callback functions | Direct function calls |
| **Memory Management** | Through generic libretro API | Direct Emscripten heap access |
| **Build Process** | Pre-built cores from CDN | Built from source with Emscripten |
| **Testing** | Harder (external dependencies) | Easier (self-contained) |

### 1.2 Discovery Steps Completed

1. ✅ Analyzed snes9x2005-wasm build system in `public/snes/core/snes9x2005-wasm-master/`
2. ✅ Identified exported LibRetro functions from source
3. ✅ Mapped functions to `IEmulatorCore` interface
4. ✅ Understood Emscripten memory model
5. ✅ Reviewed existing `LibRetroCore` implementation
6. ✅ Analyzed `MockSnesCore` as testing reference
7. ✅ Examined test infrastructure (Vitest + coverage)

### 1.3 Why This Transition Makes Sense

**Benefits:**
1. **Simplified Architecture**: Direct API calls instead of generic callbacks
2. **Better Performance**: Less abstraction overhead
3. **Easier Testing**: No external dependencies to mock
4. **Deterministic Builds**: Control over compilation flags
5. **Smaller Bundle**: Only include what we need
6. **Type Safety**: Full TypeScript definitions

**Trade-offs:**
1. **Less Flexibility**: Tied to snes9x specifically (acceptable for SNES-focused MVP)
2. **Build Complexity**: Need Emscripten in build pipeline (one-time setup)
3. **Maintenance**: Responsible for updating the core (manageable)

**Decision**: Benefits outweigh trade-offs for MVP. Can revisit LibRetro for multi-platform support later.

---

## 2. Current State Analysis

### 2.1 Existing Architecture

```
EmulatorScreen (React Component)
    ├── useEmulator (rendering loop)
    ├── useInput (keyboard/gamepad)
    └── AudioSystem (WebAudio)
        └── SnesCore (wrapper)
            └── IEmulatorCore (interface)
                ├── LibRetroCore (current - network-dependent)
                ├── MockSnesCore (fallback - demo mode)
                └── Snes9xWasmCore (new - to be implemented)
```

### 2.2 Current Test Coverage

**Estimated Coverage:**
- `IEmulatorCore.ts`: 100% (interface only)
- `MockSnesCore.ts`: ~90% (well tested)
- `LibRetroCore.ts`: ~60% (hard to test - external deps)
- `SnesCore.ts`: ~80% (integration wrapper)

**Coverage Gaps:**
1. LibRetro callback functions difficult to test
2. WASM module loading not covered
3. Memory management edge cases not tested
4. Pixel format conversion not thoroughly tested
5. Save state serialization not tested end-to-end

### 2.3 Files to Create

New files needed:
- `src/core/Snes9xWasmCore.ts` - Main implementation
- `src/core/Snes9xWasmCore.test.ts` - Unit tests
- `src/core/Snes9xWasmCore.integration.test.ts` - Integration tests
- `src/core/__mocks__/snes9x-wasm-module.ts` - Mock WASM module
- `src/core/types/Snes9xWasmModule.ts` - TypeScript definitions
- `docs/SNES9XWASM_API.md` - API reference
- `docs/BUILD_GUIDE.md` - Build instructions

---

## 3. Target Architecture

### 3.1 New Component: Snes9xWasmCore

```typescript
export class Snes9xWasmCore implements IEmulatorCore {
  private module: Snes9xWasmModule | null = null;
  private videoBuffer: ImageData;
  private audioBuffer: Float32Array;
  private inputStates: number[] = [0, 0, 0, 0];
  
  // Implements all IEmulatorCore methods
  async initialize(): Promise<void>;
  async loadROM(romData: Uint8Array): Promise<void>;
  async runFrame(): Promise<void>;
  getBuffer(): ImageData;
  getAudioSamples(): Float32Array;
  setInput(port: number, buttons: number): void;
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;
  reset(): void;
  cleanup(): void;
}
```

### 3.2 Integration with Existing Code

**SnesCore will use priority chain:**

```typescript
// 1. Try Snes9xWasmCore (primary - best performance)
// 2. Fall back to LibRetroCore (if WASM fails)
// 3. Fall back to MockSnesCore (always works - demo mode)

constructor() {
  try {
    this.core = new Snes9xWasmCore();
  } catch {
    try {
      this.core = new LibRetroCore('snes9x');
    } catch {
      this.core = new MockSnesCore();
    }
  }
}
```

---

## 4. 100% Test Coverage Strategy

### 4.1 Testing Philosophy

**Approach**: Test-Driven Development (TDD)
1. Write test first (fails)
2. Implement minimal code to pass
3. Refactor with confidence
4. Repeat

**Coverage Target**: 100% (statement, branch, function, line)

### 4.2 Test Categories

**Total Tests Planned: ~131 tests**

1. **Initialization Tests** (10 tests)
   - Module loads successfully
   - Callbacks registered correctly
   - Initial state correct
   - Error handling
   - Memory initialization

2. **ROM Loading Tests** (15 tests)
   - Valid .sfc/.smc ROMs
   - Invalid ROMs rejected
   - Header detection
   - Memory management
   - Error cases

3. **Frame Execution Tests** (12 tests)
   - Single/multiple frames
   - Callbacks triggered
   - Buffers updated
   - Timing consistency

4. **Video Tests** (18 tests)
   - RGB565/XRGB8888/RGB1555 conversion
   - Correct dimensions
   - Pixel accuracy
   - Memory bounds

5. **Audio Tests** (10 tests)
   - Sample collection
   - Format conversion
   - Synchronization
   - Buffer management

6. **Input Tests** (16 tests)
   - All ports (0-3)
   - All buttons
   - Combinations
   - Multi-port simultaneous

7. **Save State Tests** (12 tests)
   - Save/load round-trip
   - State validation
   - Error handling
   - Memory management

8. **Reset Tests** (5 tests)
   - State clearing
   - ROM preservation
   - SRAM preservation

9. **Cleanup Tests** (8 tests)
   - Resource freeing
   - Memory leaks prevention
   - Double cleanup safety

10. **Error Handling Tests** (10 tests)
    - Null pointers
    - Out of memory
    - Invalid operations
    - Graceful failures

11. **Integration Tests** (15 tests)
    - End-to-end emulation
    - Canvas rendering
    - Audio playback
    - Component integration

### 4.3 Mock Strategy

```typescript
// Mock WASM module for unit testing
export class MockSnes9xWasmModule {
  HEAP8 = new Int8Array(1024 * 1024);
  _malloc = vi.fn(() => 0x1000);
  _free = vi.fn();
  _retro_init = vi.fn();
  _retro_run = vi.fn(() => {
    this.triggerCallbacks();
  });
  // ... all other methods mocked
}
```

### 4.4 Coverage Measurement

```bash
# Run tests with coverage
npm run test:coverage

# Coverage thresholds in vitest.config.ts
coverage: {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100
}
```

---

## 5. Transition Plan

### 5.1 Six-Week Phased Approach

**Week 1: Foundation**
- Set up Emscripten build environment
- Build snes9x2005-wasm from source
- Create TypeScript interfaces
- Create mock WASM module
- Create Snes9xWasmCore skeleton

**Week 2: Core Implementation**
- Implement initialization
- Implement ROM loading
- Implement frame execution
- Implement video callbacks
- Implement audio callbacks

**Week 3: Features**
- Implement input handling
- Implement save states
- Implement reset
- Implement cleanup

**Week 4: Integration**
- Update SnesCore integration
- Add feature flags
- Integration testing
- Update EmulatorScreen UI

**Week 5: Testing & Polish**
- Achieve 100% test coverage
- Performance optimization
- Bug fixes
- Documentation updates

**Week 6: Deployment**
- Production build testing
- Browser compatibility testing
- Performance benchmarking
- Final code review
- Release preparation

### 5.2 Backward Compatibility

**Guaranteed Compatibility:**
- `IEmulatorCore` interface unchanged
- `SnesCore` API unchanged
- All existing tests still pass
- Fallback chain ensures no functionality loss

**Feature Flags:**
```typescript
// Enable/disable via environment variable
const USE_SNES9X_WASM = import.meta.env.VITE_USE_SNES9X_WASM ?? true;
```

### 5.3 Rollback Plan

**If issues arise:**
1. Minor: Fix in place
2. Major: Disable via feature flag
3. Critical: Revert to LibRetroCore

```bash
# Emergency rollback
VITE_USE_SNES9X_WASM=false npm run build
```

---

## 6. Testing Plan

### 6.1 Unit Testing with Vitest

**Running Tests:**
```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm test -- --watch         # Watch mode
npm run test:ui             # Visual UI mode
```

**Test Structure:**
```typescript
describe('Snes9xWasmCore', () => {
  let core: Snes9xWasmCore;
  
  beforeEach(() => {
    core = new Snes9xWasmCore();
  });
  
  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await core.initialize();
      expect(core).toBeDefined();
    });
  });
});
```

### 6.2 Integration Testing

**Test Scenarios:**
- Load ROM → Run 60 frames → Verify output
- Save state → Continue → Load → Verify restoration
- Full component integration (EmulatorScreen → SnesCore → Snes9xWasmCore)

### 6.3 Performance Testing

**Benchmarks:**
- Frame execution time: <16.67ms (60 FPS)
- Memory usage: <50MB
- No memory leaks over 10 minutes

### 6.4 Browser Compatibility

**Target Browsers:**
- Chrome 89+
- Firefox 76+
- Safari 14.1+
- Edge 89+
- Mobile: iOS Safari, Chrome Android

### 6.5 Continuous Integration

**GitHub Actions workflow includes:**
- Emscripten SDK setup
- WASM core build
- Test execution
- Coverage verification (100% threshold)
- Build verification

---

## 7. Documentation Update Plan

### 7.1 Documents to Update

1. **README.md**
   - Add Emscripten requirement
   - Update build instructions
   - Update architecture diagram

2. **EMULATOR_INTEGRATION.md**
   - Add Snes9xWasmCore section
   - Update diagrams
   - Add build instructions

3. **PROJECT_ROADMAP.md**
   - Mark Phase 1 complete
   - Update timeline
   - Add lessons learned

4. **TASK_BREAKDOWN.md**
   - Mark completed tasks
   - Document actual vs estimated time

5. **Create: SNES9XWASM_API.md**
   - Complete API reference
   - Function signatures
   - Memory layout
   - Examples

6. **Create: BUILD_GUIDE.md**
   - Emscripten installation
   - Build from source
   - Troubleshooting
   - CI/CD integration

### 7.2 JSDoc Standards

All public APIs must have comprehensive JSDoc:

```typescript
/**
 * Initialize the WASM module and set up callbacks
 * 
 * This must be called before any other operations. It will:
 * 1. Load the snes9x2005.wasm file
 * 2. Initialize the libretro core
 * 3. Register all callbacks
 * 4. Allocate initial buffers
 * 
 * @throws {Error} If WASM module fails to load
 * @throws {Error} If core initialization fails
 * 
 * @example
 * ```typescript
 * const core = new Snes9xWasmCore();
 * await core.initialize();
 * ```
 */
async initialize(): Promise<void>
```

---

## 8. Junior Dev Ready Task List

### 8.1 Task Structure

Each task includes:
- Clear objective
- Prerequisites
- Step-by-step instructions with code examples
- Acceptance criteria
- Testing requirements
- Time estimate

### 8.2 Complete Task List (27 Tasks)

**Sprint 1: Foundation (Week 1)**
- ✅ SNES-001: Set Up Emscripten Build Environment (2h) - COMPLETE
- ✅ SNES-002: Build snes9x2005-wasm from Source (1h) - COMPLETE
- ✅ SNES-003: Create TypeScript Module Interface (3h) - COMPLETE
- SNES-004: Create Mock WASM Module (4h)
- SNES-005: Create Snes9xWasmCore Skeleton (2h)

**Sprint 2: Core Implementation (Week 2)**
- SNES-006: Implement Core Initialization (6h)
- SNES-007: Implement ROM Loading (6h)
- SNES-008: Implement Frame Execution (4h)
- SNES-009: Implement Video Callbacks (8h)
- SNES-010: Implement Audio Callbacks (6h)

**Sprint 3: Features (Week 3)**
- SNES-011: Implement Input Handling (4h)
- SNES-012: Implement Save States (6h)
- SNES-013: Implement Reset Functionality (2h)
- SNES-014: Implement Cleanup (3h)

**Sprint 4: Integration (Week 4)**
- SNES-015: Update SnesCore Integration (4h)
- SNES-016: Add Feature Flags (2h)
- SNES-017: Integration Testing (8h)
- SNES-018: Update EmulatorScreen UI (4h)

**Sprint 5: Testing & Polish (Week 5)**
- SNES-019: Achieve 100% Test Coverage (12h)
- SNES-020: Performance Optimization (8h)
- SNES-021: Bug Fixes from Testing (Variable)
- SNES-022: Documentation Updates (6h)

**Sprint 6: Deployment (Week 6)**
- SNES-023: Production Build Testing (4h)
- SNES-024: Browser Compatibility Testing (6h)
- SNES-025: Performance Benchmarking (4h)
- SNES-026: Final Code Review (4h)
- SNES-027: Release Preparation (2h)

**Total: ~120 hours (6 weeks @ 20h/week)**

### 8.3 Example Task Detail (SNES-001)

**SNES-001: Set Up Emscripten Build Environment**

**Objective**: Install and configure Emscripten SDK for building WebAssembly

**Prerequisites**: None

**Steps**:
```bash
# 1. Clone Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# 2. Install and activate version 3.1.51
./emsdk install 3.1.51
./emsdk activate 3.1.51
source ./emsdk_env.sh

# 3. Verify installation
emcc --version
# Should show: emcc (Emscripten gcc/clang-like replacement) 3.1.51
```

**Acceptance Criteria**:
- [ ] `emcc --version` shows 3.1.51
- [ ] Can compile simple C program to WASM
- [ ] CI workflow includes Emscripten setup
- [ ] Documentation updated

**Testing**:
```bash
# Test compilation
echo 'int main() { return 0; }' > test.c
emcc test.c -o test.js
node test.js
# Should exit with code 0
```

**Time Estimate**: 2 hours

---

## 9. Risk Management

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WASM module fails to load | Medium | High | Fallback chain (LibRetro → Mock) |
| Performance regression | Low | High | Benchmark early and often |
| Memory leaks | Medium | Medium | Comprehensive testing + profiling |
| Browser incompatibility | Low | Medium | Test on all target browsers |
| Save state incompatibility | Low | Medium | Version save states, validate |

### 9.2 Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Timeline slip | Medium | Medium | Weekly check-ins, adjust scope |
| Scope creep | Medium | Medium | Strict adherence to MVP |
| Knowledge gaps | Low | Low | Pair programming, documentation |
| Test coverage gaps | Low | High | TDD approach, coverage gates |

### 9.3 Contingency Plans

**Critical Bug Found Late:**
1. Assess severity
2. If blocker: Delay release, fix immediately
3. If minor: Document, add to backlog

**Performance Target Missed:**
1. Profile to identify bottleneck
2. Optimize hot paths
3. If still not meeting: Reduce scope or adjust target

**Timeline Slips:**
1. Identify cause
2. Adjust timeline or reduce scope
3. Communicate to stakeholders

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] ✅ Snes9xWasmCore implements IEmulatorCore
- [ ] ✅ ROM loading works (.sfc and .smc)
- [ ] ✅ Frame execution at 60 FPS
- [ ] ✅ Video rendering correct
- [ ] ✅ Audio playback synchronized
- [ ] ✅ Input handling (all buttons)
- [ ] ✅ Save/load states
- [ ] ✅ Reset functionality
- [ ] ✅ Clean resource management
- [ ] ✅ Error handling

### 10.2 Non-Functional Requirements

- [ ] ✅ 100% test coverage
- [ ] ✅ All 131 tests passing
- [ ] ✅ Performance ≥ baseline
- [ ] ✅ Frame time <16.67ms
- [ ] ✅ Memory usage <50MB
- [ ] ✅ Build time <2 minutes
- [ ] ✅ Browser compatibility
- [ ] ✅ No console errors
- [ ] ✅ Mobile browser support

### 10.3 Documentation Requirements

- [ ] ✅ All public APIs documented
- [ ] ✅ README.md updated
- [ ] ✅ Architecture diagrams updated
- [ ] ✅ API reference created
- [ ] ✅ Build guide created
- [ ] ✅ Test documentation complete

### 10.4 Process Requirements

- [ ] ✅ Code review completed
- [ ] ✅ CI/CD pipeline passing
- [ ] ✅ Security review
- [ ] ✅ Performance benchmarks documented
- [ ] ✅ Backward compatibility verified
- [ ] ✅ Stakeholder sign-off

### 10.5 Manual Test Checklist

**ROM Loading:**
- [ ] Load valid .sfc ROM → Success
- [ ] Load valid .smc ROM → Success
- [ ] Load invalid file → Error message

**Emulation:**
- [ ] Run game for 60 seconds → No crashes
- [ ] Press all buttons → Game responds
- [ ] Save/load state → Works correctly
- [ ] Reset game → Restarts correctly

**Performance:**
- [ ] FPS ≥ 60
- [ ] Frame time ≤ 16.67ms
- [ ] No memory leaks (10 min test)

**Browser Compatibility:**
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Edge desktop
- [ ] Chrome mobile
- [ ] Safari mobile

---

## Conclusion

This implementation plan provides:

✅ **Clear discovery process** - Understanding architectural differences  
✅ **100% test coverage strategy** - 131 comprehensive tests  
✅ **Risk-mitigated transition plan** - 6-week phased approach  
✅ **Detailed testing plan** - Unit, integration, performance  
✅ **Complete documentation updates** - 7 documents  
✅ **Junior dev ready tasks** - 27 well-defined tasks  

**Priorities:**
- **Safety**: Fallback chain ensures no functionality loss
- **Quality**: TDD with 100% coverage target
- **Clarity**: Every task has clear acceptance criteria
- **Testability**: Comprehensive test strategy
- **Maintainability**: Thorough documentation

**Next Steps:**
1. Review and approve this plan
2. Assign tasks to team
3. Set up project tracking
4. Begin Sprint 1: Foundation
5. Weekly check-ins
6. Adjust based on learnings

**Questions:**
- Open GitHub issue with tag `snes9xwasm-plan`
- Contact Tech Lead for architectural questions
- Contact PM for timeline/scope questions

---

**Document Status**: ✅ Complete  
**Next Review**: After Sprint 1  
**Owner**: Technical Lead  
**Last Updated**: 2025-12-28
