# Project Roadmap - Visual Summary

This document provides a visual overview of the complete project roadmap for Omnilator.

---

## 🎯 Vision

**Omnilator**: Browser-based multiplayer emulator platform  
**MVP**: SNES games playable from anywhere, host/join sessions  
**Timeline**: 10-14 weeks (single developer)  
**Tech**: React + TypeScript + WebAssembly + WebRTC

---

## 📊 Development Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT → MVP → FUTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: snes9xWASM Integration         ████░░░░░ (2-3 weeks)│
│  ├─ Build WASM core                                            │
│  ├─ Implement Snes9xWasmCore                                   │
│  ├─ ROM loading & frame execution                              │
│  └─ Testing & polish                                           │
│                                                                 │
│  Phase 2: Network Interfaces              ░░░░░░░░░ (1 week)  │
│  ├─ Define INetworkTransport                                   │
│  ├─ Define ISession                                            │
│  ├─ Message protocol                                           │
│  └─ Mock transport for testing                                 │
│                                                                 │
│  Phase 3: WebRTC Implementation          ░░░░░░░░░ (2-3 weeks)│
│  ├─ WebRTCTransport class                                      │
│  ├─ Signaling mechanism                                        │
│  ├─ Video/audio streaming                                      │
│  └─ Input synchronization                                      │
│                                                                 │
│  Phase 4: Session Management             ░░░░░░░░░ (2 weeks)  │
│  ├─ SessionManager implementation                              │
│  ├─ Host role                                                  │
│  ├─ Guest role                                                 │
│  └─ Session UI components                                      │
│                                                                 │
│  Phase 5: Polish & Optimization          ░░░░░░░░░ (2-3 weeks)│
│  ├─ Performance optimization                                   │
│  ├─ Network optimization                                       │
│  ├─ UX polish                                                  │
│  └─ Testing & QA                                               │
│                                                                 │
│  Phase 6: Extensibility Architecture     ░░░░░░░░░ (1-2 weeks)│
│  ├─ Core registry                                              │
│  ├─ Platform abstraction                                       │
│  └─ Multi-platform UI                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend: ████ = In Progress  ░░░░ = Planned
```

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Emulator   │  │ Session      │  │ Settings     │           │
│  │ Screen     │  │ Lobby        │  │ Panel        │           │
│  └────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                      REACT HOOKS LAYER                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ useEmulator│  │ useInput     │  │ useSession   │           │
│  └────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                        │
│  ┌────────────────┐              ┌──────────────────┐          │
│  │ Emulator Core  │              │ Session Manager  │          │
│  │ (IEmulatorCore)│◄────────────►│ (ISession)       │          │
│  └────────────────┘              └──────────────────┘          │
│         ↕                                 ↕                     │
│  ┌────────────────┐              ┌──────────────────┐          │
│  │ Snes9xWasmCore │              │ Network Transport│          │
│  │ (Phase 1)      │              │ (INetworkTransport)│         │
│  └────────────────┘              └──────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER APIs LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Canvas   │  │ WebAudio │  │ WebRTC   │  │ Gamepad  │       │
│  │ API      │  │ API      │  │ API      │  │ API      │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Single Player (Phase 1)
```
┌──────────┐
│   User   │
└────┬─────┘
     │ Input (keyboard/gamepad)
     ↓
┌─────────────────┐
│   useInput      │ → Button bitmask
└────┬────────────┘
     ↓
┌─────────────────┐
│ Snes9xWasmCore  │ ← ROM data
│  ┌───────────┐  │
│  │  runFrame │  │
│  └───────────┘  │
└────┬───┬────────┘
     │   │
     │   └─────────────┐
     ↓                 ↓
┌──────────┐      ┌──────────┐
│  Canvas  │      │WebAudio  │
│  (Video) │      │ (Audio)  │
└──────────┘      └──────────┘
```

### Multiplayer (Phases 2-4)
```
HOST                                    GUEST(S)
┌──────────────┐                       ┌──────────────┐
│ Snes9xWasm   │                       │   Browser    │
│    Core      │                       │              │
└───┬──┬───┬───┘                       └──────┬───────┘
    │  │   │                                  │
    │  │   └──────── Video/Audio ────────────┤
    │  │              Stream                  │
    │  │            (MediaStream)             │
    │  │                                      │
    │  └────────── State Sync ────────────────┤
    │            (periodic)                   │
    │                                         │
    └──────────── Input ◄──────────────────── Input
              (DataChannel)              (buttons)

     WebRTC Connection
     ├─ MediaStream (video/audio) → Host to Guest
     └─ DataChannel (input) → Guest to Host
