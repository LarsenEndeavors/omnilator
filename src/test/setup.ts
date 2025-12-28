import '@testing-library/jest-dom';

// Mock ImageData for canvas operations
global.ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number);
  constructor(data: Uint8ClampedArray, width: number, height?: number);
  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      // new ImageData(width, height)
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      // new ImageData(data, width, height?)
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height || dataOrWidth.length / (widthOrHeight * 4);
    }
  }
} as unknown as typeof global.ImageData;

// Mock WebAudio API
global.AudioContext = class AudioContext {
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 },
    };
  }
  createBufferSource() {
    return {
      connect: () => {},
      start: () => {},
      buffer: null,
    };
  }
  get destination() {
    return {};
  }
  get sampleRate() {
    return 48000;
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(0),
    };
  }
  close() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
} as unknown as typeof global.AudioContext;

// Mock Gamepad API
Object.defineProperty(navigator, 'getGamepads', {
  writable: true,
  value: () => [],
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  return setTimeout(() => cb(Date.now()), 16) as unknown as number;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};


