#!/bin/bash

# Emscripten Setup Verification Script
# This script verifies that Emscripten is correctly installed and configured

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_section() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Create temp directory for tests
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cd "$TEMP_DIR"

# Section 1: Check Emscripten Installation
print_section "1. Checking Emscripten Installation"

if command -v emcc &> /dev/null; then
    print_success "emcc command found"
else
    print_error "emcc command not found"
    print_info "Please install Emscripten. See docs/EMSCRIPTEN_SETUP.md"
    exit 1
fi

# Section 2: Check Version
print_section "2. Checking Emscripten Version"

EMCC_VERSION=$(emcc --version | head -n 1)
echo "Installed version: $EMCC_VERSION"

if echo "$EMCC_VERSION" | grep -q "3.1.51"; then
    print_success "Correct version (3.1.51) installed"
else
    print_error "Version mismatch - Expected 3.1.51"
    print_info "Run: cd ~/emsdk && ./emsdk install 3.1.51 && ./emsdk activate 3.1.51"
fi

# Section 3: Check Node.js
print_section "3. Checking Node.js"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found"
    print_info "Please install Node.js to run WebAssembly output"
fi

# Section 4: Test C Compilation
print_section "4. Testing C Compilation"

echo "Creating test.c..."
cat > test.c << 'EOF'
#include <stdio.h>

int main() {
    printf("Hello from C!\n");
    return 0;
}
EOF

print_info "Compiling test.c..."
if emcc test.c -o test.js 2>/dev/null; then
    print_success "C compilation successful"
    
    if [ -f test.js ]; then
        print_success "Generated test.js"
    else
        print_error "test.js not generated"
    fi
    
    if [ -f test.wasm ]; then
        print_success "Generated test.wasm"
    else
        print_error "test.wasm not generated"
    fi
    
    # Run the compiled code
    if command -v node &> /dev/null; then
        print_info "Running compiled code..."
        OUTPUT=$(node test.js 2>&1)
        if echo "$OUTPUT" | grep -q "Hello from C!"; then
            print_success "C code executed successfully"
        else
            print_error "C code execution failed"
            echo "Output: $OUTPUT"
        fi
    fi
else
    print_error "C compilation failed"
fi

# Section 5: Test C++ Compilation
print_section "5. Testing C++ Compilation"

echo "Creating test.cpp..."
cat > test.cpp << 'EOF'
#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
EOF

print_info "Compiling test.cpp..."
if em++ test.cpp -o test-cpp.js 2>/dev/null; then
    print_success "C++ compilation successful"
    
    if [ -f test-cpp.js ]; then
        print_success "Generated test-cpp.js"
    else
        print_error "test-cpp.js not generated"
    fi
    
    if [ -f test-cpp.wasm ]; then
        print_success "Generated test-cpp.wasm"
    else
        print_error "test-cpp.wasm not generated"
    fi
    
    # Run the compiled code
    if command -v node &> /dev/null; then
        print_info "Running compiled C++ code..."
        OUTPUT=$(node test-cpp.js 2>&1)
        if echo "$OUTPUT" | grep -q "Hello from C++!"; then
            print_success "C++ code executed successfully"
        else
            print_error "C++ code execution failed"
            echo "Output: $OUTPUT"
        fi
    fi
else
    print_error "C++ compilation failed"
fi

# Section 6: Test Optimization Levels
print_section "6. Testing Optimization Levels"

echo "Creating optimized.c..."
cat > optimized.c << 'EOF'
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    return factorial(5) == 120 ? 0 : 1;
}
EOF

for OPT in O0 O1 O2 O3 Os; do
    print_info "Testing -$OPT..."
    if emcc optimized.c -$OPT -o optimized-$OPT.js 2>/dev/null; then
        SIZE=$(wc -c < "optimized-$OPT.wasm")
        print_success "-$OPT compilation successful (WASM size: $SIZE bytes)"
    else
        print_error "-$OPT compilation failed"
    fi
done

# Section 7: Test WASM-specific flags
print_section "7. Testing WASM-specific Flags"

echo "Creating wasm-test.c..."
cat > wasm-test.c << 'EOF'
#include <stdlib.h>

int* create_array(int size) {
    return (int*)malloc(size * sizeof(int));
}

void free_array(int* arr) {
    free(arr);
}

int main() {
    int* arr = create_array(100);
    if (arr) {
        free_array(arr);
        return 0;
    }
    return 1;
}
EOF

print_info "Testing ALLOW_MEMORY_GROWTH..."
if emcc wasm-test.c -s ALLOW_MEMORY_GROWTH=1 -o wasm-test.js 2>/dev/null; then
    print_success "ALLOW_MEMORY_GROWTH flag works"
    if command -v node &> /dev/null; then
        if node wasm-test.js &> /dev/null; then
            print_success "Memory growth test passed"
        else
            print_error "Memory growth test failed"
        fi
    fi
else
    print_error "ALLOW_MEMORY_GROWTH flag failed"
fi

# Section 8: Test Exported Functions
print_section "8. Testing Exported Functions"

echo "Creating export-test.c..."
cat > export-test.c << 'EOF'
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
    return a + b;
}

int main() {
    return 0;
}
EOF

print_info "Testing function export..."
if emcc export-test.c \
    -s EXPORTED_FUNCTIONS='["_add","_main"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -o export-test.js 2>/dev/null; then
    print_success "Function export compilation successful"
else
    print_error "Function export compilation failed"
fi

# Section 9: Environment Check
print_section "9. Environment Variables"

if [ -n "$EMSDK" ]; then
    print_success "EMSDK environment variable set: $EMSDK"
else
    print_error "EMSDK environment variable not set"
    print_info "Run: source ~/emsdk/emsdk_env.sh"
fi

if [ -n "$EM_CONFIG" ]; then
    print_info "EM_CONFIG: $EM_CONFIG"
fi

if [ -n "$EM_CACHE" ]; then
    print_info "EM_CACHE: $EM_CACHE"
fi

# Section 10: Summary
print_section "Summary"

echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo "Emscripten is correctly installed and configured."
    echo ""
    echo "Next steps:"
    echo "  1. Build the snes9x2005-wasm core:"
    echo "     cd public/snes/core/snes9x2005-wasm-master && ./build.sh"
    echo ""
    echo "  2. Build the project:"
    echo "     npm install && npm run build"
    echo ""
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo "Please review the errors above and consult docs/EMSCRIPTEN_SETUP.md"
    echo ""
    exit 1
fi
