# MCP Tools Usage Guide

This document provides a reference for using Model Context Protocol (MCP) tools in the Omnilator project, specifically demonstrated through the snes9x2005-wasm build process.

## Overview

MCP (Model Context Protocol) tools enable AI agents to interact with various services and systems. This project uses several MCP servers to automate development tasks.

## Available MCP Servers

The project is configured with the following MCP servers (see `mcp-config.json`):

### 1. **filesystem** - File System Operations
- **Type**: stdio
- **Purpose**: Read, write, and manage files in the repository
- **Common Operations**:
  - Reading files: `filesystem-read_text_file`
  - Writing files: `filesystem-write_file`
  - Listing directories: `filesystem-list_directory`
  - Creating directories: `filesystem-create_directory`

### 2. **bash** - Command Execution
- **Type**: stdio  
- **Purpose**: Execute shell commands with various modes (sync, async, detached)
- **Key Features**:
  - **Sync mode**: Wait for command completion with configurable timeout
  - **Async mode**: Start command and poll for results
  - **Detached mode**: Background processes that persist
  - Session management for interactive commands

### 3. **github** - GitHub API Integration
- **Type**: stdio
- **Purpose**: Interact with GitHub repositories, issues, and PRs
- **Common Operations**:
  - Reading repository information
  - Managing issues and pull requests
  - Searching code and repositories

### 4. **playwright** - Browser Automation
- **Type**: stdio
- **Purpose**: Automated browser testing and interaction
- **Use Cases**:
  - UI testing
  - Screenshot capture
  - Web scraping

### 5. **sequential-thinking** - Structured Problem Solving
- **Type**: stdio
- **Purpose**: Break down complex problems into sequential steps
- **Use Cases**:
  - Planning implementations
  - Debugging complex issues
  - Architecture decisions

### 6. **context7** - Documentation Search
- **Type**: http
- **Purpose**: Search library documentation and code examples
- **Use Cases**:
  - Finding API documentation
  - Locating code examples
  - Learning library usage patterns

### 7. **mcp-docs** - MCP Protocol Documentation
- **Type**: http
- **Purpose**: Access Model Context Protocol documentation
- **Use Cases**:
  - Understanding MCP concepts
  - Learning protocol specifications

## Case Study: Building snes9x2005-wasm

This section demonstrates how MCP tools were used to build snes9x2005-wasm from source, fulfilling task [SNES-002].

### Step 1: Repository Exploration

**Tools Used**: `filesystem-read_text_file`, `view`, `bash`

```
1. Read documentation files to understand requirements
   - filesystem-read_text_file: docs/SNES9XWASM_IMPLEMENTATION_PLAN.md
   - filesystem-read_text_file: docs/TASK_BREAKDOWN.md
   - filesystem-read_text_file: package.json

2. Explore directory structure
   - view: /home/runner/work/omnilator/omnilator/public
   - view: /home/runner/work/omnilator/omnilator/public/snes

3. Check current git status
   - bash: git status
   - bash: git log --oneline -20
```

**Key Learnings**:
- Task requires building snes9x2005-wasm using Emscripten
- Source files located in `public/snes/core/snes9x2005-wasm-master/`
- Build script is `build.sh` requiring Emscripten SDK version 3.1.51

### Step 2: Check Prerequisites

**Tools Used**: `bash`, `filesystem-read_text_file`

```bash
# Check if Emscripten is installed
bash: which emcc || echo "Emscripten not found in PATH"

# Read build script to understand requirements
filesystem-read_text_file: public/snes/core/snes9x2005-wasm-master/build.sh
```

**Result**: Emscripten was not installed, needed to proceed with installation.

### Step 3: Install Emscripten SDK

**Tools Used**: `bash` (sync mode with extended wait time)

```bash
# Clone Emscripten SDK
bash:
  command: git clone https://github.com/emscripten-core/emsdk.git
  mode: sync
  initial_wait: 30

# Install specific version
bash:
  command: cd emsdk && ./emsdk install 3.1.51
  mode: sync
  initial_wait: 120  # Long-running download

# Activate version
bash:
  command: cd emsdk && ./emsdk activate 3.1.51
  mode: sync
  initial_wait: 10
```

**Key Points**:
- Used **sync mode** for sequential operations
- Adjusted `initial_wait` based on expected duration:
  - Git clone: 30 seconds
  - Download/install: 120 seconds (large download)
  - Activation: 10 seconds