```

---

## 📋 Task Progress Tracker

### Phase 1: snes9xWASM Integration ⏳ IN PROGRESS

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 1.1 | Analyze snes9x structure | 4 hours | 🔲 TODO |
| 1.2 | Build WASM | 2 hours | 🔲 TODO |
| 1.3 | Create Snes9xWasmCore | 8 hours | 🔲 TODO |
| 1.4 | Implement ROM loading | 4 hours | 🔲 TODO |
| 1.5 | Implement frame execution | 6 hours | 🔲 TODO |
| 1.6 | Implement input & states | 4 hours | 🔲 TODO |
| 1.7 | Update SnesCore | 2 hours | 🔲 TODO |
| 1.8 | Testing & polish | 8 hours | 🔲 TODO |

**Total Phase 1**: ~38 hours (2-3 weeks)

---

### Phase 2: Network Architecture 🔲 PLANNED

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 2.1 | Define network interfaces | 4 hours | 🔲 TODO |
| 2.2 | Define session state machine | 2 hours | 🔲 TODO |
| 2.3 | Create mock transport | 3 hours | 🔲 TODO |
| 2.4 | Design message protocol | 4 hours | 🔲 TODO |

**Total Phase 2**: ~13 hours (1 week)

---

### Phase 3: WebRTC Implementation 🔲 PLANNED

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 3.1 | WebRTC transport | 8 hours | 🔲 TODO |
| 3.2 | Signaling server | 6 hours | 🔲 TODO |
| 3.3 | Video/audio streaming | 8 hours | 🔲 TODO |
| 3.4 | Input synchronization | 6 hours | 🔲 TODO |
| 3.5 | Error handling | 4 hours | 🔲 TODO |

**Total Phase 3**: ~32 hours (2-3 weeks)

---

### Phase 4: Session Management 🔲 PLANNED

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 4.1 | SessionManager | 6 hours | 🔲 TODO |
| 4.2 | Host role | 6 hours | 🔲 TODO |
| 4.3 | Guest role | 6 hours | 🔲 TODO |
| 4.4 | Session UI | 8 hours | 🔲 TODO |
| 4.5 | Multi-player (4 controllers) | 4 hours | 🔲 TODO |

**Total Phase 4**: ~30 hours (2 weeks)

---

### Phase 5: Polish & Optimization 🔲 PLANNED

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 5.1 | Performance optimization | 8 hours | 🔲 TODO |
| 5.2 | Network optimization | 6 hours | 🔲 TODO |
| 5.3 | UX polish | 8 hours | 🔲 TODO |
| 5.4 | Testing & QA | 12 hours | 🔲 TODO |
| 5.5 | Documentation & deployment | 6 hours | 🔲 TODO |

**Total Phase 5**: ~40 hours (2-3 weeks)

---

### Phase 6: Extensibility 🔲 PLANNED

| Task | Description | Est. Time | Status |
|------|-------------|-----------|--------|
| 6.1 | Core registry | 4 hours | 🔲 TODO |
| 6.2 | Platform abstraction | 4 hours | 🔲 TODO |
| 6.3 | Multi-platform UI | 4 hours | 🔲 TODO |
| 6.4 | Core loading strategy | 4 hours | 🔲 TODO |

**Total Phase 6**: ~16 hours (1-2 weeks)

---

## 🎯 MVP Success Criteria

```
✅ Functional Requirements
├─ Two users can play SNES game together remotely
├─ Host runs emulation, guests provide input
├─ Real-time video/audio streaming
├─ 60 FPS performance on modern hardware
├─ Works on desktop and mobile
└─ No installation required

✅ Technical Requirements
├─ <150ms end-to-end latency on good networks
├─ Works on Chrome, Firefox, Safari (latest)
├─ Session creation < 30 seconds
├─ Graceful degradation on poor networks
└─ Clean error handling

✅ Quality Requirements
├─ All tests pass
├─ Code linted
├─ Documentation complete
├─ Positive user feedback
└─ <5% crash rate
```

---

## 🚀 Future Roadmap (Post-MVP)

```
Phase 7: Additional Platforms
├─ NES (Nintendo Entertainment System)
├─ Genesis/Mega Drive
├─ Game Boy / Game Boy Color
├─ Game Boy Advance
├─ N64 (stretch)
└─ PlayStation 1-2 (stretch)

