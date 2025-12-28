import type { IEmulatorCore } from './IEmulatorCore';

/**
 * Mock SNES emulator core for development and testing
 * 
 * This is a demonstration implementation that shows the emulator infrastructure
 * is working (rendering loop, input handling, audio system) without requiring
 * external WASM dependencies.
 * 
 * Use Cases:
 * - Development and testing when LibRetro cores are not available
 * - CI/CD environments without network access
 * - Demonstrating the emulator UI and controls
 * 
 * This mock generates:
 * - Animated gradient video output
 * - Button state indicators
 * - Placeholder audio
 * 
 * For actual SNES emulation, use SnesCore with a LibRetro core.
 */
export class MockSnesCore implements IEmulatorCore {
  private width = 256;
  private height = 224;
  private audioBuffer: Float32Array = new Float32Array(2048);
  private videoBuffer: Uint8Array = new Uint8Array(this.width * this.height * 4);
  private inputState: number[] = [0, 0, 0, 0]; // Support 4 controller ports (0-3)
  private isInitialized = false;
  private frameCount = 0;

  async initialize(): Promise<void> {
    console.log('MockSnesCore: Initialized (demo mode - no actual emulation)');
    this.isInitialized = true;
  }

  async loadROM(romData: Uint8Array): Promise<void> {
    console.log(`MockSnesCore: ROM loaded (${romData.length} bytes) - demo mode only`);
  }

