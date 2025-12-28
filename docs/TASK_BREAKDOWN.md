# Omnilator Task Breakdown

This document provides detailed task breakdowns for each phase in the [Project Roadmap](PROJECT_ROADMAP.md). Each task includes acceptance criteria, implementation notes, and dependencies.

---

## Phase 1: snes9xWASM Integration

### Task 1.1: Analyze snes9x2005-wasm Structure

**Priority**: Critical  
**Estimated Time**: 4 hours  
**Dependencies**: None

#### Subtasks
1. Read build.sh and understand Emscripten flags
   - Note EXPORTED_RUNTIME_METHODS
   - Note memory settings (ALLOW_MEMORY_GROWTH)
   - Document optimization level (-O3)

2. Examine C source files in `source/` directory
   - Identify main entry points
   - Find initialization functions
   - Find frame execution functions
   - Find memory access patterns

3. Map to LibRetro API
   - retro_init()
   - retro_load_game()
   - retro_run()
   - retro_get_system_info()
   - video_refresh callback
   - audio_sample callback
   - input_state callback

4. Create TypeScript type definitions
   ```typescript
   interface Snes9xWasmModule {
     _malloc(size: number): number;
     _free(ptr: number): void;
     // Add specific exported functions
   }
   ```

#### Acceptance Criteria
- [ ] Documentation file created: `docs/SNES9X_WASM_API.md`
- [ ] All exported functions documented with signatures
- [ ] TypeScript interface defined for WASM module
- [ ] Memory layout documented
- [ ] Callback requirements documented

#### Implementation Notes
- Use `nm snes9x_2005.wasm` to inspect exported symbols (after build)
- Reference LibRetro API docs: https://docs.libretro.com/
- Look for existing examples in the snes9x2005-wasm repo

---

### Task 1.2: Build snes9x2005-wasm

**Priority**: Critical  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

#### Subtasks
1. Check if Emscripten SDK is installed
   ```bash
   emcc --version
   ```

