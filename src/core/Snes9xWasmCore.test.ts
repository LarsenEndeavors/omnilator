import { beforeEach, describe, expect, it } from 'vitest';
import { Snes9xWasmCore } from './Snes9xWasmCore';
import {
  AudioBufferConstants,
  VideoBufferConstants,
} from './types/Snes9xWasmModule';
import {
  createMockModule,
  MockSnes9xWasmModule,
} from './__mocks__/MockSnes9xWasmModule';

describe('Snes9xWasmCore (skeleton)', () => {
  let module: MockSnes9xWasmModule;
  let core: Snes9xWasmCore;

  beforeEach(() => {
    module = createMockModule();
    core = new Snes9xWasmCore('snes9x_2005', undefined, async () => module);
  });

  it('initializes and loads ROM using provided module', async () => {
    const rom = new Uint8Array(512);

    await core.loadROM(rom);

    expect(module._startWithRom).toHaveBeenCalledWith(
      expect.any(Number),
      rom.length,
      expect.any(Number)
    );
  });

  it('runs a frame and exposes video/audio buffers', async () => {
    const rom = new Uint8Array(1024);
    await core.loadROM(rom);

    await core.runFrame();

    const frame = core.getBuffer();
    const audio = core.getAudioSamples();

    expect(frame.width).toBe(VideoBufferConstants.WIDTH);
    expect(frame.height).toBe(VideoBufferConstants.HEIGHT);
    expect(audio.length).toBe(AudioBufferConstants.TOTAL_SAMPLES);
  });

  it('captures save/load state round trip', async () => {
    const rom = new Uint8Array(2048);
    await core.loadROM(rom);
    await core.runFrame(); // advance mock frame counter

    const saved = core.saveState();
    const savedFrameCount = module.getMockState().frameCount;

    module.simulateFrames(5);
    expect(module.getMockState().frameCount).toBeGreaterThan(savedFrameCount);

    core.loadState(saved);
    expect(module.getMockState().frameCount).toBe(savedFrameCount);
  });

  it('throws for invalid input port', () => {
    expect(() => core.setInput(5, 0)).toThrowError(/Port must be between 0 and 3/);
  });
});
