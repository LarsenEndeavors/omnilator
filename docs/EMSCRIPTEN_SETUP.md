# Emscripten Build Environment Setup

This guide provides instructions for setting up the Emscripten SDK to build WebAssembly modules for the Omnilator project.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation Methods](#installation-methods)
4. [Verification](#verification)
5. [Usage](#usage)
6. [Troubleshooting](#troubleshooting)
7. [CI/CD Integration](#cicd-integration)

---

## Overview

Emscripten is a complete compiler toolchain for WebAssembly. It allows you to compile C and C++ code to WebAssembly, which can run in web browsers at near-native speed.

**Required Version:** 3.1.51

This specific version is chosen for compatibility with the snes9x2005-wasm core that Omnilator uses.

---

## Prerequisites

Before installing Emscripten, ensure you have:

- **Git**: For cloning the Emscripten SDK repository
- **Python**: 3.6 or later
- **CMake**: 3.13 or later (optional, for building from source)
- **Node.js**: 14.x or later (for running WASM output)
- **Unix-like environment**: Linux, macOS, or Windows with WSL2

### System Requirements

- **Disk Space**: ~2 GB for SDK and tools
- **Memory**: 4 GB RAM minimum, 8 GB recommended
- **Internet**: Required for initial download

---

## Installation Methods

### Method 1: Using emsdk (Recommended)

This is the official and easiest way to install Emscripten.

#### Step 1: Clone the emsdk repository

```bash
# Clone to your home directory or preferred location
cd ~
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
```

#### Step 2: Install version 3.1.51

```bash
# Download and install SDK version 3.1.51
./emsdk install 3.1.51

# Make it the active version
./emsdk activate 3.1.51

# Add Emscripten to your PATH for current session
source ./emsdk_env.sh
```

#### Step 3: Make it permanent (Optional)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Add this line to your shell profile
source "$HOME/emsdk/emsdk_env.sh" > /dev/null
```

Then reload your shell:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### Method 2: Using Package Managers

#### On Ubuntu/Debian:

```bash
# Note: Package managers may not have version 3.1.51
# Use Method 1 for specific version

sudo apt update
sudo apt install emscripten
```

#### On macOS (Homebrew):

```bash
# Note: This may not install version 3.1.51
# Use Method 1 for specific version

brew install emscripten
```

#### On Windows:

1. Install Windows Subsystem for Linux (WSL2)
2. Follow the Linux instructions above within WSL2

### Method 3: Docker (Isolated Environment)

For a completely isolated environment:

```bash
# Using official Emscripten Docker image
docker pull emscripten/emsdk:3.1.51

# Run with your project mounted
docker run -v $(pwd):/src emscripten/emsdk:3.1.51 emcc --version
```

---

## Verification

After installation, verify Emscripten is working correctly:

### Check Version

```bash
emcc --version
```

**Expected Output:**

```
emcc (Emscripten gcc/clang-like replacement) 3.1.51 (d690d0125b09b67ab3f4d4c31b6f7690b4a4cf98)
Copyright (C) 2014 the Emscripten authors (see AUTHORS.txt)
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

### Test C Compilation

Create a simple test file:

```bash
echo 'int main() { return 0; }' > test.c
emcc test.c -o test.js
node test.js
echo $?  # Should output 0
```

**Expected Result:** No errors, exit code 0

### Test C++ Compilation

```bash
cat > test.cpp << 'EOF'
#include <iostream>

int main() {
    std::cout << "Hello from WebAssembly!" << std::endl;
    return 0;
}
EOF

em++ test.cpp -o test.js
node test.js
```

**Expected Output:**

```
Hello from WebAssembly!
```

### Run Test Script

The project includes a verification script:

```bash
cd /path/to/omnilator
./scripts/verify-emscripten.sh
```

---

## Usage

### Basic Compilation

**Compile C to JavaScript:**

```bash
emcc source.c -o output.js
```

**Compile C++ to JavaScript:**

```bash
em++ source.cpp -o output.js
```

**Compile with optimization:**

```bash
emcc source.c -O3 -o output.js
```

### Common Emscripten Flags

- `-O0` - No optimization (fast compile, slow runtime)
- `-O1` - Basic optimization
- `-O2` - More optimization
- `-O3` - Maximum optimization (recommended for production)
- `-Os` - Optimize for size
- `-s WASM=1` - Generate WebAssembly (default in modern versions)
- `-s ALLOW_MEMORY_GROWTH=1` - Allow memory to grow at runtime
- `-s EXPORTED_FUNCTIONS='["_main","_myFunc"]'` - Export specific functions
- `-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'` - Export runtime helpers

### Building snes9x2005-wasm

To build the SNES core for Omnilator:

```bash
cd public/snes/core/snes9x2005-wasm-master
chmod +x build.sh
./build.sh
```

The build script will:
1. Compile the C source files
2. Generate `snes9x_2005.js` (JavaScript glue code)
3. Generate `snes9x_2005.wasm` (WebAssembly binary)

---

## Troubleshooting

### Problem: `emcc: command not found`

**Solution:**

```bash
# Source the environment script
source ~/emsdk/emsdk_env.sh

# Or add to your shell profile permanently
echo 'source "$HOME/emsdk/emsdk_env.sh" > /dev/null' >> ~/.bashrc
source ~/.bashrc
```

### Problem: Wrong version installed

**Solution:**

```bash
cd ~/emsdk
./emsdk list  # List available versions
./emsdk install 3.1.51
./emsdk activate 3.1.51
source ./emsdk_env.sh
```

### Problem: Compilation errors with memory

**Solution:**

Add memory growth flag:

```bash
emcc source.c -s ALLOW_MEMORY_GROWTH=1 -o output.js
```

### Problem: Missing Node.js

Emscripten requires Node.js to run generated JavaScript:

```bash
# Ubuntu/Debian
sudo apt install nodejs npm

# macOS
brew install node

# Or download from https://nodejs.org/
```

### Problem: Python version too old

Emscripten requires Python 3.6+:

```bash
# Check version
python --version

# Ubuntu/Debian
sudo apt install python3 python3-pip

# macOS
brew install python3
```

### Problem: Build fails in CI

Check:
1. GitHub Actions workflow uses correct version
2. Cache is properly configured
3. All dependencies are installed

See `.github/workflows/emscripten-build.yml` for reference.

---

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow that automatically sets up Emscripten.

**File:** `.github/workflows/emscripten-build.yml`

Key features:
- Installs Emscripten 3.1.51 automatically
- Caches the SDK for faster builds
- Verifies installation
- Tests compilation
- Runs project build and tests

**Usage:**

The workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual trigger via GitHub Actions UI

### Other CI Systems

#### GitLab CI

```yaml
emscripten-build:
  image: emscripten/emsdk:3.1.51
  script:
    - emcc --version
    - emcc test.c -o test.js
    - node test.js
```

#### CircleCI

```yaml
version: 2.1
jobs:
  build:
    docker:
      - image: emscripten/emsdk:3.1.51
    steps:
      - checkout
      - run: emcc --version
      - run: npm ci && npm run build
```

---

## Advanced Configuration

### Environment Variables

Customize Emscripten behavior:

```bash
# Set custom cache directory
export EM_CACHE=/path/to/cache

# Set custom config file
export EM_CONFIG=/path/to/.emscripten

# Enable verbose output
export EMCC_DEBUG=1
```

### Custom Build Flags

For the project, you can customize build flags in `scripts/build-wasm.sh`:

```bash
#!/bin/bash
emcc source.c \
  -O3 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_main","_run_frame"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -o output.js
```

---

## Resources

### Official Documentation

- **Emscripten Site**: https://emscripten.org/
- **Documentation**: https://emscripten.org/docs/
- **API Reference**: https://emscripten.org/docs/api_reference/
- **Porting Guide**: https://emscripten.org/docs/porting/

### Tutorials

- [Getting Started](https://emscripten.org/docs/getting_started/)
- [Compiling C/C++ to WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly/C_to_wasm)
- [Emscripten and npm](https://emscripten.org/docs/tools_reference/emcc.html)

### Project-Specific

- **Implementation Plan**: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`
- **Task Breakdown**: `docs/TASK_BREAKDOWN.md`
- **Project Roadmap**: `docs/PROJECT_ROADMAP.md`

---

## Quick Reference

### Common Commands

```bash
# Check version
emcc --version

# Compile C
emcc source.c -o output.js

# Compile C++
em++ source.cpp -o output.js

# Optimize for production
emcc source.c -O3 -o output.js

# Debug build
emcc source.c -g -o output.js

# List SDK versions
cd ~/emsdk && ./emsdk list

# Update SDK
cd ~/emsdk && git pull && ./emsdk install latest
```

### File Extensions

- `.c` - C source
- `.cpp` / `.cc` / `.cxx` - C++ source
- `.h` / `.hpp` - Headers
- `.wasm` - WebAssembly binary
- `.js` - JavaScript glue code
- `.bc` - LLVM bitcode (intermediate)

---

## Maintenance

### Updating Emscripten

To update to a newer version:

```bash
cd ~/emsdk

# Update emsdk itself
git pull

# Install new version
./emsdk install 3.1.52  # or desired version
./emsdk activate 3.1.52
source ./emsdk_env.sh
```

**Note:** Always test thoroughly when updating, as API changes may occur.

### Cleaning Cache

If you encounter persistent build issues:

```bash
# Clear Emscripten cache
emcc --clear-cache

# Or manually
rm -rf ~/.emscripten_cache
```

---

## License

Emscripten is licensed under the MIT License.

---

## Support

For issues specific to:
- **Emscripten**: https://github.com/emscripten-core/emscripten/issues
- **This project**: Open an issue in the Omnilator repository

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-28  
**Maintained By**: Omnilator Development Team