2. If not installed, install Emscripten
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh
   ```

3. Navigate to snes9x2005-wasm directory
   ```bash
   cd public/snes/core/snes9x2005-wasm-master
   ```

4. Run build script
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

5. Verify output files
   - Check for `snes9x_2005.js`
   - Check for `snes9x_2005.wasm`
   - Verify file sizes are reasonable

6. Copy to appropriate location
   ```bash
   cp snes9x_2005.* ../
   ```

7. Update .gitignore if needed
   ```
   # Add to .gitignore if build artifacts shouldn't be committed
   public/snes/core/*.js
   public/snes/core/*.wasm
   ```

#### Acceptance Criteria
- [ ] Emscripten SDK installed and working
- [ ] Build completes without errors
- [ ] `snes9x_2005.js` exists and is ~100-500KB
- [ ] `snes9x_2005.wasm` exists and is ~1-3MB
- [ ] Files accessible in `public/snes/core/`

#### Troubleshooting
- If build fails, check Emscripten version (needs 3.x+)
- If memory errors, may need to adjust ALLOW_MEMORY_GROWTH
- If missing symbols, check EXPORTED_RUNTIME_METHODS

---

### Task 1.3: Create Snes9xWasmCore Wrapper

**Priority**: Critical  
**Estimated Time**: 8 hours  
**Dependencies**: Tasks 1.1, 1.2

#### Subtasks

1. Create file structure
   ```bash
   touch src/core/Snes9xWasmCore.ts
   ```

2. Implement class skeleton
   ```typescript
   import type { IEmulatorCore } from './IEmulatorCore';
   
   export class Snes9xWasmCore implements IEmulatorCore {
     private module: any = null;
     private memory: WebAssembly.Memory | null = null;
     private videoBuffer: ImageData | null = null;
     private audioBuffer: Float32Array = new Float32Array(2048);
     
     async initialize(): Promise<void> {
       // Load WASM module
     }
     
     async loadROM(romData: Uint8Array): Promise<void> {
       throw new Error('Not implemented');
     }
     
     async runFrame(): Promise<void> {
       throw new Error('Not implemented');
     }
     
     getBuffer(): ImageData {
       if (!this.videoBuffer) {
         throw new Error('No frame available');
       }
       return this.videoBuffer;
     }
     
     getAudioSamples(): Float32Array {
       return this.audioBuffer;
     }
     
     setInput(port: number, buttons: number): void {
       // Store for input_state callback
     }
     
     saveState(): Uint8Array {
       throw new Error('Not implemented');
     }
     
     loadState(state: Uint8Array): void {
       throw new Error('Not implemented');
     }
     
     reset(): void {
       throw new Error('Not implemented');
     }
     
     cleanup(): void {
       if (this.module) {
         // Free resources
       }
     }
   }
   ```

3. Implement WASM module loading
   ```typescript
   async initialize(): Promise<void> {
     try {
       // Import the JS glue code
       const moduleFactory = await import('/snes/core/snes9x_2005.js');
       
       // Create module with custom settings
       this.module = await moduleFactory.default({
         locateFile: (path: string) => {
           if (path.endsWith('.wasm')) {
             return '/snes/core/snes9x_2005.wasm';
           }
           return path;
         },
         print: (text: string) => console.log('[snes9x]', text),
         printErr: (text: string) => console.error('[snes9x]', text),
       });
       
       console.log('snes9x WASM module loaded successfully');
     } catch (error) {
       console.error('Failed to load snes9x WASM module:', error);
       throw new Error(`Failed to initialize snes9x core: ${error}`);
     }
   }
   ```

4. Set up LibRetro callbacks
   ```typescript
   private setupCallbacks(): void {
     // Video refresh callback
     this.module.setVideoRefresh((data: number, width: number, height: number, pitch: number) => {
       this.handleVideoRefresh(data, width, height, pitch);
     });
     
     // Audio sample callback
     this.module.setAudioSample((left: number, right: number) => {
       this.handleAudioSample(left, right);
     });
     
     // Audio sample batch callback
     this.module.setAudioSampleBatch((data: number, frames: number) => {
       this.handleAudioSampleBatch(data, frames);
     });
     
     // Input state callback
     this.module.setInputState((port: number, device: number, index: number, id: number) => {
       return this.handleInputState(port, device, index, id);
     });
   }
   ```

5. Implement memory management utilities
   ```typescript
   private allocateMemory(size: number): number {
     const ptr = this.module._malloc(size);
     if (!ptr) {
       throw new Error(`Failed to allocate ${size} bytes`);
     }
     return ptr;
   }
   
   private freeMemory(ptr: number): void {
     if (ptr) {
       this.module._free(ptr);
     }
   }
   
   private copyToWasm(data: Uint8Array): number {
     const ptr = this.allocateMemory(data.length);
     const heap = new Uint8Array(this.module.HEAP8.buffer, ptr, data.length);
     heap.set(data);
     return ptr;
   }
   
   private copyFromWasm(ptr: number, length: number): Uint8Array {
     const data = new Uint8Array(length);
     const heap = new Uint8Array(this.module.HEAP8.buffer, ptr, length);
     data.set(heap);
     return data;
   }
   ```

#### Acceptance Criteria
- [ ] `Snes9xWasmCore` class created
- [ ] Implements `IEmulatorCore` interface
- [ ] WASM module loads without errors
- [ ] Memory allocation/deallocation works
- [ ] Callbacks can be registered (even if not fully implemented)
- [ ] TypeScript compiles without errors

#### Testing
```typescript
// In a test file or dev console
const core = new Snes9xWasmCore();
await core.initialize();
console.log('Core initialized:', core);
```

---

### Task 1.4: Implement ROM Loading

**Priority**: Critical  
**Estimated Time**: 4 hours  
**Dependencies**: Task 1.3

#### Subtasks

1. Implement loadROM method
   ```typescript
   async loadROM(romData: Uint8Array): Promise<void> {
     if (!this.module) {
       throw new Error('Core not initialized');
     }
     
     // Remove .smc header if present (512 bytes)
     let cleanedROM = romData;
     if (romData.length % 1024 === 512) {
       console.log('Removing .smc header');
       cleanedROM = romData.slice(512);
     }
     
     // Copy ROM to WASM memory
     const romPtr = this.copyToWasm(cleanedROM);
     
     try {
       // Call LibRetro load_game
       const result = this.module._retro_load_game(romPtr, cleanedROM.length);
       
       if (!result) {
         throw new Error('Core rejected ROM');
       }
       
       console.log('ROM loaded successfully');
       
       // Get system AV info
       this.getSystemInfo();
       
     } finally {
       // Always free the ROM memory
       this.freeMemory(romPtr);
     }
   }
   ```

2. Implement system info retrieval
   ```typescript
   private getSystemInfo(): void {
     // Get video dimensions and frame rate
     const avInfo = this.module._retro_get_system_av_info();
     
     if (avInfo) {
       const width = this.module.HEAP32[avInfo / 4];
       const height = this.module.HEAP32[avInfo / 4 + 1];
       const fps = this.module.HEAPF64[avInfo / 8 + 1];
       
       console.log(`System info: ${width}x${height} @ ${fps}fps`);
       
       // Initialize video buffer with correct size
       this.videoBuffer = new ImageData(width, height);
     }
   }
   ```

3. Add ROM validation
   ```typescript
   private validateROM(romData: Uint8Array): void {
     // Check minimum size (smallest valid SNES ROM is 256KB)
     if (romData.length < 256 * 1024) {
       throw new Error('ROM file too small');
     }
     
     // Check maximum size (largest SNES ROM is 6MB)
     if (romData.length > 6 * 1024 * 1024) {
       throw new Error('ROM file too large');
     }
     
     // Could add more validation (header checks, checksums, etc.)
   }
   ```

4. Handle ROM format detection
   ```typescript
   private detectROMFormat(romData: Uint8Array): string {
     // Check for .smc header (512 bytes)
     if (romData.length % 1024 === 512) {
       return 'smc';
     }
     // Native .sfc format
     return 'sfc';
   }
   ```

#### Acceptance Criteria
- [ ] ROM data copied to WASM memory correctly
- [ ] ROM header removed if present
- [ ] Core accepts ROM without errors
- [ ] Video buffer initialized with correct dimensions
- [ ] ROM validation prevents invalid files
- [ ] Memory freed properly after loading

#### Testing
```typescript
// Load test ROM
const response = await fetch('/snes/test_roms/test.smc');
const romData = new Uint8Array(await response.arrayBuffer());

const core = new Snes9xWasmCore();
await core.initialize();
await core.loadROM(romData);
console.log('ROM loaded!');
```

---

### Task 1.5: Implement Frame Execution

**Priority**: Critical  
**Estimated Time**: 6 hours  
**Dependencies**: Task 1.4

#### Subtasks

1. Implement runFrame method
   ```typescript
   async runFrame(): Promise<void> {
     if (!this.module) {
       throw new Error('Core not initialized');
     }
     
     // Clear audio buffer for new frame
     this.audioBuffer = new Float32Array(2048);
     this.audioBufferIndex = 0;
     
     // Run one frame of emulation
     this.module._retro_run();
     
     // Frame data is received via video_refresh callback
     // Audio data is received via audio_sample callbacks
   }
   ```

2. Implement video refresh callback handler
   ```typescript
   private handleVideoRefresh(
     dataPtr: number,
     width: number,
     height: number,
     pitch: number
   ): void {
     if (!this.videoBuffer || 
         this.videoBuffer.width !== width || 
         this.videoBuffer.height !== height) {
       this.videoBuffer = new ImageData(width, height);
     }
     
     const pixelFormat = this.getPixelFormat();
     
     if (pixelFormat === 'RGB565') {
       this.convertRGB565ToRGBA(dataPtr, width, height, pitch);
     } else if (pixelFormat === 'XRGB8888') {
       this.convertXRGB8888ToRGBA(dataPtr, width, height, pitch);
     } else if (pixelFormat === 'RGB1555') {
       this.convertRGB1555ToRGBA(dataPtr, width, height, pitch);
     } else {
       console.warn('Unsupported pixel format:', pixelFormat);
     }
   }
   ```

3. Implement RGB565 conversion (most common)
   ```typescript
   private convertRGB565ToRGBA(
     dataPtr: number,
     width: number,
     height: number,
     pitch: number
   ): void {
     const src = new Uint8Array(this.module.HEAP8.buffer, dataPtr, height * pitch);
     const dst = this.videoBuffer!.data;
     
     for (let y = 0; y < height; y++) {
       for (let x = 0; x < width; x++) {
         const srcIndex = y * pitch + x * 2;
         const dstIndex = (y * width + x) * 4;
         
         // Read 16-bit pixel
         const pixel = src[srcIndex] | (src[srcIndex + 1] << 8);
         
         // Extract RGB components (5-6-5 bits)
         const r = (pixel >> 11) & 0x1F;
         const g = (pixel >> 5) & 0x3F;
         const b = pixel & 0x1F;
         
         // Scale to 8-bit
         dst[dstIndex] = (r * 255 / 31) | 0;     // R
         dst[dstIndex + 1] = (g * 255 / 63) | 0; // G
         dst[dstIndex + 2] = (b * 255 / 31) | 0; // B
         dst[dstIndex + 3] = 255;                 // A
       }
     }
   }
   ```

4. Implement XRGB8888 conversion
   ```typescript
   private convertXRGB8888ToRGBA(
     dataPtr: number,
     width: number,
     height: number,
     pitch: number
   ): void {
     const src = new Uint8Array(this.module.HEAP8.buffer, dataPtr, height * pitch);
     const dst = this.videoBuffer!.data;
     
     for (let y = 0; y < height; y++) {
       for (let x = 0; x < width; x++) {
         const srcIndex = y * pitch + x * 4;
         const dstIndex = (y * width + x) * 4;
         
         // BGRA to RGBA (typical x86 little-endian)
         dst[dstIndex] = src[srcIndex + 2];     // R
         dst[dstIndex + 1] = src[srcIndex + 1]; // G
         dst[dstIndex + 2] = src[srcIndex];     // B
         dst[dstIndex + 3] = 255;               // A
       }
     }
   }
   ```

5. Implement RGB1555 conversion
   ```typescript
   private convertRGB1555ToRGBA(
     dataPtr: number,
     width: number,
     height: number,
     pitch: number
   ): void {
     const src = new Uint8Array(this.module.HEAP8.buffer, dataPtr, height * pitch);
     const dst = this.videoBuffer!.data;
     
     for (let y = 0; y < height; y++) {
       for (let x = 0; x < width; x++) {
         const srcIndex = y * pitch + x * 2;
         const dstIndex = (y * width + x) * 4;
         
         // Read 16-bit pixel (1 bit unused, 5-5-5 RGB)
         const pixel = src[srcIndex] | (src[srcIndex + 1] << 8);
         
         const r = (pixel >> 10) & 0x1F;
         const g = (pixel >> 5) & 0x1F;
         const b = pixel & 0x1F;
         
         // Scale to 8-bit
         dst[dstIndex] = (r * 255 / 31) | 0;     // R
         dst[dstIndex + 1] = (g * 255 / 31) | 0; // G
         dst[dstIndex + 2] = (b * 255 / 31) | 0; // B
         dst[dstIndex + 3] = 255;                 // A
       }
     }
   }
   ```

6. Implement audio sample handlers
   ```typescript
   private audioBufferIndex = 0;
   
   private handleAudioSample(left: number, right: number): void {
     // Convert int16 to float32 range [-1, 1]
     const leftFloat = left / 32768.0;
     const rightFloat = right / 32768.0;
     
     // Add to buffer (interleaved stereo)
     if (this.audioBufferIndex < this.audioBuffer.length - 1) {
       this.audioBuffer[this.audioBufferIndex++] = leftFloat;
       this.audioBuffer[this.audioBufferIndex++] = rightFloat;
     }
   }
   
   private handleAudioSampleBatch(dataPtr: number, frames: number): number {
     const samples = new Int16Array(
       this.module.HEAP16.buffer,
       dataPtr,
       frames * 2 // Stereo
     );
     
     for (let i = 0; i < samples.length && this.audioBufferIndex < this.audioBuffer.length; i++) {
       this.audioBuffer[this.audioBufferIndex++] = samples[i] / 32768.0;
     }
     
     return frames; // Return number of frames processed
   }
   ```

#### Acceptance Criteria
- [ ] runFrame() executes without errors
- [ ] Video frame is rendered to ImageData
- [ ] All pixel formats convert correctly
- [ ] Audio samples are captured
- [ ] Audio is converted to float32 format
- [ ] Frame timing is consistent

#### Testing
```typescript
const core = new Snes9xWasmCore();
await core.initialize();
await core.loadROM(romData);

// Run one frame
await core.runFrame();

// Get results
const frame = core.getBuffer();
const audio = core.getAudioSamples();

console.log('Frame:', frame.width, 'x', frame.height);
console.log('Audio samples:', audio.length);

// Display on canvas
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
ctx.putImageData(frame, 0, 0);
```

---

### Task 1.6: Implement Input and State Management

**Priority**: High  
**Estimated Time**: 4 hours  
**Dependencies**: Task 1.5

#### Subtasks

1. Implement setInput method
   ```typescript
   private inputStates: number[] = [0, 0, 0, 0]; // 4 ports
   
   setInput(port: number, buttons: number): void {
     if (port < 0 || port >= 4) {
       throw new Error(`Invalid port: ${port}`);
     }
     this.inputStates[port] = buttons;
   }
   ```

2. Implement input state callback handler
   ```typescript
   private handleInputState(
     port: number,
     device: number,
     index: number,
     id: number
   ): number {
     if (port < 0 || port >= 4) {
       return 0;
     }
     
     // Return bit value for requested button
     const buttons = this.inputStates[port];
     return (buttons & (1 << id)) ? 1 : 0;
   }
   ```

3. Implement saveState method
   ```typescript
   saveState(): Uint8Array {
     if (!this.module) {
       throw new Error('Core not initialized');
     }
     
     // Get state size
     const size = this.module._retro_serialize_size();
     if (size === 0) {
       throw new Error('Save states not supported');
     }
     
     // Allocate memory for state
     const statePtr = this.allocateMemory(size);
     
     try {
       // Serialize state
       const success = this.module._retro_serialize(statePtr, size);
       if (!success) {
         throw new Error('Failed to save state');
       }
       
       // Copy state from WASM memory
       return this.copyFromWasm(statePtr, size);
       
     } finally {
       this.freeMemory(statePtr);
     }
   }
   ```

4. Implement loadState method
   ```typescript
   loadState(state: Uint8Array): void {
     if (!this.module) {
       throw new Error('Core not initialized');
     }
     
     // Copy state to WASM memory
     const statePtr = this.copyToWasm(state);
     
     try {
       // Deserialize state
       const success = this.module._retro_unserialize(statePtr, state.length);
       if (!success) {
         throw new Error('Failed to load state');
       }
       
       console.log('State loaded successfully');
       
     } finally {
       this.freeMemory(statePtr);
     }
   }
   ```

5. Implement reset method
   ```typescript
   reset(): void {
     if (!this.module) {
       throw new Error('Core not initialized');
     }
     
     this.module._retro_reset();
     console.log('Emulator reset');
   }
   ```

6. Implement cleanup method
   ```typescript
   cleanup(): void {
     if (this.module) {
       // Unload game
       this.module._retro_unload_game();
       
       // Deinitialize core
       this.module._retro_deinit();
       
       console.log('Core cleaned up');
       this.module = null;
       this.videoBuffer = null;
     }
   }
   ```

#### Acceptance Criteria
- [ ] setInput() stores button states correctly
- [ ] Input callback returns correct button values
- [ ] saveState() creates valid state data
- [ ] loadState() restores exact emulator state
- [ ] reset() restarts emulation
- [ ] cleanup() frees all resources

#### Testing
```typescript
// Test input
core.setInput(0, SnesButton.A | SnesButton.START);
await core.runFrame();
// Verify button press in game

// Test save state
const state = core.saveState();
console.log('State size:', state.length);

// Play for a bit
for (let i = 0; i < 60; i++) {
  await core.runFrame();
}

// Load state
core.loadState(state);
// Should return to saved point

// Test reset
core.reset();
await core.runFrame();
// Should restart game
```

---

### Task 1.7: Update SnesCore to Use Snes9xWasmCore

**Priority**: High  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.6

#### Subtasks

1. Modify SnesCore constructor
   ```typescript
   constructor(
     coreName: string = 'snes9x',
     coreUrl?: string
   ) {
     // Try Snes9xWasmCore first
     try {
       this.core = new Snes9xWasmCore();
     } catch (error) {
       console.warn('Snes9xWasmCore not available, using LibRetroCore');
       this.core = new LibRetroCore(coreName, coreUrl);
     }
   }
   ```

2. Update initialize method
   ```typescript
   async initialize(): Promise<void> {
     const isSnes9xWasm = this.core instanceof Snes9xWasmCore;
     const isLibRetro = this.core instanceof LibRetroCore;
     
     try {
       await this.core.initialize();
       
       if (isSnes9xWasm) {
         console.log('Using snes9x2005-wasm core');
       } else if (isLibRetro) {
         console.log('Using LibRetro core');
       }
     } catch (error) {
       console.warn('Core initialization failed, falling back to mock:', error);
       this.core = new MockSnesCore();
       await this.core.initialize();
       this.isUsingMock = true;
     }
   }
   ```

3. Update isInMockMode method
   ```typescript
   isInMockMode(): boolean {
     return this.core instanceof MockSnesCore;
   }
   ```

4. Update getCoreInfo method
   ```typescript
   getCoreInfo(): { name: string; version: string } {
     if (this.core instanceof Snes9xWasmCore) {
       return { name: 'snes9x2005', version: '1.36' };
     } else if ('getCoreInfo' in this.core) {
       return (this.core as LibRetroCore).getCoreInfo();
     }
     return { name: 'Mock', version: 'demo' };
   }
   ```

5. Add loading UI in EmulatorScreen
   ```typescript
   // In EmulatorScreen.tsx
   const [isLoading, setIsLoading] = useState(true);
   const [coreInfo, setCoreInfo] = useState({ name: '', version: '' });
   
   useEffect(() => {
     const initCore = async () => {
       setIsLoading(true);
       try {
         await core.initialize();
         setCoreInfo(core.getCoreInfo());
       } catch (error) {
         console.error('Failed to initialize core:', error);
       } finally {
         setIsLoading(false);
       }
     };
     initCore();
   }, []);
   
   // Display loading state
   if (isLoading) {
     return <div className="loading">Loading {coreInfo.name}...</div>;
   }
   ```

#### Acceptance Criteria
- [ ] SnesCore prioritizes Snes9xWasmCore
- [ ] Falls back to LibRetroCore if snes9x WASM unavailable
- [ ] Falls back to MockSnesCore if both fail
- [ ] Loading state displayed during initialization
- [ ] Core info displayed in UI
- [ ] No breaking changes to existing code

#### Testing
```typescript
// Should use snes9x2005-wasm
const core = new SnesCore();
await core.initialize();
const info = core.getCoreInfo();
console.log('Using core:', info.name); // Should be "snes9x2005"
```

---

### Task 1.8: Testing and Polish

**Priority**: High  
**Estimated Time**: 8 hours  
**Dependencies**: Task 1.7

#### Subtasks

1. Create test checklist
   - [ ] Load .smc ROM files
   - [ ] Load .sfc ROM files
   - [ ] Test all SNES buttons
   - [ ] Test D-pad in all directions
   - [ ] Test button combinations
   - [ ] Test save state slots 1-4
   - [ ] Test load state
   - [ ] Test reset
   - [ ] Test pause/resume
   - [ ] Verify 60 FPS
   - [ ] Verify audio sync
   - [ ] Test gamepad input
   - [ ] Test keyboard input

2. Test with multiple ROMs
   ```typescript
   const romFiles = [
     '/snes/test_roms/rom1.smc',
     '/snes/test_roms/rom2.smc',
     '/snes/test_roms/rom3.smc',
     '/snes/test_roms/rom4.smc',
   ];
   
   for (const romFile of romFiles) {
     const response = await fetch(romFile);
     const romData = new Uint8Array(await response.arrayBuffer());
     
     await core.loadROM(romData);
     console.log(`Loaded ${romFile}`);
     
     // Run for 60 frames (1 second)
     for (let i = 0; i < 60; i++) {
       await core.runFrame();
     }
   }
   ```

3. Performance testing
   ```typescript
   let frameCount = 0;
   let lastTime = performance.now();
   
   const measureFPS = () => {
     frameCount++;
     const now = performance.now();
     const elapsed = now - lastTime;
     
     if (elapsed >= 1000) {
       const fps = frameCount / (elapsed / 1000);
       console.log('FPS:', fps.toFixed(2));
       frameCount = 0;
       lastTime = now;
     }
   };
   
   // Run game loop
   const gameLoop = async () => {
     await core.runFrame();
     measureFPS();
     requestAnimationFrame(gameLoop);
   };
   gameLoop();
   ```

4. Audio sync testing
   ```typescript
   // Verify audio samples match frame rate
   const expectedSamplesPerFrame = 48000 / 60; // ~800 samples at 48kHz
   
   await core.runFrame();
   const samples = core.getAudioSamples();
   
   console.log('Audio samples:', samples.length / 2); // Divide by 2 for stereo
   // Should be close to expectedSamplesPerFrame
   ```

5. Save state validation
   ```typescript
   // Load ROM
   await core.loadROM(romData);
   
   // Run to a specific point
   for (let i = 0; i < 600; i++) { // 10 seconds
     await core.runFrame();
   }
   
   // Save state
   const state1 = core.saveState();
   const frame1 = core.getBuffer();
   
   // Continue playing
   for (let i = 0; i < 600; i++) { // Another 10 seconds
     await core.runFrame();
   }
   
   // Load state
   core.loadState(state1);
   await core.runFrame();
   const frame2 = core.getBuffer();
   
   // Compare frames - should be identical or very close
   const pixelDiff = compareFrames(frame1, frame2);
   console.log('Pixel difference:', pixelDiff);
   // Should be 0 or near 0
   ```

6. Bug fixes and polish
   - Fix any issues discovered during testing
   - Improve error messages
   - Add input validation
   - Optimize hot paths
   - Add console warnings for common issues
   - Update UI with better feedback

#### Acceptance Criteria
- [ ] All test checklist items pass
- [ ] Consistent 60 FPS on desktop
- [ ] Audio synchronized with video
- [ ] Save states work reliably
- [ ] All buttons respond correctly
- [ ] No memory leaks (run for 10+ minutes)
- [ ] Error messages are clear and helpful
- [ ] UI is responsive and polished

#### Deliverables
- Fully functional SNES emulator
- Test results documented
- Known issues documented
- Performance metrics recorded

---

## Phase 2: Network Architecture Foundation

### Task 2.1: Define Network Interfaces

**Priority**: Critical  
**Estimated Time**: 4 hours  
**Dependencies**: Phase 1 complete

#### Subtasks

1. Create INetworkTransport interface
   ```typescript
   // src/network/INetworkTransport.ts
   export interface INetworkTransport {
     // Connection management
     connect(sessionId: string): Promise<void>;
     disconnect(): Promise<void>;
     isConnected(): boolean;
     
     // Messaging
     send(message: NetworkMessage): Promise<void>;
     
     // Events
     onMessage: (callback: (message: NetworkMessage) => void) => void;
     onPeerConnected: (callback: (peerId: string) => void) => void;
     onPeerDisconnected: (callback: (peerId: string) => void) => void;
     onError: (callback: (error: Error) => void) => void;
   }
   ```

2. Create ISession interface
   ```typescript
   // src/network/ISession.ts
   export enum SessionRole {
     HOST = 'host',
     GUEST = 'guest'
   }
   
   export interface ISession {
     // Session properties
     sessionId: string;
     role: SessionRole;
     peers: string[];
     
     // Session lifecycle
     createSession(): Promise<string>; // Returns session ID
     joinSession(sessionId: string): Promise<void>;
     leaveSession(): Promise<void>;
     
     // State
     isActive(): boolean;
     getRole(): SessionRole;
     getPeers(): string[];
   }
   ```

3. Create message protocol types
   ```typescript
   // src/network/types.ts
   export enum MessageType {
     INPUT = 'input',
     VIDEO_FRAME = 'video_frame',
     AUDIO_SAMPLES = 'audio_samples',
     STATE_SYNC = 'state_sync',
     SESSION_CONTROL = 'session_control',
   }
   
   export interface NetworkMessage {
     type: MessageType;
     timestamp: number;
     senderId: string;
     payload: unknown;
   }
   
   export interface InputMessage extends NetworkMessage {
     type: MessageType.INPUT;
     payload: {
       port: number;
       buttons: number;
     };
   }
   
   export interface VideoFrameMessage extends NetworkMessage {
     type: MessageType.VIDEO_FRAME;
     payload: {
       width: number;
       height: number;
       data: Uint8Array;
     };
   }
   
   export interface AudioSamplesMessage extends NetworkMessage {
     type: MessageType.AUDIO_SAMPLES;
     payload: {
       samples: Float32Array;
     };
   }
   
   export interface StateSyncMessage extends NetworkMessage {
     type: MessageType.STATE_SYNC;
     payload: {
       state: Uint8Array;
     };
   }
   
   export enum SessionControlAction {
     START = 'start',
     PAUSE = 'pause',
     RESUME = 'resume',
     STOP = 'stop',
   }
   
   export interface SessionControlMessage extends NetworkMessage {
     type: MessageType.SESSION_CONTROL;
     payload: {
       action: SessionControlAction;
     };
   }
   ```

4. Document interfaces with JSDoc
   ```typescript
   /**
    * Network transport interface for multiplayer communication
    * 
    * Implementations handle the low-level networking details (WebRTC, WebSocket, etc.)
    * while providing a consistent API for the session layer.
    */
   export interface INetworkTransport {
     // ... (with detailed comments)
   }
   ```

#### Acceptance Criteria
- [ ] All interfaces defined and exported
- [ ] TypeScript compiles without errors
- [ ] JSDoc comments complete
- [ ] Message types cover all use cases
- [ ] No implementation yet (interface-only)

---

### Task 2.2: Define Session State Machine

**Priority**: High  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.1

#### Subtasks

1. Create session state enum
   ```typescript
   // src/network/SessionState.ts
   export enum SessionState {
     IDLE = 'idle',
     CREATING = 'creating',
     HOSTING = 'hosting',
     JOINING = 'joining',
     GUEST = 'guest',
     ACTIVE = 'active',
     PAUSED = 'paused',
     CLOSED = 'closed',
     ERROR = 'error',
   }
   ```

2. Document state transitions
   ```typescript
   /**
    * Session State Machine
    * 
    * Host Flow:
    *   IDLE → CREATING → HOSTING → ACTIVE → CLOSED
    *                                  ↓↑
    *                                PAUSED
    * 
    * Guest Flow:
    *   IDLE → JOINING → GUEST → ACTIVE → CLOSED
    *                               ↓↑
    *                             PAUSED
    * 
    * Error Flow:
    *   Any state → ERROR → CLOSED
    */
   ```

3. Create state transition diagram
   ```markdown
   # Session State Machine Diagram
   
   [IDLE] --create--> [CREATING] --success--> [HOSTING] --start--> [ACTIVE]
                          |
                          |--fail--> [ERROR]
   
   [IDLE] --join--> [JOINING] --success--> [GUEST] --start--> [ACTIVE]
                        |
                        |--fail--> [ERROR]
   
   [ACTIVE] --pause--> [PAUSED] --resume--> [ACTIVE]
   
   [ACTIVE] --stop/leave--> [CLOSED]
   [PAUSED] --stop/leave--> [CLOSED]
   [ERROR] --close--> [CLOSED]
   ```

4. Create state machine validator
   ```typescript
   export class SessionStateMachine {
     private state: SessionState = SessionState.IDLE;
     
     canTransition(to: SessionState): boolean {
       const validTransitions: Record<SessionState, SessionState[]> = {
         [SessionState.IDLE]: [SessionState.CREATING, SessionState.JOINING],
         [SessionState.CREATING]: [SessionState.HOSTING, SessionState.ERROR],
         [SessionState.HOSTING]: [SessionState.ACTIVE, SessionState.ERROR],
         [SessionState.JOINING]: [SessionState.GUEST, SessionState.ERROR],
         [SessionState.GUEST]: [SessionState.ACTIVE, SessionState.ERROR],
         [SessionState.ACTIVE]: [SessionState.PAUSED, SessionState.CLOSED, SessionState.ERROR],
         [SessionState.PAUSED]: [SessionState.ACTIVE, SessionState.CLOSED, SessionState.ERROR],
         [SessionState.ERROR]: [SessionState.CLOSED],
         [SessionState.CLOSED]: [],
       };
       
       return validTransitions[this.state]?.includes(to) ?? false;
     }
     
     transition(to: SessionState): void {
       if (!this.canTransition(to)) {
         throw new Error(`Invalid transition from ${this.state} to ${to}`);
       }
       this.state = to;
     }
     
     getState(): SessionState {
       return this.state;
     }
   }
   ```

#### Acceptance Criteria
- [ ] State machine documented
- [ ] All states defined
- [ ] State transitions validated
- [ ] Diagram created
- [ ] State machine class tested

---

### Task 2.3: Create Mock Network Transport

**Priority**: Medium  
**Estimated Time**: 3 hours  
**Dependencies**: Task 2.1

#### Subtasks

1. Create MockNetworkTransport class
   ```typescript
   // src/network/MockNetworkTransport.ts
   export class MockNetworkTransport implements INetworkTransport {
     private connected = false;
     private callbacks: {
       onMessage: ((message: NetworkMessage) => void)[];
       onPeerConnected: ((peerId: string) => void)[];
       onPeerDisconnected: ((peerId: string) => void)[];
       onError: ((error: Error) => void)[];
     } = {
       onMessage: [],
       onPeerConnected: [],
       onPeerDisconnected: [],
       onError: [],
     };
     
     private latencyMs: number;
     private packetLossRate: number;
     
     constructor(options?: {
       latencyMs?: number;
       packetLossRate?: number;
     }) {
       this.latencyMs = options?.latencyMs ?? 0;
       this.packetLossRate = options?.packetLossRate ?? 0;
     }
     
     async connect(sessionId: string): Promise<void> {
       await this.simulateLatency();
       this.connected = true;
       console.log('[Mock] Connected to session:', sessionId);
     }
     
     async disconnect(): Promise<void> {
       this.connected = false;
       console.log('[Mock] Disconnected');
     }
     
     isConnected(): boolean {
       return this.connected;
     }
     
     async send(message: NetworkMessage): Promise<void> {
       if (!this.connected) {
         throw new Error('Not connected');
       }
       
       // Simulate packet loss
       if (Math.random() < this.packetLossRate) {
         console.log('[Mock] Packet lost:', message.type);
         return;
       }
       
       // Simulate latency
       await this.simulateLatency();
       
       // Echo message back (for testing)
       this.callbacks.onMessage.forEach(cb => cb(message));
     }
     
     onMessage(callback: (message: NetworkMessage) => void): void {
       this.callbacks.onMessage.push(callback);
     }
     
     onPeerConnected(callback: (peerId: string) => void): void {
       this.callbacks.onPeerConnected.push(callback);
     }
     
     onPeerDisconnected(callback: (peerId: string) => void): void {
       this.callbacks.onPeerDisconnected.push(callback);
     }
     
     onError(callback: (error: Error) => void): void {
       this.callbacks.onError.push(callback);
     }
     
     private async simulateLatency(): Promise<void> {
       if (this.latencyMs > 0) {
         await new Promise(resolve => setTimeout(resolve, this.latencyMs));
       }
     }
     
     // Test helpers
     simulatePeerConnection(peerId: string): void {
       this.callbacks.onPeerConnected.forEach(cb => cb(peerId));
     }
     
     simulatePeerDisconnection(peerId: string): void {
       this.callbacks.onPeerDisconnected.forEach(cb => cb(peerId));
     }
     
     simulateError(error: Error): void {
       this.callbacks.onError.forEach(cb => cb(error));
     }
   }
   ```

2. Create unit tests
   ```typescript
   // src/network/MockNetworkTransport.test.ts
   import { describe, it, expect, vi } from 'vitest';
   import { MockNetworkTransport } from './MockNetworkTransport';
   import { MessageType } from './types';
   
   describe('MockNetworkTransport', () => {
     it('should connect and disconnect', async () => {
       const transport = new MockNetworkTransport();
       
       expect(transport.isConnected()).toBe(false);
       
       await transport.connect('test-session');
       expect(transport.isConnected()).toBe(true);
       
       await transport.disconnect();
       expect(transport.isConnected()).toBe(false);
     });
     
     it('should send and receive messages', async () => {
       const transport = new MockNetworkTransport();
       await transport.connect('test-session');
       
       const callback = vi.fn();
       transport.onMessage(callback);
       
       const message = {
         type: MessageType.INPUT,
         timestamp: Date.now(),
         senderId: 'test-sender',
         payload: { port: 0, buttons: 0x01 },
       };
       
       await transport.send(message);
       
       expect(callback).toHaveBeenCalledWith(message);
     });
     
     it('should simulate latency', async () => {
       const transport = new MockNetworkTransport({ latencyMs: 100 });
       await transport.connect('test-session');
       
       const start = performance.now();
       await transport.send({
         type: MessageType.INPUT,
         timestamp: Date.now(),
         senderId: 'test',
         payload: {},
       });
       const elapsed = performance.now() - start;
       
       expect(elapsed).toBeGreaterThanOrEqual(100);
     });
     
     it('should simulate packet loss', async () => {
       const transport = new MockNetworkTransport({ packetLossRate: 1.0 }); // 100% loss
       await transport.connect('test-session');
       
       const callback = vi.fn();
       transport.onMessage(callback);
       
       await transport.send({
         type: MessageType.INPUT,
         timestamp: Date.now(),
         senderId: 'test',
         payload: {},
       });
       
       expect(callback).not.toHaveBeenCalled();
     });
   });
   ```

#### Acceptance Criteria
- [ ] MockNetworkTransport implements INetworkTransport
- [ ] Simulates latency correctly
- [ ] Simulates packet loss correctly
- [ ] All unit tests pass
- [ ] Can be used for testing other components

---

### Task 2.4: Design Message Protocol

**Priority**: High  
**Estimated Time**: 4 hours  
**Dependencies**: Task 2.1

#### Subtasks

1. Define binary message format
   ```typescript
   // src/network/MessageCodec.ts
   
   /**
    * Binary message format:
    * 
    * Header (8 bytes):
    *   - Version (1 byte)
    *   - Message Type (1 byte)
    *   - Payload Length (4 bytes, uint32)
    *   - Reserved (2 bytes)
    * 
    * Payload (variable):
    *   - Message-specific data
    */
   
   export class MessageCodec {
     private static VERSION = 1;
     
     static encode(message: NetworkMessage): Uint8Array {
       const payloadData = this.encodePayload(message);
       const header = new Uint8Array(8);
       const view = new DataView(header.buffer);
       
       view.setUint8(0, this.VERSION);
       view.setUint8(1, this.messageTypeToInt(message.type));
       view.setUint32(2, payloadData.length, true); // little-endian
       
       // Combine header and payload
       const result = new Uint8Array(header.length + payloadData.length);
       result.set(header, 0);
       result.set(payloadData, header.length);
       
       return result;
     }
     
     static decode(data: Uint8Array): NetworkMessage {
       const view = new DataView(data.buffer);
       
       const version = view.getUint8(0);
       if (version !== this.VERSION) {
         throw new Error(`Unsupported message version: ${version}`);
       }
       
       const typeInt = view.getUint8(1);
       const type = this.intToMessageType(typeInt);
       const payloadLength = view.getUint32(2, true);
       
       const payloadData = data.slice(8, 8 + payloadLength);
       const payload = this.decodePayload(type, payloadData);
       
       return {
         type,
         timestamp: Date.now(),
         senderId: '', // Set by transport layer
         payload,
       };
     }
     
     private static encodePayload(message: NetworkMessage): Uint8Array {
       switch (message.type) {
         case MessageType.INPUT:
           return this.encodeInputPayload(message.payload as InputMessage['payload']);
         case MessageType.VIDEO_FRAME:
           return this.encodeVideoFramePayload(message.payload as VideoFrameMessage['payload']);
         case MessageType.AUDIO_SAMPLES:
           return this.encodeAudioSamplesPayload(message.payload as AudioSamplesMessage['payload']);
         case MessageType.STATE_SYNC:
           return this.encodeStateSyncPayload(message.payload as StateSyncMessage['payload']);
         case MessageType.SESSION_CONTROL:
           return this.encodeSessionControlPayload(message.payload as SessionControlMessage['payload']);
         default:
           throw new Error(`Unknown message type: ${message.type}`);
       }
     }
     
     private static encodeInputPayload(payload: InputMessage['payload']): Uint8Array {
       const data = new Uint8Array(3);
       data[0] = payload.port;
       data[1] = payload.buttons & 0xFF;
       data[2] = (payload.buttons >> 8) & 0xFF;
       return data;
     }
     
     private static decodeInputPayload(data: Uint8Array): InputMessage['payload'] {
       return {
         port: data[0],
         buttons: data[1] | (data[2] << 8),
       };
     }
     
     // Implement other encode/decode methods...
   }
   ```

2. Implement compression for large messages
   ```typescript
   import pako from 'pako'; // gzip compression library
   
   export class MessageCodec {
     private static COMPRESSION_THRESHOLD = 1024; // 1KB
     
     static encode(message: NetworkMessage): Uint8Array {
       const uncompressed = this.encodeUncompressed(message);
       
       // Compress if above threshold
       if (uncompressed.length > this.COMPRESSION_THRESHOLD) {
         const compressed = pako.gzip(uncompressed);
         
         // Add compression flag to header
         const header = new Uint8Array(1);
         header[0] = 1; // Compressed flag
         
         const result = new Uint8Array(header.length + compressed.length);
         result.set(header, 0);
         result.set(compressed, header.length);
         
         return result;
       }
       
       // Not compressed
       const header = new Uint8Array(1);
       header[0] = 0; // Uncompressed flag
       
       const result = new Uint8Array(header.length + uncompressed.length);
       result.set(header, 0);
       result.set(uncompressed, header.length);
       
       return result;
     }
     
     static decode(data: Uint8Array): NetworkMessage {
       const compressed = data[0] === 1;
       const payload = data.slice(1);
       
       if (compressed) {
         const uncompressed = pako.ungzip(payload);
         return this.decodeUncompressed(uncompressed);
       }
       
       return this.decodeUncompressed(payload);
     }
   }
   ```

3. Document protocol in markdown
   ```markdown
   # Network Protocol Specification
   
   ## Message Format
   
   ### Header (8 bytes)
   - Byte 0: Protocol version (currently 1)
   - Byte 1: Message type
   - Bytes 2-5: Payload length (uint32, little-endian)
   - Bytes 6-7: Reserved for future use
   
   ### Message Types
   - 0x01: INPUT
   - 0x02: VIDEO_FRAME
   - 0x03: AUDIO_SAMPLES
   - 0x04: STATE_SYNC
   - 0x05: SESSION_CONTROL
   
   ### Payload Formats
   
   #### INPUT (3 bytes)
   - Byte 0: Controller port (0-3)
   - Bytes 1-2: Button state (uint16, little-endian)
   
   #### VIDEO_FRAME (variable)
   - Bytes 0-1: Width (uint16)
   - Bytes 2-3: Height (uint16)
   - Bytes 4+: Raw RGBA pixel data
   
   #### AUDIO_SAMPLES (variable)
   - Bytes 0-1: Sample count (uint16)
   - Bytes 2+: Float32 samples (interleaved stereo)
   
   #### STATE_SYNC (variable)
   - Bytes 0+: Emulator save state data
   
   #### SESSION_CONTROL (1 byte)
   - Byte 0: Action (0=START, 1=PAUSE, 2=RESUME, 3=STOP)
   
   ## Versioning
   
   The protocol version is included in every message. Implementations should:
   1. Check version before decoding
   2. Reject unsupported versions
   3. Log version mismatches
   
   Future versions maintain backward compatibility where possible.
   
   ## Compression
   
   Messages larger than 1KB are automatically compressed using gzip.
   Compression flag added to header byte 0.
   ```

4. Create unit tests
   ```typescript
   describe('MessageCodec', () => {
     it('should encode and decode input messages', () => {
       const message: InputMessage = {
         type: MessageType.INPUT,
         timestamp: Date.now(),
         senderId: 'test',
         payload: { port: 0, buttons: 0x0105 },
       };
       
       const encoded = MessageCodec.encode(message);
       const decoded = MessageCodec.decode(encoded);
       
       expect(decoded.type).toBe(MessageType.INPUT);
       expect(decoded.payload).toEqual(message.payload);
     });
     
     it('should handle large messages with compression', () => {
       const largeData = new Uint8Array(10000).fill(0);
       const message: StateSyncMessage = {
         type: MessageType.STATE_SYNC,
         timestamp: Date.now(),
         senderId: 'test',
         payload: { state: largeData },
       };
       
       const encoded = MessageCodec.encode(message);
       
       // Should be compressed
       expect(encoded.length).toBeLessThan(largeData.length);
       
       const decoded = MessageCodec.decode(encoded);
       expect(decoded.payload.state).toEqual(largeData);
     });
   });
   ```

#### Acceptance Criteria
- [ ] Binary message format defined
- [ ] Encoding/decoding functions implemented
- [ ] Compression implemented for large messages
- [ ] Protocol documented
- [ ] All unit tests pass
- [ ] Round-trip encode/decode preserves data

---

## Continuation...

Due to length constraints, the task breakdown continues with similar detail for:
- Phase 3: WebRTC Implementation (Tasks 3.1-3.5)
- Phase 4: Session Management (Tasks 4.1-4.5)
- Phase 5: Polish and Optimization (Tasks 5.1-5.5)
- Phase 6: Extensibility Architecture (Tasks 6.1-6.4)

Each task follows the same format:
- Priority and time estimate
- Dependencies
- Detailed subtasks with code examples
- Acceptance criteria
- Testing approach

This breakdown provides concrete, actionable tasks that any developer (human or AI) can follow to implement the complete MVP.

---

## Notes for Developers

### Using This Document

1. **Follow Tasks Sequentially**: Tasks within a phase build on each other
2. **Check Dependencies**: Don't start a task until dependencies are complete
3. **Validate Each Task**: Run tests and manual validation before moving on
4. **Update Estimates**: Track actual time vs. estimates to improve future planning
5. **Document Issues**: Note any blockers or deviations from the plan

### Getting Help

- **Stuck on a Task**: Review the acceptance criteria and implementation notes
- **Need Clarification**: Check the Project Roadmap for higher-level context
- **Found a Bug**: Document it, fix if related to current task, defer if unrelated
- **Want to Contribute**: Pick any incomplete task and follow the subtasks

### Tracking Progress

Use the checkboxes in each task's acceptance criteria to track completion. Update the PROJECT_ROADMAP.md with completed phases.
