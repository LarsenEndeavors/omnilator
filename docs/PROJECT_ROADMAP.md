# Omnilator Project Roadmap

## Vision Statement

Omnilator is a browser-based multiplayer emulator platform enabling users to play classic console games (NES through PS2 era) from anywhere. Users can host or join game sessions, with the host running the emulation and streaming video while guests provide input. All functionality runs entirely in modern web browsers with no installation required.

## MVP Definition

The **Minimum Viable Product** demonstrates the core multiplayer emulation concept using SNES as the reference platform:

### MVP Success Criteria
- ✅ **Multi-Device Access**: Users can access the site from PC, phone, tablet
- ✅ **Session Hosting**: One user can host a SNES game session
- ✅ **Remote Play**: Other users can join and play the hosted game
- ✅ **Real-Time Streaming**: Video and audio stream from host to guests
- ✅ **Input Synchronization**: Guest controller input affects host emulation
- ✅ **Browser-Only**: No native apps, servers run emulation, or downloads required

### Out of Scope for MVP
- ❌ Multiple emulator platforms (focus on SNES only)
- ❌ Advanced features (rewind, fast-forward, shaders)
- ❌ User accounts or authentication
- ❌ Persistent storage or cloud saves
- ❌ Matchmaking or lobby system beyond basic room codes

## Architectural Principles

These guiding principles (the "Holy Texts") inform all implementation decisions:

### 1. Interface-First Design
Define TypeScript interfaces before implementing features. This ensures:
- Clear contracts between components
- Easy testing with mocks
- Future extensibility
- Self-documenting architecture

### 2. Separation of Concerns
Organize code by responsibility:
- `core/` - Emulator logic (platform-agnostic)
- `network/` - Multiplayer synchronization
- `components/` - React UI
- `hooks/` - React lifecycle management
- `audio/` - WebAudio streaming
- `data/` - Configuration and metadata

### 3. Browser-First APIs
Leverage native browser capabilities:
- Canvas API for rendering
- WebAudio API for low-latency audio
- WebRTC for peer-to-peer networking
- Gamepad API for controller support
- requestAnimationFrame for frame pacing

### 4. Immutable State Management
Use React patterns with immutability for predictable state changes

### 5. Self-Documenting Code
Structure reveals missing features:
- Mock implementations indicate incomplete work
- Unused hooks show integration opportunities
- TODO comments mark explicit next steps

## Technology Stack

### Core Technologies
- **React 19**: UI framework
- **TypeScript 5.9**: Type safety and tooling
- **Vite 7**: Build tool and dev server
- **Vitest**: Unit and integration testing

### Browser APIs
- **WebAssembly**: Emulator core execution
- **WebRTC**: Peer-to-peer networking (DataChannel for input, MediaStream for A/V)
- **WebAudio**: Low-latency audio with AudioWorklet
- **Canvas API**: Hardware-accelerated rendering
- **Gamepad API**: Controller support

### Emulator Core
- **snes9x2005-wasm**: SNES emulation via LibRetro API
- Located in: `public/snes/core/snes9x2005-wasm-master/`

## Current State Assessment

### ✅ Completed Foundation
- Interface-first architecture (`IEmulatorCore`)
- Emulator lifecycle hooks (`useEmulator`, `useInput`)
- Audio system with AudioWorklet
- Input handling (keyboard + gamepad)
- Canvas rendering at 60 FPS
- Save state infrastructure
- Mock implementations for development
- LibRetro integration layer (needs actual core)
- Comprehensive documentation

### 🚧 In Progress / Needs Work
- **snes9xWASM Integration**: Mock core needs replacement with actual snes9x2005-wasm
- **Network Layer**: No multiplayer functionality yet
- **Session Management**: No host/join logic

### ❌ Not Started
- WebRTC peer-to-peer networking
- Input synchronization over network
- Video/audio streaming to guests
- Session creation and joining
- UI for multiplayer features
- Multi-platform emulator support

## Development Phases

Following "Tidy First" principles, we organize work into small, independent changes that can be validated individually before moving to the next. Each phase builds on the previous while maintaining working software.

---