Phase 8: Advanced Features
├─ Rewind functionality
├─ Fast forward
├─ Video filters (scanlines, CRT)
├─ Cheats & Game Genie
└─ RetroAchievements integration

Phase 9: Social Features
├─ User accounts
├─ Friend lists
├─ Public/private sessions
├─ Session browser
└─ Chat & spectator mode

Phase 10: Platform Maturity
├─ Mobile native apps
├─ Desktop apps (Electron)
├─ Performance monitoring
└─ Analytics & optimization
```

---

## 📚 Documentation Map

```
docs/
├─ PROJECT_ROADMAP.md          ← Strategic overview (this is the source)
├─ VISUAL_SUMMARY.md           ← This document (visual reference)
├─ TASK_BREAKDOWN.md           ← Detailed implementation guide
├─ QUICK_START_GUIDE.md        ← Quick reference for devs/agents
├─ EMULATOR_INTEGRATION.md     ← Emulator integration guide
└─ LIBRETRO_IMPLEMENTATION.md  ← Technical deep dive

Each document serves a purpose:
├─ Roadmap: "What are we building and why?"
├─ Visual: "Show me the big picture"
├─ Tasks: "How do I implement this?"
├─ Quick Start: "I need to get started quickly"
└─ Technical: "How does this work technically?"
```

---

## 🎓 Architectural Principles (The Holy Texts)

### 1️⃣ Interface-First Design
```typescript
// Define the contract FIRST
interface IEmulatorCore {
  loadROM(romData: Uint8Array): Promise<void>;
  runFrame(): Promise<void>;
  // ... etc
}

// Then implement
class Snes9xWasmCore implements IEmulatorCore {
  // Implementation details
}
```

### 2️⃣ Separation of Concerns
```
src/
├─ core/      ← Emulation logic only
├─ network/   ← Networking only
├─ components/← UI only
├─ hooks/     ← React lifecycle only
└─ audio/     ← Audio only
```

### 3️⃣ Browser-First APIs
```javascript
// Use native browser capabilities
Canvas API      → Hardware-accelerated rendering
WebAudio API    → Low-latency audio
WebRTC API      → Peer-to-peer networking
Gamepad API     → Controller support
```

### 4️⃣ Immutable State
```typescript
// ✅ GOOD: Create new state
setState(prev => [...prev, newItem]);

// ❌ BAD: Mutate state
state.push(newItem);
setState(state);
```

### 5️⃣ Self-Documenting Code
```typescript
// Code structure reveals intent
// Missing directory? → Feature not implemented
// Mock implementation? → Real version needed
// TODO comment? → Explicit next step
```

---

## 🔧 Quick Commands

```bash
# Development
npm install           # Install dependencies
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview build

# Quality
npm test              # Run tests
npm run lint          # Lint code
npm test:coverage     # Test with coverage

# Phase 1 Specific
cd public/snes/core/snes9x2005-wasm-master
./build.sh            # Build snes9x WASM
```

---

## 📞 Getting Help

**Stuck on a task?**
1. Check TASK_BREAKDOWN.md for detailed steps
2. Review acceptance criteria
3. Look at existing code for patterns
4. Check QUICK_START_GUIDE.md FAQ

**Need context?**
1. Read PROJECT_ROADMAP.md for strategy
2. Check this VISUAL_SUMMARY.md for big picture
3. Review technical docs (EMULATOR_INTEGRATION.md, etc.)

**Found a bug?**
1. Document it clearly
2. Fix if related to current task
3. Defer if unrelated (add issue)

---

## 🏁 Current Status

```
Phase 1: snes9xWASM Integration
Status: ⏳ IN PROGRESS
Next Task: 1.1 - Analyze snes9x structure

All documentation complete:
✅ PROJECT_ROADMAP.md (strategic plan)
✅ TASK_BREAKDOWN.md (implementation guide)
✅ QUICK_START_GUIDE.md (quick reference)
✅ VISUAL_SUMMARY.md (this document)

Ready to start development! 🚀
```

---

**Last Updated**: 2025-12-28  
**Version**: 1.0  
**Status**: Documentation Complete, Development Ready