- Each command depends on previous success

### Step 4: Verify Installation

**Tools Used**: `bash` with environment sourcing

```bash
# Source environment and verify
bash:
  command: source emsdk/emsdk_env.sh && emcc --version
  mode: sync
  initial_wait: 10
```

**Result**: 
```
emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.51
```

**Key Points**:
- Environment variables must be set in same shell as subsequent commands
- Used `source` to load environment, then verified in one command
- This is a **sync mode** pattern for environment-dependent operations

### Step 5: Build snes9x2005-wasm

**Tools Used**: `bash` (sync mode with extended wait)

```bash
# Build the WASM module
bash:
  command: source emsdk/emsdk_env.sh && cd public/snes/core/snes9x2005-wasm-master && bash build.sh
  mode: sync
  initial_wait: 120  # Compilation can take time
```

**Build Script Contents**:
```bash
#!/bin/bash
cd `dirname $0`
emcc -O3 -s WASM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s ALLOW_MEMORY_GROWTH=1 source/*.c -o snes9x_2005.js
```

**Result**: Successfully built with minor warnings (expected):
- `snes9x_2005.js`: 15KB
- `snes9x_2005.wasm`: 600KB

**Key Points**:
- Combined environment sourcing with build command
- Used long `initial_wait` for C compilation
- Warnings are acceptable (macro redefinition, deprecated flag)

### Step 6: Verify Build Outputs

**Tools Used**: `bash`

```bash
# Check files and sizes
bash:
  command: ls -lh public/snes/core/snes9x2005-wasm-master/snes9x_2005.*
  mode: sync
  initial_wait: 5
```

**Verification Checklist**:
- ✅ `snes9x_2005.js` exists (15KB - within expected range)
- ✅ `snes9x_2005.wasm` exists (600KB - within expected range)
- ✅ Both files have correct permissions

### Step 7: Test Reproducibility

**Tools Used**: `bash` (multiple commands)

```bash
# Save first build
bash: mv snes9x_2005.js snes9x_2005.js.orig && mv snes9x_2005.wasm snes9x_2005.wasm.orig

# Build again
bash: source emsdk/emsdk_env.sh && bash build.sh

# Compare outputs
bash: diff snes9x_2005.js snes9x_2005.js.orig && diff snes9x_2005.wasm snes9x_2005.wasm.orig
```

**Result**: Both builds produced **identical files** - build is fully reproducible ✅

### Step 8: Copy Build Artifacts

**Tools Used**: `bash`, `create` (for documentation)

```bash
# Copy built files to accessible location
bash: cp snes9x_2005.js public/snes/core/
bash: cp snes9x_2005.wasm public/snes/core/

# Create documentation
create: docs/MCP_TOOLS_USAGE.md
```

### Step 9: Update Documentation

**Tools Used**: `edit`, `filesystem-read_text_file`

Updated the following documents:
- `docs/BUILD_SNES9X_GUIDE.md` - Added complete build instructions
- `docs/EMSCRIPTEN_SETUP.md` - Verified setup instructions match actual process

## MCP Tool Best Practices

### 1. Bash Tool Usage Patterns

#### Pattern: Sequential Dependencies
When commands depend on each other's success:

```bash
bash:
  command: step1 && step2 && step3
  mode: sync
  initial_wait: <appropriate-time>
```

#### Pattern: Environment Setup
When environment variables are needed:

```bash
bash:
  command: source env_setup.sh && actual_command
  mode: sync
```

#### Pattern: Long-Running Operations
For compilation, downloads, or slow operations:

```bash
bash:
  command: long_running_build_command
  mode: sync
  initial_wait: 120  # or more if needed
```

If command exceeds initial_wait:
```bash
# Follow up with read_bash
read_bash:
  sessionId: <from-previous-call>
  delay: 30
```

#### Pattern: Interactive Tools
For tools requiring user input:

```bash
# Start interactive session
bash:
  command: interactive_tool
  mode: async

# Send input
write_bash:
  sessionId: <from-async-start>
  input: "user_response{enter}"
  delay: 10
```

### 2. Filesystem Tool Patterns

#### Pattern: Read Before Write
Always read existing files before modifying:

```
1. filesystem-read_text_file: path/to/file
2. Process/modify content
3. filesystem-write_file: path/to/file
```