## Phase 1: Foundation - snes9xWASM Integration

**Goal**: Replace mock/LibRetro fallback with actual snes9x2005-wasm core

**Why First**: Must have working single-player emulation before adding multiplayer complexity. This validates the core architecture.

### 1.1: Analyze snes9x2005-wasm Structure
- [ ] Study build.sh and understand compilation
- [ ] Identify exported functions from C source
- [ ] Map exports to LibRetro API
- [ ] Document expected function signatures
- [ ] Create type definitions for WASM module

**Deliverable**: Document `docs/SNES9X_WASM_API.md` mapping exports to IEmulatorCore methods

**Validation**: Documentation reviewed and type definitions compile

---

### 1.2: Build snes9x2005-wasm
- [ ] Install Emscripten SDK if needed
- [ ] Run build.sh to compile WASM
- [ ] Verify output files (snes9x_2005.js, snes9x_2005.wasm)
- [ ] Copy built files to `public/snes/core/`
- [ ] Update .gitignore to exclude build artifacts if needed

**Deliverable**: Working WASM files in `public/snes/core/`

**Validation**: Files exist and have reasonable sizes (~1-3 MB for .wasm)

---

### 1.3: Create Snes9xWasmCore Wrapper
- [ ] Create `src/core/Snes9xWasmCore.ts` implementing `IEmulatorCore`
- [ ] Implement WASM module loading
- [ ] Map LibRetro callbacks to snes9x2005 exports
- [ ] Handle memory management (HEAP8, malloc, free)
- [ ] Implement pixel format conversion
- [ ] Implement audio sample handling

**Deliverable**: `Snes9xWasmCore` class that loads and initializes snes9x2005-wasm

**Validation**: 
```typescript
const core = new Snes9xWasmCore();
await core.initialize();
// Should load without errors
```

---

### 1.4: Implement ROM Loading
- [ ] Implement `loadROM()` to copy ROM data to WASM memory
- [ ] Call snes9x2005 initialization functions
- [ ] Handle ROM format detection (.smc vs .sfc headers)
- [ ] Validate ROM loaded successfully
- [ ] Add error handling for invalid ROMs

**Deliverable**: Working `loadROM()` implementation

**Validation**: Load test ROM from `public/snes/test_roms/` without errors

---

### 1.5: Implement Frame Execution
- [ ] Implement `runFrame()` to execute one emulation frame
- [ ] Extract video buffer from WASM memory
- [ ] Convert to ImageData format
- [ ] Extract audio samples from WASM memory
- [ ] Convert to Float32Array format

**Deliverable**: Working `runFrame()`, `getBuffer()`, `getAudioSamples()`

**Validation**: Display actual game graphics on canvas (not mock gradient)

---

### 1.6: Implement Input and State Management
- [ ] Implement `setInput()` to pass button states to core
- [ ] Implement `saveState()` to serialize emulator state
- [ ] Implement `loadState()` to deserialize state
- [ ] Implement `reset()` to restart emulation
- [ ] Implement `cleanup()` to free resources

**Deliverable**: Complete `IEmulatorCore` implementation

**Validation**: All methods work correctly with test ROM

---

### 1.7: Update SnesCore to Use Snes9xWasmCore
- [ ] Modify `SnesCore` constructor to use `Snes9xWasmCore` by default
- [ ] Keep fallback to `MockSnesCore` if WASM fails to load
- [ ] Update documentation
- [ ] Add loading indicators in UI

**Deliverable**: Working SNES emulation in `EmulatorScreen`

**Validation**: Load and play test ROM with keyboard/gamepad input

---

### 1.8: Testing and Polish
- [ ] Test all SNES buttons (B, Y, SELECT, START, D-Pad, A, X, L, R)
- [ ] Test save states (save slot, continue playing, load slot)
- [ ] Test reset functionality
- [ ] Verify 60 FPS performance
- [ ] Test audio synchronization
- [ ] Test with multiple ROM files
- [ ] Fix any bugs discovered

**Deliverable**: Stable, fully-functional single-player SNES emulator

**Validation**: Manual testing checklist passes for all features

---

## Phase 2: Network Architecture Foundation

