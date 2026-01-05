# snes9x2005-wasm Build Guide

This guide provides step-by-step instructions for building the snes9x2005-wasm emulator core from source.

## Overview

The snes9x2005-wasm is a WebAssembly port of the snes9x2005 SNES emulator core. It's compiled using Emscripten to produce:
- `snes9x_2005.js` - JavaScript glue code (~15KB)
- `snes9x_2005.wasm` - WebAssembly binary (~600KB)

## Prerequisites

### Required Software

1. **Node.js** (20.x or later)
   - Included with the project via Emscripten SDK

2. **Emscripten SDK** (3.1.51)
   - Required for WebAssembly compilation
   - See installation steps below

3. **Git**
   - For cloning repositories

### System Requirements

- **Operating System**: Linux, macOS, or WSL on Windows
- **Disk Space**: ~500MB for Emscripten SDK
- **Memory**: 2GB RAM minimum
- **Internet**: Required for initial SDK download

## Quick Start

If you just want to build without understanding the details:

```bash
# From repository root
cd /path/to/omnilator

# Run automated build script
./scripts/build-wasm.sh
```

This script handles everything automatically. For manual steps, continue reading.

## Manual Build Process

### Step 1: Clone Emscripten SDK

If not already present in your repository:

```bash
# From repository root
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
```

**Note**: The `emsdk` directory is gitignored and should not be committed.

### Step 2: Install Emscripten 3.1.51

```bash
# From emsdk directory
./emsdk install 3.1.51
```

**Expected output**:
```
Resolving SDK version '3.1.51' to 'sdk-releases-...'
Downloading: ...
Installing tool 'releases-...'
Done installing SDK 'sdk-releases-...'
```

**Time**: ~5-10 minutes (downloads ~270MB)

### Step 3: Activate Emscripten

```bash
./emsdk activate 3.1.51
```

**Expected output**:
```
Setting the following tools as active:
   node-22.16.0-64bit
   releases-...-64bit
```

### Step 4: Set Up Environment

```bash
source ./emsdk_env.sh
```

**Important**: This must be done in **every new terminal session** before building.

**Expected output**:
```
Setting up EMSDK environment
Adding directories to PATH:
PATH += /path/to/emsdk
PATH += /path/to/emsdk/upstream/emscripten
```

### Step 5: Verify Installation

```bash
emcc --version
```

**Expected output**:
```
emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.51
```

If you see this, Emscripten is correctly installed and activated.

### Step 6: Navigate to Build Directory

```bash
cd /path/to/omnilator/public/snes/core/snes9x2005-wasm-master
```

### Step 7: Run Build Script

```bash
bash build.sh
```

**Build script contents**:
```bash
#!/bin/bash
cd `dirname $0`
emcc -O3 -s WASM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s ALLOW_MEMORY_GROWTH=1 source/*.c -o snes9x_2005.js
```

**Expected warnings** (these are OK):
```
warning: 'MIN' macro redefined
warning: EXTRA_EXPORTED_RUNTIME_METHODS is deprecated
```

**Time**: ~30-60 seconds

### Step 8: Verify Build Output

```bash
ls -lh snes9x_2005.*
```

**Expected output**:
```
-rw-r--r--  15K  snes9x_2005.js
-rwxr-xr-x 600K  snes9x_2005.wasm
```

✅ **Success indicators**:
- Both files exist
- `snes9x_2005.js` is ~15KB (10-20KB range is OK)
- `snes9x_2005.wasm` is ~600KB (500-800KB range is OK)
- No fatal errors in build output

### Step 9: Copy to Core Directory

```bash
cp snes9x_2005.js ../
cp snes9x_2005.wasm ../
```

This makes the files available at `public/snes/core/` for the application.

## Build Flags Explained

The build script uses these Emscripten flags:

| Flag | Purpose |
|------|---------|
| `-O3` | Maximum optimization for performance |
| `-s WASM=1` | Output WebAssembly instead of asm.js |
| `-s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'` | Export cwrap function for C bindings |
| `-s ALLOW_MEMORY_GROWTH=1` | Allow WASM memory to grow dynamically |
| `source/*.c` | Compile all C source files |
| `-o snes9x_2005.js` | Output filename (WASM file auto-generated) |

## Reproducible Builds

The build process is deterministic - building twice produces identical outputs.

**Verify reproducibility**:

```bash
# First build
bash build.sh
mv snes9x_2005.js snes9x_2005.js.orig
mv snes9x_2005.wasm snes9x_2005.wasm.orig

# Second build
bash build.sh

# Compare
diff snes9x_2005.js snes9x_2005.js.orig && echo "JS identical"
diff snes9x_2005.wasm snes9x_2005.wasm.orig && echo "WASM identical"
```

Both comparisons should show files are identical.

## Troubleshooting

### Problem: `emcc: command not found`

**Cause**: Emscripten environment not activated

**Solution**:
```bash
cd /path/to/emsdk
source ./emsdk_env.sh
emcc --version  # Verify
```

### Problem: `No such file or directory: source/*.c`

**Cause**: Running build from wrong directory

**Solution**:
```bash
cd public/snes/core/snes9x2005-wasm-master
pwd  # Should show .../snes9x2005-wasm-master
bash build.sh
```

### Problem: Build fails with memory error

**Cause**: Insufficient system memory

**Solution**:
- Close other applications
- Increase available RAM
- Try without `-O3` optimization (edit build.sh)

