---
name: Add LibRetro Cores and Test ROMs
about: Required files for full emulation functionality
title: 'Add LibRetro cores and test ROMs to enable real emulation'
labels: enhancement, infrastructure
assignees: LarsenEndeavors
---

# Add LibRetro Cores and Test ROMs

## Description

To enable full SNES ROM emulation and comprehensive testing, we need to add the LibRetro cores and test ROMs to the repository.

## Required Files

### LibRetro Cores (Priority: High)

Download from [LibRetro buildbot](https://buildbot.libretro.com/stable/latest/emscripten/) and place in `public/cores/`:

**Recommended:**
- [ ] `snes9x_libretro.js` (JavaScript loader) 
- [ ] `snes9x_libretro.wasm` (WASM module)

**Size estimate:** ~2-5 MB per core

### Test ROMs (Priority: High)

Legally distributable homebrew test ROMs:
- [ ] 240p Test Suite
- [ ] SNES Test Cartridge  
- [ ] Homebrew games

**Place in:** `public/roms/test/`

## Steps

1. Create directories: `mkdir -p public/cores public/roms/test`
2. Download snes9x core from buildbot
3. Download homebrew test ROMs
4. Test emulation works
5. Update documentation

## Success Criteria

- [ ] Emulator runs without "DEMO MODE" banner
- [ ] Can load and play test ROMs 
- [ ] All tests pass with real cores
- [ ] Documentation updated

See full details in `.github/ISSUE_TEMPLATE/add-cores-roms.md`