**Goal**: Establish the networking layer abstractions without implementing multiplayer yet

**Why Second**: With working emulation, we can now design the network layer. We define interfaces first (interface-first design) before implementing.

### 2.1: Define Network Interfaces
- [ ] Create `src/network/INetworkTransport.ts` interface
  - Methods: connect(), disconnect(), send(), receive()
  - Events: onMessage, onPeerConnected, onPeerDisconnected
- [ ] Create `src/network/ISession.ts` interface
  - Session types: Host vs Guest
  - Methods: createSession(), joinSession(), leaveSession()
- [ ] Create message protocol types in `src/network/types.ts`
  - InputMessage (button states)
  - VideoFrameMessage (frame data)
  - AudioSamplesMessage (audio data)
  - StateSync (periodic state snapshots)
  - SessionControl (start, pause, stop)

**Deliverable**: Complete TypeScript interface definitions

**Validation**: Interfaces compile, documented with JSDoc, no implementation yet

---

### 2.2: Define Session State Machine
- [ ] Document session lifecycle states
  - IDLE → CREATING → HOSTING → ACTIVE → CLOSED
  - IDLE → JOINING → GUEST → ACTIVE → CLOSED
- [ ] Create `src/network/SessionState.ts` enum and types
- [ ] Document state transitions and events
- [ ] Create state machine diagram in docs

**Deliverable**: Session state machine documentation

**Validation**: State transitions documented and reviewed

---

### 2.3: Create Mock Network Transport
- [ ] Implement `MockNetworkTransport` for testing
- [ ] Simulate message passing with setTimeout
- [ ] Simulate connection/disconnection events
- [ ] Allow configuring latency and packet loss
- [ ] Use for unit testing without real network

**Deliverable**: `MockNetworkTransport` class for testing

**Validation**: Unit tests using mock transport pass

---

### 2.4: Design Message Protocol
- [ ] Define binary message format (efficient over DataChannel)
- [ ] Create serialization/deserialization functions
- [ ] Handle message versioning for future compatibility
- [ ] Document protocol in `docs/NETWORK_PROTOCOL.md`
- [ ] Define message size limits and compression strategy

**Deliverable**: Message protocol specification and utilities

**Validation**: Round-trip serialize/deserialize tests pass

---

## Phase 3: WebRTC Peer-to-Peer Implementation

**Goal**: Implement real peer-to-peer networking using WebRTC

**Why Third**: With interfaces defined, we can implement the actual transport layer.

### 3.1: WebRTC Transport Implementation
- [ ] Create `src/network/WebRTCTransport.ts` implementing `INetworkTransport`
- [ ] Set up RTCPeerConnection configuration
- [ ] Implement ICE candidate handling
- [ ] Implement DataChannel for input messages
- [ ] Add connection state monitoring
- [ ] Handle reconnection logic

**Deliverable**: Basic WebRTC connection between two peers

**Validation**: Two browser tabs can establish WebRTC connection

---

### 3.2: Signaling Server (Simple)
- [ ] Create minimal signaling mechanism for peer discovery
- [ ] Option A: Use Firebase Realtime Database (no backend needed)
- [ ] Option B: Use PeerJS (includes signaling)
- [ ] Option C: Simple WebSocket server for dev (optional)
- [ ] Implement session code generation (6-digit room codes)
- [ ] Implement offer/answer exchange

**Deliverable**: Peers can discover each other via room codes

**Validation**: User A creates room "123456", User B joins "123456", connection established

---

### 3.3: Video/Audio Streaming Setup
- [ ] Set up MediaStream from Canvas (captureStream())
- [ ] Add audio track to MediaStream
- [ ] Send MediaStream over WebRTC (addTrack)
- [ ] Receive MediaStream on guest
- [ ] Handle stream playback on guest side
- [ ] Optimize bitrate and quality

**Deliverable**: Host video/audio streams to guest

**Validation**: Guest sees and hears host's gameplay

---

### 3.4: Input Synchronization
- [ ] Serialize guest input to binary messages
- [ ] Send input over DataChannel
- [ ] Receive input on host
- [ ] Apply guest input to emulator
- [ ] Handle input buffering for multiple guests
- [ ] Add input timestamping

