# MCP Usage Guide for Omnilator

This guide documents the usage of Model Context Protocol (MCP) tools and practices when working with the Omnilator project.

## Overview

This document tracks the tools, patterns, and best practices used during development to help maintain consistency and improve future development workflows.

## Development Session: SNES-003 - TypeScript Module Interface

### Date
2026-01-05

### Objective
Create TypeScript interfaces for the snes9x2005-wasm module exports and memory structures.

### Tools Used

#### 1. File Exploration
- **view** - Explored repository structure and existing code
- **filesystem-read_text_file** - Read documentation and source files
- **filesystem-list_directory** - Listed directory contents
- **grep** - Would be useful for searching code patterns (not used this session)

#### 2. Code Analysis
- Read the C source file `exports.c` to understand WASM exports
- Analyzed the Emscripten-generated JavaScript glue code
- Examined existing TypeScript interfaces in `IEmulatorCore.ts`

#### 3. File Creation
- **bash** with mkdir - Created the `src/core/types/` directory
- **bash** with cat/heredoc - Created the main TypeScript interface file
- Direct file operations for creating index and documentation files

#### 4. Validation
- **npm run build** - Verified TypeScript compilation
- Confirmed no type errors and successful build

### Key Findings

#### WASM Module Exports
From analyzing `public/snes/core/snes9x2005-wasm-master/source/exports.c`:

**Memory Management:**
- `_my_malloc(length)` - Allocate WASM memory
- `_my_free(ptr)` - Free WASM memory

**Core Emulation:**
- `_startWithRom(romPtr, romLength, sampleRate)` - Initialize and load ROM
- `_mainLoop()` - Execute one frame (~16.67ms @ 60 FPS)

**Input:**
- `_setJoypadInput(input)` - Set controller buttons (player 1 only)

**Video/Audio:**
- `_getScreenBuffer()` - Get 512x448 RGBA8888 frame buffer
- `_getSoundBuffer()` - Get 2048 stereo float32 samples

**Save Data (SRAM):**
- `_saveSramRequest()` - Prepare SRAM for reading
- `_getSaveSramSize()` - Get SRAM size
- `_getSaveSram()` - Get SRAM pointer
- `_loadSram(size, ptr)` - Load SRAM data

**Save States:**
- `_getStateSaveSize()` - Get save state size
- `_saveState()` - Create save state
- `_loadState(ptr, size)` - Load save state

### Architecture Decisions

#### 1. Interface-First Design
Following the project's "holy texts", we created comprehensive TypeScript interfaces before implementation:
- `Snes9xWasmModule` - Main WASM module interface
- `EmscriptenModule` - Base Emscripten functionality
- Helper types and constants for buttons, buffers

#### 2. Documentation Standards
Every interface member has:
- JSDoc comments explaining purpose
- Parameter descriptions
- Return value descriptions
- Code examples demonstrating usage
- Notes about memory management

#### 3. Type Safety
- No `any` types used
- All parameters and returns are strongly typed
- Helper utilities provide safe memory operations
- Constants use `as const` for literal types

### Files Created

1. **`src/core/types/Snes9xWasmModule.ts`** (20KB)
   - Complete TypeScript interface for WASM module
   - Memory view types (HEAP8, HEAPU8, HEAP16, etc.)
   - All exported function signatures
   - Helper utilities and constants
   - ~600 lines of code + documentation

2. **`src/core/types/index.ts`**
   - Barrel export for clean imports
   - Re-exports all types and constants

3. **`docs/MCP_USAGE_GUIDE.md`** (this file)
   - Documentation of development process
   - Tool usage patterns
   - Key findings and decisions

### Best Practices Identified

#### Code Organization
- Place type definitions in dedicated `types/` subdirectories
- Use barrel exports (`index.ts`) for clean imports
- Group related types and constants together

#### Documentation
- Start JSDoc with a brief one-liner
- Follow with detailed explanation
- Include `@param`, `@returns`, `@throws` tags
- Always provide `@example` for complex APIs
- Document memory management requirements

#### Type Definitions
- Use interfaces over type aliases for object shapes
- Use `as const` for constant objects
- Provide helper utilities alongside raw types
- Create semantic type aliases (e.g., `SnesButtonState`)

#### Memory Safety
- Document which functions allocate memory
- Document which functions free memory
- Provide helper functions that handle allocation/deallocation
- Use TypeScript to prevent common memory errors

### Next Steps

The interfaces created in this session will be used for:
1. **SNES-004**: Create Mock WASM Module (for testing)
2. **SNES-006**: Implement Core Initialization
3. **SNES-007**: Implement ROM Loading
4. Future implementation of `Snes9xWasmCore` class

### Lessons Learned

1. **Read the C source first**: Understanding the actual C implementation is critical before creating TypeScript bindings

2. **Document memory management**: WASM memory management is error-prone; clear documentation prevents leaks

3. **Provide examples**: Complex APIs benefit greatly from concrete usage examples in JSDoc

4. **Use constants**: Magic numbers (buffer sizes, button masks) should be named constants

5. **Think about ergonomics**: Helper functions make raw WASM APIs more JavaScript-friendly

### Tool Recommendations

For similar tasks in the future:

**Essential:**
- `filesystem-read_text_file` - Reading source code
- `bash` with grep/find - Searching for patterns
- `npm run build` - Validating TypeScript

**Helpful:**
- `view` - Quick directory structure overview
- `bash` with cat/heredoc - Creating files with complex content

**Would be useful:**
- `grep` tool (native MCP tool) - Faster than bash grep for code search
- TypeScript language server integration - Real-time type checking

### Project Alignment

This work aligns with the project's core principles:

✅ **Interface-First Design**: Defined complete interfaces before implementation

✅ **Separation of Concerns**: Types in dedicated `types/` directory

✅ **Browser-First APIs**: Types map directly to WASM browser APIs

✅ **Self-Documenting Code**: Extensive JSDoc makes missing features obvious

✅ **No Implicit Any**: Strict typing throughout

### Acceptance Criteria Status

From SNES-003 task requirements:

- [x] All interfaces defined and exported
- [x] TypeScript compiles without errors
- [x] JSDoc comments complete
- [x] Matches actual WASM exports (verified against exports.c)
- [x] No `any` types used
- [x] Documentation updated (this guide created)

### Time Tracking

**Estimated**: 3 hours
**Actual**: ~2 hours

Tasks breakdown:
- Analysis of exports.c and WASM module: 30 minutes
- Interface definition: 60 minutes
- Documentation and examples: 20 minutes
- Validation and testing: 10 minutes

## Future Additions

This guide should be updated after each significant development session to track:
- New tools discovered
- Patterns that work well
- Patterns to avoid
- Integration insights
- Performance considerations

---

**Last Updated**: 2026-01-05
**Contributors**: GitHub Copilot (AI Agent)
