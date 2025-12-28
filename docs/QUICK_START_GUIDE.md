# Omnilator Quick Start Guide for Agents

This is a companion guide to the [Project Roadmap](PROJECT_ROADMAP.md) and [Task Breakdown](TASK_BREAKDOWN.md). Use this when you need to quickly orient yourself to the project or start working on a task.

---

## What is Omnilator?

Browser-based multiplayer emulator platform. MVP: SNES games playable from anywhere, one user hosts, others join and play.

**Tech**: React, TypeScript, WebAssembly, WebRTC

---

## Project Status (Quick View)

### ✅ Done
- Interface-first architecture
- Emulator lifecycle hooks
- Audio/video systems (local)
- Mock emulator for testing
- LibRetro integration layer (needs core)
- Build and dev infrastructure

### 🚧 Current Work
- **Phase 1**: Integrate actual snes9xWASM core

### 🔜 Next
- **Phase 2**: Network layer interfaces
- **Phase 3**: WebRTC implementation
- **Phase 4**: Session management (host/join)
- **Phase 5**: Polish for production
- **Phase 6**: Extensibility for more platforms

---

## File Structure

```
omnilator/
├── src/
│   ├── core/              ← Emulator implementations
│   │   ├── IEmulatorCore.ts          (interface)
│   │   ├── SnesCore.ts               (SNES wrapper)
│   │   ├── Snes9xWasmCore.ts         (TODO: Phase 1)
│   │   ├── LibRetroCore.ts           (fallback)
│   │   └── MockSnesCore.ts           (demo mode)
│   ├── network/           ← TODO: Phase 2-4
│   ├── components/        ← React UI
│   ├── hooks/             ← React hooks
│   ├── audio/             ← Audio system
│   └── data/              ← Config/metadata
├── public/
│   ├── snes/
│   │   ├── core/
│   │   │   └── snes9x2005-wasm-master/  ← C source
│   │   └── test_roms/                   ← Test ROMs
│   └── audio-processor.js
└── docs/
    ├── PROJECT_ROADMAP.md             ← Strategic overview
    ├── TASK_BREAKDOWN.md              ← Detailed tasks
    ├── EMULATOR_INTEGRATION.md        ← Current docs
    ├── LIBRETRO_IMPLEMENTATION.md     ← Technical ref
    └── QUICK_START_GUIDE.md           ← This file
```

---

## Working on a Task

### 1. Find Your Task
- Check `docs/PROJECT_ROADMAP.md` for phase overview
- Check `docs/TASK_BREAKDOWN.md` for detailed steps
- Follow tasks in order (dependencies matter!)

### 2. Before Starting
```bash
# Update your branch
git pull origin main

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

### 3. While Working
- Follow the subtasks in order
- Check acceptance criteria after each subtask
- Run tests frequently
- Commit small, focused changes

### 4. Testing
```bash
# Run tests
npm test

# Run linter
npm run lint

# Build to check for errors
npm run build
```

### 5. Completing a Task
- [ ] All subtasks done
- [ ] All acceptance criteria met
- [ ] Tests pass
- [ ] Code linted
- [ ] Documentation updated
- [ ] Commit and push

---

## Common Commands

```bash
# Development
npm run dev          # Start dev server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run unit tests
npm test:coverage    # Test with coverage report
npm test:ui          # Interactive test UI

# Code Quality
npm run lint         # Run ESLint

# Emscripten (for Phase 1)
cd public/snes/core/snes9x2005-wasm-master
./build.sh           # Build snes9x WASM
```

---

## Phase 1 Checklist (Current Priority)

Working on integrating snes9x2005-wasm core:

- [ ] Task 1.1: Analyze snes9x2005-wasm structure
- [ ] Task 1.2: Build snes9x2005-wasm
- [ ] Task 1.3: Create Snes9xWasmCore wrapper
- [ ] Task 1.4: Implement ROM loading
- [ ] Task 1.5: Implement frame execution
- [ ] Task 1.6: Implement input and state management
- [ ] Task 1.7: Update SnesCore to use Snes9xWasmCore
- [ ] Task 1.8: Testing and polish

**Current Blocker**: None  
**Next Milestone**: Working SNES emulation with real core

---

## Key Interfaces

### IEmulatorCore (The Foundation)
```typescript
interface IEmulatorCore {
  loadROM(romData: Uint8Array): Promise<void>;
  runFrame(): Promise<void>;
  getBuffer(): ImageData;
  getAudioSamples(): Float32Array;
  setInput(port: number, buttons: number): void;
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;
  reset(): void;
  cleanup(): void;
}
```

All emulator cores implement this interface.

### Button Bitmasks
```typescript
const SnesButton = {
  B: 1 << 0,      // 0x0001
  Y: 1 << 1,      // 0x0002
  SELECT: 1 << 2, // 0x0004
  START: 1 << 3,  // 0x0008
  UP: 1 << 4,     // 0x0010
  DOWN: 1 << 5,   // 0x0020
  LEFT: 1 << 6,   // 0x0040
  RIGHT: 1 << 7,  // 0x0080
  A: 1 << 8,      // 0x0100
  X: 1 << 9,      // 0x0200
  L: 1 << 10,     // 0x0400
  R: 1 << 11,     // 0x0800
};
```

---

## Architecture Principles (The Holy Texts)

### 1. Interface-First Design
Define interfaces before implementing. See `IEmulatorCore` as the prime example.

### 2. Separation of Concerns
Each directory has one responsibility:
- `core/` = emulation
- `network/` = multiplayer
- `components/` = UI
- `hooks/` = React lifecycle
- `audio/` = sound

### 3. Browser-First APIs
Use native APIs: Canvas, WebAudio, WebRTC, Gamepad API

### 4. Immutable State
React state changes create new objects, never mutate

### 5. Self-Documenting Code
Structure reveals intent. Mock implementations show what's incomplete.

---

## Debugging Tips

### Emulator Not Working
1. Check browser console for errors
2. Verify WASM files exist in `public/snes/core/`
3. Check if using mock mode: `core.isInMockMode()`
4. Verify ROM file is valid (.smc or .sfc)

### Poor Performance
1. Check FPS counter in UI
2. Profile `runFrame()` execution time
3. Verify running at 60 Hz (not faster)
4. Check for memory leaks (heap growth)

### Audio Issues
1. Check browser autoplay policy
2. Verify audio samples are being generated
3. Check sample rate matches (48kHz default)
4. Ensure AudioContext is resumed

### Network Issues (Future)
1. Check browser supports WebRTC
2. Verify STUN server connectivity
3. Check firewall settings
4. Test on same network first

---

## Testing Strategy

### Unit Tests
- Test interfaces with mocks
- Test utility functions
- Test state machines
- Fast, isolated, deterministic

### Integration Tests
- Test component interactions
- Test emulator with test ROMs
- Test network flows
- Slower, more realistic

### Manual Tests
- Load and play ROMs
- Test all buttons
- Test save states
- Test across browsers/devices

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/task-name

# Make changes and commit
git add .
git commit -m "Implement task X.Y: description"

# Push and create PR
git push origin feature/task-name
```