**Deliverable**: Guest input controls host emulation

**Validation**: Guest presses buttons, host emulator responds

---

### 3.5: Error Handling and Resilience
- [ ] Handle connection failures gracefully
- [ ] Implement reconnection logic
- [ ] Handle host disconnect (end session)
- [ ] Handle guest disconnect (remove from session)
- [ ] Add network quality indicators
- [ ] Log connection events for debugging

**Deliverable**: Robust network error handling

**Validation**: Manually trigger network issues, system recovers or fails gracefully

---

## Phase 4: Multiplayer Session Management

**Goal**: Build the session management layer and UI for hosting/joining

**Why Fourth**: With networking working, we add the orchestration layer.

### 4.1: Session Manager Implementation
- [ ] Create `src/network/SessionManager.ts`
- [ ] Implement host session creation
- [ ] Implement guest session joining
- [ ] Manage peer connections (add/remove guests)
- [ ] Handle session lifecycle
- [ ] Implement graceful shutdown

**Deliverable**: SessionManager class managing multiplayer sessions

**Validation**: Unit tests for session creation/joining pass

---

### 4.2: Host Role Implementation
- [ ] Integrate SessionManager with EmulatorScreen
- [ ] Host runs emulation (runFrame)
- [ ] Host captures video/audio
- [ ] Host streams to all guests
- [ ] Host receives and applies guest input
- [ ] Host maintains single source of truth

**Deliverable**: Working host role functionality

**Validation**: Host can run game and stream to guests

---

### 4.3: Guest Role Implementation
- [ ] Guest receives video/audio stream
- [ ] Guest renders received stream (not local emulation)
- [ ] Guest sends input to host
- [ ] Guest displays connection status
- [ ] Guest handles latency indicators
- [ ] Guest can leave session cleanly

**Deliverable**: Working guest role functionality

**Validation**: Guest can join, play, and leave session

---

### 4.4: Session UI Components
- [ ] Create `SessionLobby.tsx` component
  - Host/Join buttons
  - Room code display/input
  - Player list
  - Start game button
- [ ] Create `SessionControls.tsx` component
  - Leave session button
  - Player indicator
  - Network quality display
  - Latency meter
- [ ] Update `EmulatorScreen` to integrate session controls
- [ ] Add loading states and error messages

**Deliverable**: Complete multiplayer UI

**Validation**: User can navigate full host/join flow via UI

---

### 4.5: Multi-Player Input (4 Controllers)
- [ ] Assign guest IDs to controller ports
- [ ] Guest 1 → Port 1 (host always port 0)
- [ ] Guest 2 → Port 2
- [ ] Guest 3 → Port 3
- [ ] Handle port assignment UI
- [ ] Test with 2-4 player games
- [ ] Display port assignments in UI

**Deliverable**: Support for up to 4 simultaneous players

**Validation**: Load 4-player ROM, test with multiple guests

---

## Phase 5: Polish and Optimization

**Goal**: Refine the MVP for production readiness

**Why Fifth**: Core functionality works, now optimize for real-world use.

### 5.1: Performance Optimization
- [ ] Profile frame timing on host
- [ ] Optimize video encoding (reduce bitrate if needed)
- [ ] Optimize DataChannel message size
- [ ] Implement frame skipping if needed
- [ ] Test on mobile devices
- [ ] Optimize for battery life on mobile

**Deliverable**: Smooth 60 FPS on target devices

**Validation**: Performance metrics meet targets (60 FPS, <100ms latency)

---

### 5.2: Network Optimization
- [ ] Implement input prediction/interpolation
- [ ] Add frame buffering for stream smoothing
- [ ] Optimize message serialization
- [ ] Reduce bandwidth usage where possible
- [ ] Test on various network conditions (throttle to 3G)

**Deliverable**: Playable experience on slower networks

**Validation**: Testing on simulated poor network conditions

---

### 5.3: User Experience Polish
- [ ] Add loading indicators during connection
- [ ] Improve error messages (user-friendly)
- [ ] Add help/tutorial overlay
- [ ] Improve visual feedback for input
- [ ] Add sound effects for UI interactions
- [ ] Mobile-responsive design
- [ ] Touch controls for mobile guests

