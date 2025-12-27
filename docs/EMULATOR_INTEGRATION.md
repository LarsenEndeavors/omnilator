# SNES Emulator Integration Guide

## Current Status

The current implementation is a **demo/test mode** that shows:
- ✅ Rendering loop working at 60 FPS
- ✅ Input handling (keyboard and gamepad)
- ✅ Audio system initialized
- ✅ Save state infrastructure
- ❌ **Actual ROM emulation** (not implemented)

The `SnesCore` class has a mock implementation that generates a gradient pattern with button indicators to demonstrate that the infrastructure works.

## Why a Mock Implementation?

Integrating a real SNES emulator requires:

1. **WebAssembly Module**: A compiled SNES emulator (typically snes9x) as WASM
2. **Memory Management**: Handling shared memory between JavaScript and WASM
3. **API Bindings**: Creating JavaScript bindings to the WASM functions
4. **Audio/Video Sync**: Proper synchronization of audio and video streams
5. **Save States**: Implementing serialization/deserialization of emulator state

This is a substantial undertaking requiring 8-16 hours of development and testing.

## Integration Options

### Option 1: Use EmulatorJS (Easiest)

**EmulatorJS** provides pre-built SNES cores but requires using their framework.

```bash
npm install @emulatorjs/core-snes9x
```

**Pros:**
- Pre-built WASM cores
- Handles memory management
- Full-featured

**Cons:**
- Has security vulnerabilities (52 high severity as of 2024)
- Requires using their framework (not a drop-in replacement)
- Less control over implementation

### Option 2: Build snes9x to WASM (Most Control)

Compile snes9x from source using Emscripten.

**Steps:**
1. Install Emscripten SDK
2. Clone snes9x repository
3. Modify build system for WASM target
4. Create JavaScript bindings
5. Handle memory management

**Example:**
```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Build snes9x
git clone https://github.com/snes9xgit/snes9x.git
cd snes9x
# Configure for WASM and build
emcc -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_loadROM", "_runFrame"]' ...
```

**Pros:**
- Full control over implementation
- Can optimize for web
- No external dependencies

**Cons:**
- Requires C++ knowledge
- Time-consuming (8-16 hours)
- Need to maintain build system

### Option 3: Use RetroArch Cores (Recommended) ⭐

RetroArch provides libretro cores that can be used in the browser. This approach is **recommended** because it offers:
- Well-documented, stable API (libretro)
- Pre-built WASM cores available
- Loose coupling through standardized interface
- Easy to swap between different cores (snes9x, bsnes, etc.)

**Resources:**
- LibRetro Docs: https://docs.libretro.com/
- Web Player Example: https://buildbot.libretro.com/stable/
- WASM Cores: https://buildbot.libretro.com/stable/

**Architecture for Loose Coupling:**

The key is to abstract the libretro implementation behind the existing `IEmulatorCore` interface:

```typescript
// Core abstraction layer - keeps loose coupling
interface IEmulatorCore {
  loadROM(data: Uint8Array): Promise<void>;
  runFrame(): Promise<void>;
  setInput(port: number, buttons: number): void;
  // ... other methods
}

// LibRetro adapter - implements IEmulatorCore
class LibRetroCore implements IEmulatorCore {
  private module: any;
  private memory: WebAssembly.Memory;
  private coreName: string; // e.g., 'snes9x', 'bsnes'
  
  constructor(coreName: string = 'snes9x') {
    this.coreName = coreName;
  }
  
  async initialize() {
    // Load WASM module dynamically based on coreName
    const coreUrl = `https://buildbot.libretro.com/stable/${this.coreName}_libretro.wasm`;
    const response = await fetch(coreUrl);
    const bytes = await response.arrayBuffer();
    
    // Create memory
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });
    
    // Instantiate WASM with libretro callbacks
    const { instance } = await WebAssembly.instantiate(bytes, {
      env: {
        memory: this.memory,
        // LibRetro callbacks
        video_refresh: this.videoRefresh.bind(this),
        audio_sample: this.audioSample.bind(this),
        input_poll: this.inputPoll.bind(this),
        input_state: this.inputState.bind(this),
      }
    });
    
    this.module = instance.exports;
    
    // Initialize libretro core
    this.module.retro_init();
    this.module.retro_set_environment(/* ... */);
  }
  
  async loadROM(data: Uint8Array): Promise<void> {
    // Copy ROM data to WASM memory
    const ptr = this.module.malloc(data.length);
    const memView = new Uint8Array(this.memory.buffer, ptr, data.length);
    memView.set(data);
    
    // Load game through libretro API
    const gameInfo = {
      path: null,
      data: ptr,
      size: data.length,
      meta: null
    };
    
    if (!this.module.retro_load_game(gameInfo)) {
      throw new Error('Failed to load ROM');
    }
  }
  
  async runFrame(): Promise<void> {
    // Execute one frame through libretro
    this.module.retro_run();
  }
  
  setInput(port: number, buttons: number): void {
    // Store input state for libretro callbacks
    this.inputStates[port] = buttons;
  }
  
  // LibRetro callback implementations
  private videoRefresh(data: number, width: number, height: number, pitch: number) {
    // Copy video data from WASM memory to our buffer
  }
  
  private audioSample(left: number, right: number) {
    // Handle audio sample
  }
  
  private inputPoll() {
    // Called by core to poll input
  }
  
  private inputState(port: number, device: number, index: number, id: number): number {
    // Return button state for requested input
    return this.inputStates[port] || 0;
  }
}