### Problem: Wrong Emscripten version

**Cause**: Different version activated

**Solution**:
```bash
cd /path/to/emsdk
./emsdk activate 3.1.51
source ./emsdk_env.sh
```

### Problem: Build succeeds but files are wrong size

**Cause**: Partial build or corrupt download

**Solution**:
```bash
# Clean and rebuild
rm snes9x_2005.*
bash build.sh
```

## Clean Build

To start fresh:

```bash
cd public/snes/core/snes9x2005-wasm-master
rm -f snes9x_2005.js snes9x_2005.wasm
bash build.sh
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build WASM Core

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Cache Emscripten
      uses: actions/cache@v3
      with:
        path: emsdk
        key: emsdk-3.1.51-${{ runner.os }}
    
    - name: Install Emscripten
      run: |
        if [ ! -d "emsdk" ]; then
          git clone https://github.com/emscripten-core/emsdk.git
          cd emsdk
          ./emsdk install 3.1.51
          ./emsdk activate 3.1.51
        fi
    
    - name: Build WASM
      run: |
        source emsdk/emsdk_env.sh
        cd public/snes/core/snes9x2005-wasm-master
        bash build.sh
    
    - name: Verify Build
      run: |
        ls -lh public/snes/core/snes9x2005-wasm-master/snes9x_2005.*
        test -f public/snes/core/snes9x2005-wasm-master/snes9x_2005.js
        test -f public/snes/core/snes9x2005-wasm-master/snes9x_2005.wasm
    
    - name: Upload Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: snes9x-wasm
        path: |
          public/snes/core/snes9x2005-wasm-master/snes9x_2005.js
          public/snes/core/snes9x2005-wasm-master/snes9x_2005.wasm
```

## Automated Build Script

Create `scripts/build-wasm.sh`:

```bash
#!/bin/bash
set -e  # Exit on any error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Building snes9x2005-wasm ==="

# Step 1: Install Emscripten if needed
if [ ! -d "$REPO_ROOT/emsdk" ]; then
    echo "Installing Emscripten SDK..."
    cd "$REPO_ROOT"
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    ./emsdk install 3.1.51
    ./emsdk activate 3.1.51
else
    echo "Emscripten SDK already installed"
fi

# Step 2: Source environment
echo "Setting up Emscripten environment..."
source "$REPO_ROOT/emsdk/emsdk_env.sh"

# Step 3: Verify emcc
echo "Verifying Emscripten installation..."
emcc --version || {
    echo "ERROR: emcc not found after sourcing environment"
    exit 1
}

# Step 4: Build
echo "Building WASM module..."
cd "$REPO_ROOT/public/snes/core/snes9x2005-wasm-master"
bash build.sh || {
    echo "ERROR: Build failed"
    exit 1
}

# Step 5: Verify outputs
echo "Verifying build outputs..."
if [ ! -f "snes9x_2005.js" ]; then
    echo "ERROR: snes9x_2005.js not found"
    exit 1
fi

if [ ! -f "snes9x_2005.wasm" ]; then
    echo "ERROR: snes9x_2005.wasm not found"
    exit 1
fi

# Step 6: Copy to core directory
echo "Copying files to core directory..."
cp snes9x_2005.js ../
cp snes9x_2005.wasm ../

# Step 7: Success
echo "=== Build Successful ==="
echo "Files created:"
ls -lh snes9x_2005.js snes9x_2005.wasm
echo ""
echo "Files copied to: public/snes/core/"
```

Make it executable:
```bash
chmod +x scripts/build-wasm.sh
```

## File Sizes Reference

For verification, these are the expected file sizes:

| File | Size | Notes |
|------|------|-------|
| `snes9x_2005.js` | ~15KB | JavaScript glue code |
| `snes9x_2005.wasm` | ~600KB | WebAssembly binary |

**Variation**: ±10% size difference is normal across different builds or platforms.

## Performance Characteristics

After building, the WASM module should provide:

- **Emulation Speed**: 60 FPS (full speed) on modern hardware
- **Load Time**: <100ms for WASM module initialization
- **Memory Usage**: ~5-10MB during emulation
- **Audio Latency**: <50ms with WebAudio

## Next Steps

After building snes9x2005-wasm:

1. **Integrate with Core**: Update `src/core/Snes9xWasmCore.ts` to load the built module
2. **Test with ROMs**: Load actual SNES ROM files and verify emulation
3. **Update Documentation**: Mark task [SNES-002] as complete
4. **Continue Development**: Move to next task in implementation plan

## Resources

- **Emscripten Documentation**: https://emscripten.org/docs/
- **snes9x2005 Source**: https://github.com/libretro/snes9x2005
- **WebAssembly Spec**: https://webassembly.org/
- **Task Breakdown**: `docs/TASK_BREAKDOWN.md`
- **Implementation Plan**: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`

## Getting Help

If you encounter issues not covered in this guide:

1. Check the Troubleshooting section
2. Review `docs/EMSCRIPTEN_SETUP.md` for detailed Emscripten help
3. Consult `docs/MCP_TOOLS_USAGE.md` for automation patterns
4. Open an issue on GitHub with:
   - Your operating system
   - Emscripten version (`emcc --version`)
   - Complete error output
   - Steps to reproduce

---

**Last Updated**: 2026-01-05  
**Status**: ✅ Verified Working  
**Related Tasks**: [SNES-002]