**Deliverable**: Polished, intuitive UI

**Validation**: User testing with non-technical users

---

### 5.4: Testing and Quality Assurance
- [ ] Write unit tests for network layer
- [ ] Write integration tests for session flow
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on multiple devices (PC, phone, tablet)
- [ ] Test edge cases (disconnect mid-game, etc.)
- [ ] Load testing (max guests per session)
- [ ] Security review (input validation, etc.)

**Deliverable**: Comprehensive test coverage

**Validation**: All tests pass, manual testing checklist complete

---

### 5.5: Documentation and Deployment
- [ ] Update README with multiplayer instructions
- [ ] Document hosting requirements
- [ ] Create user guide for hosting/joining
- [ ] Document network requirements (ports, STUN/TURN)
- [ ] Set up deployment pipeline
- [ ] Deploy to production hosting (Vercel/Netlify)
- [ ] Create demo video

**Deliverable**: Production-ready MVP

**Validation**: MVP deployed and accessible, documentation complete

---

## Phase 6: Extensibility Architecture

**Goal**: Prepare the codebase for multi-platform emulator support

**Why Sixth**: MVP complete, now design for future growth without implementing other platforms.

### 6.1: Emulator Core Registry
- [ ] Create `src/core/CoreRegistry.ts`
- [ ] Define `IEmulatorCoreFactory` interface
- [ ] Register SNES core
- [ ] Support dynamic core loading
- [ ] Document adding new cores

**Deliverable**: Pluggable core architecture

**Validation**: SNES core works through registry, architecture documented

---

### 6.2: Platform Abstraction
- [ ] Define `IPlatform` interface
  - Platform name (SNES, NES, Genesis, etc.)
  - Supported file extensions
  - Controller layout
  - Resolution
  - Frame rate
- [ ] Implement `SnesPlatform`
- [ ] Create platform selection UI placeholder
- [ ] Document platform addition process

**Deliverable**: Platform abstraction layer

**Validation**: SNES works through platform interface

---

### 6.3: Multi-Platform UI Structure
- [ ] Design platform selector component
- [ ] Update session creation to include platform choice
- [ ] Design core settings UI (future)
- [ ] Create stubs for future platforms
- [ ] Document UI extension points

**Deliverable**: UI ready for multiple platforms

**Validation**: UI mockups reviewed, implementation hooks documented

---

### 6.4: Core Loading Strategy
- [ ] Design lazy loading for emulator cores
- [ ] Create core download/cache mechanism
- [ ] Handle core updates
- [ ] Design core metadata format
- [ ] Document core packaging

**Deliverable**: Scalable core loading system

**Validation**: Core can be loaded on-demand

---

## Future Phases (Post-MVP)

### Phase 7: Additional Emulator Platforms
- NES (Nintendo Entertainment System)
- Genesis/Mega Drive (Sega)
- Game Boy / Game Boy Color
- Game Boy Advance
- N64 (stretch goal)
- PlayStation 1 (stretch goal)
- PlayStation 2 (stretch goal)

### Phase 8: Advanced Features
- Rewind functionality
- Fast forward (2x-4x speed)
- Video filters (scanlines, CRT shader)
- Cheats and Game Genie codes
- RetroAchievements integration
- Cloud save states (optional backend)

### Phase 9: Social Features
- User accounts (optional)
- Friend lists
- Public/private sessions
- Session browser
- Chat system
- Spectator mode (watch without playing)

### Phase 10: Platform Maturity
- Mobile native apps (React Native)
- Desktop apps (Electron)
- Performance monitoring
- Analytics
- A/B testing
- Monetization strategy (if applicable)

---

## Testing Strategy

### Unit Tests
- Test all core interfaces with mocks
- Test message serialization/deserialization
- Test state machine transitions
- Test input handling

### Integration Tests
- Test emulator core integration
- Test network transport
- Test session lifecycle
- Test end-to-end flows

### Manual Testing
- Test on multiple browsers
- Test on multiple devices
- Test network conditions
- Test with real users

