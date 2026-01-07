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
[EmulatorScreen] Initializing audio system...
[AudioSystem] Creating AudioContext with 48kHz sample rate and interactive latency
[AudioSystem] AudioContext created successfully
  - State: running
  - Sample Rate: 48000 Hz
  - Base Latency: 5.33ms
[AudioSystem] Loading AudioWorklet from /audio-processor.js
[AudioSystem] ✅ AudioWorklet initialized successfully with interactive latency
[EmulatorScreen] Audio system initialized successfully
```

### ROM Loading
```
[EmulatorScreen] Loading ROM file: game.smc (2048576 bytes)
[EmulatorScreen] ROM loaded successfully
```

### Input Detection
```
[useInput] Key down: x, new button state: 0x100
```

Note: Verbose input logging has been removed from production. Input state changes
are tracked by the hook and passed to the core without console spam.

### Audio Generation (Healthy Buffer)
```
[AudioWorklet] Received 4096 samples, buffer now: 8192 samples (85.3ms)
[AudioWorklet] ✓ Healthy buffer: 85.3ms (8192 samples), No underruns in last second
```

Note: Healthy audio logs only appear every 10 seconds to avoid spam.

### Audio Generation (Low Buffer Warning)
```
[AudioWorklet] ⚠️ Buffer: 21.3ms (2048 samples), Min: 18.7ms, Underruns: 3/sec
```

This indicates the audio buffer is running low and choppy audio may occur.

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

### Scenario 2: Audio Buffer Underruns
**Symptoms:**
```
[AudioWorklet] ⚠️ Buffer: 21.3ms (2048 samples), Min: 18.7ms, Underruns: 5/sec
```

**Causes:**
- Frame generation too slow (check FPS counter - should be ~60)
- Main thread blocking (check for JavaScript errors)
- Insufficient buffer headroom (though 8192 sample threshold should prevent this)

**Check:**
1. Verify FPS is stable at 60
2. Check if there are JavaScript errors in console
3. Try a different ROM file
4. Close other browser tabs to free up CPU

**Buffer Size Reference:**
- **Healthy**: 8192+ samples (85ms+)
- **Low**: 2048-8192 samples (21-85ms)
- **Critical**: <2048 samples (<21ms) - underruns likely

### Scenario 3: Input Not Working
**Symptoms:**
Keys pressed but game doesn't respond.

**Causes:**
- Emulator not running (FPS = 0)
- ROM not loaded yet
- Wrong key mapping

**Solution:** 
1. Ensure Play button is pressed and FPS counter shows ~60
2. Check keyboard mapping matches README.md:
   - X key → A button
   - Z key → B button
   - V key → X button
   - C key → Y button
   - Arrow keys or WASD → D-pad
   - Q → L, E → R
   - Enter → START, Shift → SELECT
3. Try pressing different keys to verify mapping

---

### Scenario 4: ScriptProcessor Fallback
**Symptoms:**
```
[AudioSystem] AudioWorklet not available, falling back to ScriptProcessor
[AudioSystem] ✅ ScriptProcessor fallback initialized
```

**This is OK:** ScriptProcessor is a valid fallback for older browsers.
Audio should still work, though with slightly higher latency.

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

## Keyboard Mapping (REDESIGNED)

The keyboard mapping has been completely redesigned for clarity and correctness.
Each key maps to EXACTLY ONE SNES button:

| Key | SNES Button | Hex Code |
|-----|-------------|----------|
| **D-Pad (Arrow Keys)** | | |
| Arrow Up | UP | 0x10 |
| Arrow Down | DOWN | 0x20 |
| Arrow Left | LEFT | 0x40 |
| Arrow Right | RIGHT | 0x80 |
| **D-Pad (WASD Alternative)** | | |
| W | UP | 0x10 |
| S | DOWN | 0x20 |
| A | LEFT | 0x40 |
| D | RIGHT | 0x80 |
| **Action Buttons** | | |
| X | A | 0x100 |
| Z | B | 0x1 |
| V | X | 0x200 |
| C | Y | 0x2 |
| **Shoulder Buttons** | | |
| Q | L | 0x400 |
| E | R | 0x800 |
| **Start/Select** | | |
| Enter | START | 0x8 |
| Shift | SELECT | 0x4 |

**Important Notes:**
- All letter keys are lowercase (browser default)
- Arrow keys work independently from WASD
- Both can be used simultaneously
- Multiple buttons combine with bitwise OR

## What to Report

When reporting issues, include:
1. Full console output (copy/paste)
2. Which logs appear and which don't
3. ROM file name and size
4. Browser and version
5. Any error messages (in red)

## Technical Details

### Audio Pipeline (IMPROVED)
```
WASM _mainLoop() 
  → generates audio samples (Float32Array, 4096 samples per frame)
  → _getSoundBuffer() returns pointer
  → captureAudio() copies to JS
  → AudioWorklet buffer (maintained at 8192+ samples = 85ms+)
  → AudioWorklet requests more samples when < 8192
  → Web Audio API plays audio at 48kHz
```

**Buffer Thresholds:**
- **Request threshold**: 8192 samples (85ms) - request more samples
- **Low warning**: 2048 samples (21ms) - critically low
- **Target**: 12288 samples (128ms) - ideal buffer size

### Input Pipeline (REDESIGNED)
```
Keyboard/Gamepad event
  → useInput hook processes
  → Tracks pressed keys in Set (prevents duplicates)
  → Calculates button bitmask
  → onInputChange callback (only when state changes)
  → core.setInput() stores state
  → runFrame() calls _setJoypadInput()
  → WASM processes input
```

**Key Improvements:**
- No duplicate input events
- Respects enabled flag
- Only calls callback on actual state changes
- Clear, documented key mapping