  async runFrame(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }
    this.generateMockFrame();
    this.frameCount++;
  }

  getBuffer(): ImageData {
    const imageData = new ImageData(this.width, this.height);
    imageData.data.set(this.videoBuffer);
    return imageData;
  }

  getAudioSamples(): Float32Array {
    return this.audioBuffer;
  }

  setInput(port: number, buttons: number): void {
    if (port < 0 || port > 3) {
      throw new Error(`Invalid port number: ${port}. Must be 0-3 for 4-player support.`);
    }
    this.inputState[port] = buttons;
  }

  saveState(): Uint8Array {
    return new Uint8Array(1024);
  }

  loadState(state: Uint8Array): void {
    console.log('MockSnesCore: State loaded', state.length, 'bytes');
  }

  reset(): void {
    this.frameCount = 0;
    console.log('MockSnesCore: Reset');
  }

  cleanup(): void {
    this.isInitialized = false;
  }

  /**
   * Generate a mock frame for testing purposes
   * Creates a visual pattern that responds to controller input
   */
  private generateMockFrame(): void {
    const time = this.frameCount / 60; // Convert frame count to seconds
    
    // Base gradient background
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 4;
        const r = Math.floor(128 + 127 * Math.sin(x / 32 + time));
        const g = Math.floor(128 + 127 * Math.sin(y / 32 + time));
        const b = Math.floor(128 + 127 * Math.sin((x + y) / 32 + time));
        
        this.videoBuffer[index] = r;
        this.videoBuffer[index + 1] = g;
        this.videoBuffer[index + 2] = b;
        this.videoBuffer[index + 3] = 255;
      }
    }

    // Draw "DEMO MODE" text
    this.drawText('DEMO MODE', 10, 10, 255, 255, 0);
    this.drawText('LibRetro core not loaded', 10, 30, 255, 200, 0);

    // Draw input indicators
    this.drawInputIndicators();

    // Generate mock audio samples (very quiet to avoid audio spikes)
    for (let i = 0; i < this.audioBuffer.length; i++) {
      this.audioBuffer[i] = Math.sin(time * 440 * Math.PI * 2 * i / 48000) * 0.01;
    }
  }

  /**
   * Draw simple text (basic pixel font)
   */
  private drawText(text: string, x: number, y: number, r: number, g: number, b: number): void {
    // Simple 5x7 pixel font - only implement a few characters
    const chars: { [key: string]: number[] } = {
      'D': [0x7C, 0x82, 0x82, 0x82, 0x7C],
      'E': [0xFE, 0x80, 0xFC, 0x80, 0xFE],
      'M': [0x82, 0xC6, 0xAA, 0x92, 0x82],
      'O': [0x7C, 0x82, 0x82, 0x82, 0x7C],
      ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
      'L': [0x80, 0x80, 0x80, 0x80, 0xFE],
      'i': [0x00, 0x40, 0x00, 0x40, 0x40],
      'b': [0x80, 0x80, 0xFC, 0x82, 0x7C],
      'R': [0x7C, 0x82, 0x7C, 0x88, 0x84],
      'e': [0x00, 0x7C, 0x90, 0x90, 0x7C],
      't': [0x40, 0xF0, 0x40, 0x40, 0x30],
      'r': [0x00, 0x5C, 0x60, 0x40, 0x40],
      'o': [0x00, 0x7C, 0x82, 0x82, 0x7C],
      'c': [0x00, 0x7C, 0x80, 0x80, 0x7C],
      'n': [0x00, 0xFC, 0x82, 0x82, 0x82],
      'd': [0x02, 0x02, 0x7E, 0x82, 0x7E],
      'a': [0x00, 0x7C, 0x02, 0x7E, 0x82],
    };

    let xPos = x;
    for (const char of text) {
      const pattern = chars[char] || chars[' '];
      for (let row = 0; row < 5; row++) {
        const byte = pattern[row];
        for (let col = 0; col < 8; col++) {
          if (byte & (1 << (7 - col))) {
            this.setPixel(xPos + col, y + row, r, g, b);
          }
        }
      }
      xPos += 6; // Character width + spacing
    }
  }

  /**
   * Set a single pixel
   */
  private setPixel(x: number, y: number, r: number, g: number, b: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = (y * this.width + x) * 4;
      this.videoBuffer[index] = r;
      this.videoBuffer[index + 1] = g;
      this.videoBuffer[index + 2] = b;
      this.videoBuffer[index + 3] = 255;
    }
  }

  /**
   * Draw input indicators to show buttons are being registered
   */
  private drawInputIndicators(): void {
    const drawBox = (x: number, y: number, width: number, height: number, r: number, g: number, b: number) => {
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
            const index = (py * this.width + px) * 4;
            this.videoBuffer[index] = r;
            this.videoBuffer[index + 1] = g;
            this.videoBuffer[index + 2] = b;
            this.videoBuffer[index + 3] = 255;
          }
        }
      }
    };

    // Button indicators
    const buttonSize = 20;
    const padding = 10;
    const yPos = 60; // Below text

    // D-Pad indicators
    if (this.inputState[0] & (1 << 4)) { // UP
      drawBox(this.width / 2 - buttonSize / 2, yPos, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 5)) { // DOWN
      drawBox(this.width / 2 - buttonSize / 2, yPos + buttonSize * 2, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 6)) { // LEFT
      drawBox(this.width / 2 - buttonSize * 1.5, yPos + buttonSize, buttonSize, buttonSize, 255, 255, 0);
    }
    if (this.inputState[0] & (1 << 7)) { // RIGHT
      drawBox(this.width / 2 + buttonSize / 2, yPos + buttonSize, buttonSize, buttonSize, 255, 255, 0);
    }

    // Action buttons (right side)
    const buttonX = this.width - padding - buttonSize * 3;
    if (this.inputState[0] & (1 << 0)) { // B
      drawBox(buttonX, yPos + buttonSize, buttonSize, buttonSize, 255, 0, 0);
    }
    if (this.inputState[0] & (1 << 8)) { // A
      drawBox(buttonX + buttonSize * 2, yPos + buttonSize, buttonSize, buttonSize, 0, 255, 0);
    }
    if (this.inputState[0] & (1 << 1)) { // Y
      drawBox(buttonX, yPos, buttonSize, buttonSize, 0, 0, 255);
    }
    if (this.inputState[0] & (1 << 9)) { // X
      drawBox(buttonX + buttonSize * 2, yPos, buttonSize, buttonSize, 0, 255, 255);
    }

    // Shoulder buttons
    if (this.inputState[0] & (1 << 10)) { // L
      drawBox(padding, yPos, buttonSize * 2, buttonSize, 200, 200, 200);
    }
    if (this.inputState[0] & (1 << 11)) { // R
      drawBox(this.width - padding - buttonSize * 2, yPos, buttonSize * 2, buttonSize, 200, 200, 200);
    }

    // Start/Select
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    if (this.inputState[0] & (1 << 3)) { // START
      drawBox(centerX + buttonSize, centerY, buttonSize, buttonSize / 2, 255, 255, 255);
    }
    if (this.inputState[0] & (1 << 2)) { // SELECT
      drawBox(centerX - buttonSize * 2, centerY, buttonSize, buttonSize / 2, 150, 150, 150);
    }
  }
}