**Commit Message Format**:
```
[Phase X] Task X.Y: Short description

- Change 1
- Change 2
- Change 3

Acceptance criteria:
- [x] Criterion 1
- [x] Criterion 2
```

---

## Resources

### Project Documentation
- [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) - Strategic plan
- [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md) - Detailed tasks
- [EMULATOR_INTEGRATION.md](EMULATOR_INTEGRATION.md) - Integration guide
- [LIBRETRO_IMPLEMENTATION.md](LIBRETRO_IMPLEMENTATION.md) - Technical details

### External References
- [LibRetro API](https://docs.libretro.com/)
- [Emscripten Docs](https://emscripten.org/docs/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Code References
- "Tidy First?" by Kent Beck (in `docs/Reference_Documentation/`)
- "Clean Code" by Robert Martin (in `docs/Reference_Documentation/`)
- "Code Complete" by Steve McConnell (in `docs/Reference_Documentation/`)

---

## FAQ

### Q: Where do I start?
**A**: Read PROJECT_ROADMAP.md, then start with Phase 1, Task 1.1

### Q: Can I skip ahead?
**A**: No, tasks have dependencies. Follow the order.

### Q: What if I get stuck?
**A**: Check the task's implementation notes and acceptance criteria. Review existing code for patterns. Ask for help if needed.

### Q: How do I test my changes?
**A**: Run `npm test` for unit tests. Use `npm run dev` and test manually in browser.

### Q: Should I add tests?
**A**: Yes, if implementing new functionality. Match existing test patterns.

### Q: Can I refactor existing code?
**A**: Only if it's part of your current task. Don't refactor unrelated code.

### Q: What if I find a bug?
**A**: Fix it if it's related to your task. Otherwise, document it and continue.

### Q: How do I know when a phase is done?
**A**: All tasks completed, all acceptance criteria met, all tests passing.

---

## Quick Task Templates

### For Implementing a New Feature
1. Define interface first (if applicable)
2. Write tests (red)
3. Implement (green)
4. Refactor (clean)
5. Document
6. Commit

### For Fixing a Bug
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test passes
4. Check no regressions
5. Commit

### For Adding Documentation
1. Identify what needs documenting
2. Write clear, concise docs
3. Add code examples
4. Review for accuracy
5. Commit

---

## Communication

### When to Ask for Help
- Blocked for >2 hours
- Unclear requirements
- Technical decision needed
- Found security issue

### How to Report Progress
- Use PR descriptions
- Update task checklists
- Share in team channels
- Tag relevant people

### What to Include in PRs
- Task number and description
- Changes made
- Testing done
- Screenshots (if UI changes)
- Related issues

---

## Success Metrics

### Phase 1 Success
- ✅ SNES emulation works with real core
- ✅ 60 FPS on desktop
- ✅ Audio synchronized
- ✅ All buttons work
- ✅ Save states work

### MVP Success (After Phase 5)
- ✅ Two users can play together remotely
- ✅ <150ms latency on good networks
- ✅ Works on Chrome, Firefox, Safari
- ✅ Works on desktop and mobile
- ✅ No installation required

---

## Remember

- **Start small**: One task at a time
- **Test often**: Catch bugs early
- **Document changes**: Help future you
- **Ask questions**: Better than guessing
- **Follow the plan**: Tasks are sequenced for a reason
- **Have fun**: You're building something cool! 🎮

---

**Last Updated**: 2025-12-28  
**Current Phase**: Phase 1 (snes9xWASM Integration)  
**Next Review**: After Phase 1 completion
