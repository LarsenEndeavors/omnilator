# Debugging Audio and Input Issues

This document explains how to use the debugging features added to track audio and input data flow.

## How to Debug

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Load a ROM file
4. Click Play button
5. Press keyboard keys (X, Z, arrow keys)
6. Observe the console output

## Expected Console Output (When Working)

### Audio Initialization
```
[EmulatorScreen] Load ROM button clicked, initializing audio...
[AudioSystem] Creating AudioContext with 48kHz sample rate
[AudioSystem] AudioContext created, state: running
[AudioSystem] AudioWorklet initialized successfully
```

### ROM Loading
```
[EmulatorScreen] Loading ROM file: game.smc (2048576 bytes)
[EmulatorScreen] ROM loaded successfully
```

### Input Detection
```
[useInput] Key down: x, new button state: 0x100
[Snes9xWasmCore] setInput: Port 0 changed from 0x0 to 0x100
[Snes9xWasmCore] runFrame: Setting input state 0x100
```

### Audio Generation
```
[Snes9xWasmCore] captureAudio: Got 4096 samples, 85/100 non-zero, max amplitude: 0.0234
[AudioSystem] Worklet requested samples, sending 4096 samples (8/10 non-zero)
```

Or with ScriptProcessor fallback:
```
[AudioSystem] Initializing ScriptProcessor fallback with 4096 buffer size
[AudioSystem] ScriptProcessor fallback initialized
[AudioSystem] ScriptProcessor processing 4096 samples (7/10 non-zero)
```

## Troubleshooting Scenarios

### Scenario 1: Audio Context Suspended
**Symptoms:**
```
[AudioSystem] AudioContext created, state: suspended
[AudioSystem] Audio context already in state: suspended
```

**Cause:** Browser autoplay policy blocking audio

**Solution:** Audio initialization must happen on user click (Play/Load ROM button). If this still happens, the user interaction isn't being recognized properly.

---

### Scenario 2: No Audio Samples Generated
**Symptoms:**
```
[Snes9xWasmCore] captureAudio: Got 4096 samples, 0/100 non-zero, max amplitude: 0.0000
```

**Causes:**
- ROM not loaded properly
- WASM core not generating audio
- Sample rate mismatch (should be 48000 Hz)

**Check:**
1. Verify ROM loaded successfully in console
2. Check if `_startWithRom` was called with correct sample rate (48000)
3. Try a different ROM file

---

### Scenario 3: Input Not Reaching WASM
**Symptoms:**
```
[useInput] Key down: x, new button state: 0x100
[Snes9xWasmCore] setInput: Port 0 changed from 0x0 to 0x100
```
But NO `runFrame` log showing input being set.

**Causes:**
- Emulator not running (FPS = 0)
- ROM not loaded yet

**Solution:** Ensure Play button is pressed and FPS counter shows ~60

---

### Scenario 4: Input Being Set But Game Not Responding
**Symptoms:**
```
[Snes9xWasmCore] runFrame: Setting input state 0x100
```
But game doesn't respond to input.

**Causes:**
- WASM `_setJoypadInput()` function not working
- Button mapping incorrect
- ROM expects different input format

**Check:**
1. Verify button hex codes match SNES button definitions:
   - UP: 0x10
   - DOWN: 0x20
   - LEFT: 0x40
   - RIGHT: 0x80
   - A: 0x100
   - B: 0x200
   - X: 0x400
   - Y: 0x800
   - L: 0x1000
   - R: 0x2000
   - START: 0x4000
   - SELECT: 0x8000

---

### Scenario 5: Audio Worklet Fails to Load
**Symptoms:**
```
[AudioSystem] AudioWorklet not available, falling back to ScriptProcessor
[AudioSystem] ScriptProcessor fallback initialized
```

**This is OK:** ScriptProcessor is a valid fallback. Audio should still work.

---

### Scenario 6: "soundbuffer stuck!!" Error
**Symptoms:**
```
soundbuffer stuck!!
outToExternalBufferSamplePos = 2048
soundBufferOutPos = 2048
```

**Causes:**
- Audio not being consumed fast enough
- Buffer size mismatch (should be 4096)
- Audio context not running

**Check:**
1. Verify AudioContext state is "running"
2. Verify ScriptProcessor or AudioWorklet is requesting samples
3. Check if `captureAudio` is being called every frame

---

## Common Button Hex Codes

| Button | Hex Code |
|--------|----------|
| None   | 0x0      |
| A      | 0x100    |
| B      | 0x200    |
| X      | 0x400    |
| Y      | 0x800    |
| UP     | 0x10     |
| DOWN   | 0x20     |
| LEFT   | 0x40     |
| RIGHT  | 0x80     |
| A+B    | 0x300    |
| UP+A   | 0x110    |

## Keyboard Mapping

| Key | SNES Button |
|-----|-------------|
| X   | A           |
| Z   | B           |
| V   | X           |
| C   | Y           |
| Q   | L           |
| E   | R           |
| Enter | START     |
| Shift | SELECT    |
| Arrow Keys | D-Pad |
| WASD | D-Pad (alt) |

## What to Report

When reporting issues, include:
1. Full console output (copy/paste)
2. Which logs appear and which don't
3. ROM file name and size
4. Browser and version
5. Any error messages (in red)

## Technical Details

### Audio Pipeline
```
WASM _mainLoop() 
  → generates audio samples (Float32Array, 4096 samples)
  → _getSoundBuffer() returns pointer
  → captureAudio() copies to JS
  → AudioWorklet/ScriptProcessor requests samples
  → Web Audio API plays audio
```

### Input Pipeline
```
Keyboard/Gamepad event
  → useInput hook processes
  → updateButtons() called
  → onInputChange callback
  → core.setInput() stores state
  → runFrame() calls _setJoypadInput()
  → WASM processes input
```