#### Pattern: Parallel Reads
Read multiple independent files simultaneously:

```
filesystem-read_multiple_files:
  paths: [file1.txt, file2.txt, file3.txt]
```

#### Pattern: Safe Directory Operations
Create parent directories before files:

```
1. filesystem-create_directory: path/to/parent/dir
2. filesystem-write_file: path/to/parent/dir/file.txt
```

### 3. Sequential Thinking Pattern

For complex tasks, use sequential-thinking to plan:

```
sequential-thinking:
  thought: "Analyzing build requirements..."
  thoughtNumber: 1
  totalThoughts: 5
  nextThoughtNeeded: true

# Continue thinking through all aspects
# Generate hypothesis
# Verify approach
# Provide final answer
```

### 4. Error Handling

Always check command success:

```bash
bash:
  command: risky_operation && echo "SUCCESS" || echo "FAILED"
  mode: sync
```

For critical operations, verify outputs:

```bash
# After build
bash: ls -lh expected_output_file || echo "File not created"
```

## Common Pitfalls and Solutions

### Pitfall 1: Environment Variables Not Persisting

**Problem**: Environment set in one command not available in next

**Solution**: Combine environment sourcing with actual command:
```bash
bash: source env.sh && actual_command
```

### Pitfall 2: Insufficient Wait Time

**Problem**: Command times out before completion

**Solution**: Increase `initial_wait` or use async mode with polling:
```bash
bash:
  mode: sync
  initial_wait: 300  # 5 minutes for very long operations
```

Or:
```bash
bash:
  mode: async
# Then poll with read_bash
```

### Pitfall 3: Working Directory Confusion

**Problem**: Commands run in wrong directory

**Solution**: Always use `cd` in same command:
```bash
bash: cd /absolute/path && command
```

### Pitfall 4: File Path Issues

**Problem**: Relative paths don't work as expected

**Solution**: Use absolute paths from repository root:
```bash
/home/runner/work/omnilator/omnilator/path/to/file
```

## Testing Your Build Process

To verify the build process works:

```bash
# 1. Clean build environment
bash: cd public/snes/core/snes9x2005-wasm-master && rm -f snes9x_2005.*

# 2. Run build
bash: source emsdk/emsdk_env.sh && cd public/snes/core/snes9x2005-wasm-master && bash build.sh

# 3. Verify outputs
bash: ls -lh public/snes/core/snes9x2005-wasm-master/snes9x_2005.*

# 4. Check file sizes
# snes9x_2005.js should be ~15KB
# snes9x_2005.wasm should be ~600KB
```

## Integration with CI/CD

For automated builds, create a script that:

1. Installs Emscripten if not present
2. Sources environment
3. Builds WASM module
4. Verifies outputs
5. Copies to deployment location

Example script: `scripts/build-wasm.sh`

```bash
#!/bin/bash
set -e  # Exit on error

# Install Emscripten if needed
if [ ! -d "emsdk" ]; then
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    ./emsdk install 3.1.51
    ./emsdk activate 3.1.51
    cd ..
fi

# Source environment
source emsdk/emsdk_env.sh

# Build
cd public/snes/core/snes9x2005-wasm-master
bash build.sh

# Verify
if [ ! -f "snes9x_2005.js" ] || [ ! -f "snes9x_2005.wasm" ]; then
    echo "Build failed: Output files not found"
    exit 1
fi

# Copy to accessible location
cp snes9x_2005.js ../
cp snes9x_2005.wasm ../

echo "Build successful!"
```

## Conclusion

MCP tools provide powerful capabilities for automating development tasks. Key takeaways:

1. **Choose the right mode**: sync for sequential, async for long-running/interactive
2. **Set appropriate timeouts**: Based on expected operation duration  
3. **Handle environments properly**: Source in same command as usage
4. **Verify outputs**: Always check that operations succeeded
5. **Document patterns**: Help future developers and AI agents
6. **Test reproducibility**: Ensure builds are deterministic

This guide will be updated as new patterns and tools are discovered during development.

---

**Last Updated**: 2026-01-05  
**Related Documents**:
- `BUILD_SNES9X_GUIDE.md` - Step-by-step build instructions
- `EMSCRIPTEN_SETUP.md` - Emscripten installation guide
- `TASK_BREAKDOWN.md` - Complete task reference