### Performance Testing
- Frame rate consistency
- Latency measurements
- Bandwidth usage
- Battery consumption

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebRTC compatibility issues | High | Test on all major browsers, provide fallback messaging |
| Network latency too high | High | Implement prediction/interpolation, set expectations |
| WASM performance on mobile | Medium | Profile early, optimize critical paths, test on low-end devices |
| Browser security restrictions | Medium | Document requirements, use HTTPS, request permissions properly |
| Save state incompatibility | Low | Version states, validate before loading |

### Project Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | High | Stick to MVP definition, defer nice-to-haves |
| Integration complexity | Medium | Build incrementally, test each phase |
| Time estimation errors | Medium | Break tasks down further, track actual time |
| Dependencies on external services | Low | Design for self-hosting, minimize external deps |

---

## Success Metrics

### MVP Success
- ✅ Two users can play SNES game together remotely
- ✅ 60 FPS performance on modern hardware
- ✅ <150ms end-to-end latency on good networks
- ✅ Works on Chrome, Firefox, Safari (latest versions)
- ✅ Works on desktop and mobile
- ✅ No installation required
- ✅ Session creation < 30 seconds
- ✅ Positive feedback from early users

### Long-Term Success
- Support 5+ emulator platforms
- 1000+ active users per month
- <5% crash rate
- >80% user satisfaction
- Active community contributions

---

## Development Guidelines

### Code Quality
- Follow existing TypeScript patterns
- Write self-documenting code
- Prefer composition over inheritance
- Keep functions small and focused
- Write tests for complex logic

### Git Workflow
- Small, focused commits
- Descriptive commit messages
- One feature per branch
- Code review before merge
- Keep main branch deployable

### Documentation
- Update docs with code changes
- Document complex algorithms
- Add JSDoc to public APIs
- Keep roadmap current
- Write user-facing guides

### Communication
- Use GitHub issues for tasks
- Use PR descriptions for context
- Document decisions in ADRs (Architecture Decision Records)
- Share progress regularly
- Ask for help when stuck

---

## Dependency Management

### Core Dependencies
- React 19 (UI framework)
- TypeScript 5.9 (type safety)
- Vite 7 (build tool)
- Vitest (testing)

### Network Dependencies
- WebRTC (browser native)
- Firebase or PeerJS (signaling, choose one)

### Emulator Dependencies
- snes9x2005-wasm (SNES core)
- Emscripten (build tool for cores)
- Future cores as added

### Optional Dependencies
- STUN/TURN servers (for NAT traversal)
- Analytics (if added)
- Error tracking (if added)

---

## Timeline Estimates

**Note**: These are rough estimates for a single developer working part-time. Adjust based on team size and availability.

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1 (snes9x Integration) | 2-3 weeks | None |
| Phase 2 (Network Interfaces) | 1 week | Phase 1 |
| Phase 3 (WebRTC) | 2-3 weeks | Phase 2 |
| Phase 4 (Session Management) | 2 weeks | Phase 3 |
| Phase 5 (Polish) | 2-3 weeks | Phase 4 |
| Phase 6 (Extensibility) | 1-2 weeks | Phase 5 |
| **Total MVP** | **10-14 weeks** | |

Additional platforms: +1-2 weeks each
Advanced features: +1-4 weeks depending on feature
Social features: +3-6 weeks

---

## Conclusion

This roadmap provides a clear, sequential path from the current codebase to a production-ready multiplayer SNES emulator (MVP) with extensibility for future platforms. By following the "Tidy First" philosophy, we make small, verifiable changes that maintain working software at every step.

The interface-first design ensures loose coupling and testability. The browser-first approach leverages native APIs for performance. The separation of concerns keeps the codebase maintainable as it grows.

Each phase builds on the previous while delivering tangible value. Developers (human or AI) can follow this roadmap linearly, knowing that each task is properly scoped and sequenced.

For questions or to propose changes to this roadmap, please open a GitHub issue or discussion.

---

**Last Updated**: 2025-12-28  
**Status**: Initial Draft  
**Next Review**: After Phase 1 completion
