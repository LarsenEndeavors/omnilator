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