// Easy to swap implementations - just change the class used
const core: IEmulatorCore = new LibRetroCore('snes9x'); // Or 'bsnes', etc.
// Or: const core: IEmulatorCore = new CustomWasmCore();
// The rest of the app doesn't need to change!
```

**Benefits of This Approach:**
- **Loose Coupling**: `IEmulatorCore` interface shields the rest of the app from implementation details
- **Swappable Cores**: Change `coreName` to switch between snes9x, bsnes, etc.
- **Easy Migration**: Can swap entire implementation strategy without changing UI code
- **Testability**: Can mock `IEmulatorCore` for testing

### Option 4: Use a CDN-Hosted Core

Load a pre-built SNES core from a CDN.

**Example:**
```typescript
async initialize() {
  // Load from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@emulatorjs/core-snes9x@latest/snes9x-wasm.js';
  document.head.appendChild(script);
  
  await new Promise((resolve) => {
    script.onload = resolve;
  });
}
```

**Pros:**
- No build step required
- Fast to implement

**Cons:**
- External dependency
- Potential security/privacy concerns
- Less control

## Implementation Checklist

To integrate a real SNES emulator:

- [ ] Choose an integration option (see above)
- [ ] Update `WasmModule` interface in `SnesCore.ts` to match actual WASM API
- [ ] Implement WASM module loading in `initialize()`
- [ ] Update `loadROM()` to properly load ROM data into WASM memory
- [ ] Implement `runFrame()` to execute one frame of emulation
- [ ] Update `getBuffer()` to fetch video data from WASM
- [ ] Update `getAudioSamples()` to fetch audio data from WASM
- [ ] Implement proper `saveState()` and `loadState()`
- [ ] Test with various ROM files
- [ ] Handle errors and edge cases
- [ ] Add loading indicators
- [ ] Optimize performance

## Testing

Test ROMs are available in the issue attachments. A working emulator should:

1. **Load the ROM without errors**
2. **Display actual game graphics** (not a gradient)
3. **Respond to controller input correctly**
   - Test all buttons on controller port 1 (primary player)
   - Test controller ports 2-4 for multiplayer games
   - Verify simultaneous multi-controller input
   - Test gamepad and keyboard input methods
4. **Play audio** synchronized with video
5. **Support save states** that can be loaded later
6. **Run at 60 FPS** consistently

### Multi-Port Input Testing

SNES supports up to 4 controllers through standard ports or 5+ with multitap accessories. Test all ports:

```typescript
// Example test for multi-port input
describe('Multi-port input', () => {
  it('should handle input from ports 1-4', async () => {
    const core = new SnesCore();
    await core.loadROM(testROM);
    
    // Test each port independently
    for (let port = 0; port < 4; port++) {
      core.setInput(port, SnesButton.A);
      await core.runFrame();
      // Verify port N responds to input
    }
    
    // Test simultaneous input from multiple ports
    core.setInput(0, SnesButton.A);
    core.setInput(1, SnesButton.B);
    core.setInput(2, SnesButton.X);
    core.setInput(3, SnesButton.Y);
    await core.runFrame();
    // Verify all ports handled correctly
  });
});
```

**Test Cases:**
- Single player games (port 1 only)
- 2-player games (ports 1-2)
- 4-player games (ports 1-4 or multitap)
- Verify unused ports don't interfere
- Test rapid input switching between ports

## Resources

- **snes9x GitHub**: https://github.com/snes9xgit/snes9x
- **EmulatorJS**: https://emulatorjs.org
- **LibRetro Docs**: https://docs.libretro.com/
- **Emscripten**: https://emscripten.org/docs/
- **WebAssembly Docs**: https://webassembly.org/getting-started/developers-guide/

## Architecture

The current architecture is well-designed with:

- **`IEmulatorCore`**: Interface defining emulator operations
- **`SnesCore`**: Implementation (currently mock)
- **`useEmulator`**: React hook managing rendering loop
- **`useInput`**: React hook handling input
- **`AudioSystem`**: WebAudio API integration

This separation of concerns makes it easy to swap the mock implementation for a real one without changing the UI layer.

## Next Steps

1. Choose an integration option based on your requirements
2. Follow the implementation checklist
3. Test thoroughly with the provided test ROMs
4. Update this documentation with your findings

Good luck! 🎮
