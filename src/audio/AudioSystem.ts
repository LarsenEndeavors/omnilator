import type { IEmulatorCore } from '../core/IEmulatorCore';

/**
 * Audio system using WebAudio API with AudioWorklet for low-latency streaming
 */
export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isInitialized = false;
  private core: IEmulatorCore | null = null;

  constructor() {
    // Audio context will be created on user interaction
  }

  /**
   * Initialize the audio system
   * Must be called after user interaction due to browser autoplay policies
   */
  async initialize(core: IEmulatorCore): Promise<void> {
    if (this.isInitialized) {
      console.log('[AudioSystem] Already initialized');
      return;
    }

    try {
      this.core = core;
      console.log('[AudioSystem] Creating AudioContext with 48kHz sample rate');
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      console.log(`[AudioSystem] AudioContext created, state: ${this.audioContext.state}`);

      // Load and register the audio worklet processor
      try {
        console.log('[AudioSystem] Attempting to load AudioWorklet from /audio-processor.js');
        await this.audioContext.audioWorklet.addModule('/audio-processor.js');
        
        // Create the audio worklet node
        this.audioWorkletNode = new AudioWorkletNode(
          this.audioContext,
          'emulator-audio-processor',
          {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
          }
        );

        // Connect to destination
        this.audioWorkletNode.connect(this.audioContext.destination);

        // Set up message handling for audio data
        this.audioWorkletNode.port.onmessage = this.handleAudioRequest.bind(this);

        this.isInitialized = true;
        console.log('[AudioSystem] AudioWorklet initialized successfully');
      } catch (workletError) {
        console.warn('[AudioSystem] AudioWorklet not available, falling back to ScriptProcessor', workletError);
        this.initializeFallback();
      }
    } catch (error) {
      console.error('[AudioSystem] Failed to initialize audio system:', error);
      throw error;
    }
  }

  /**
   * Fallback to ScriptProcessorNode if AudioWorklet is not available
   */
  private initializeFallback(): void {
    if (!this.audioContext) return;

    console.log('[AudioSystem] Initializing ScriptProcessor fallback with 4096 buffer size');
    const bufferSize = 4096; // Match the WASM buffer size
    const processor = this.audioContext.createScriptProcessor(bufferSize, 0, 2);

    processor.onaudioprocess = (event) => {
      if (!this.core) return;

      const outputL = event.outputBuffer.getChannelData(0);
      const outputR = event.outputBuffer.getChannelData(1);
      const samples = this.core.getAudioSamples();

      // Debug: Check audio data periodically (every 60 frames = 1 second at 60fps)
      if (Math.random() < 0.017) { // ~1/60 chance
        let nonZeroCount = 0;
        for (let i = 0; i < Math.min(10, samples.length); i++) {
          if (samples[i] !== 0) nonZeroCount++;
        }
        console.log(`[AudioSystem] ScriptProcessor processing ${samples.length} samples (${nonZeroCount}/10 non-zero)`);
      }

      // De-interleave stereo samples
      for (let i = 0; i < bufferSize; i++) {
        outputL[i] = samples[i * 2] || 0;
        outputR[i] = samples[i * 2 + 1] || 0;
      }
    };

    processor.connect(this.audioContext.destination);
    this.isInitialized = true;
    console.log('[AudioSystem] ScriptProcessor fallback initialized');
  }

  /**
   * Handle audio data requests from the worklet
   */
  private handleAudioRequest(event: MessageEvent): void {
    if (event.data.type === 'request-samples' && this.core) {
      const samples = this.core.getAudioSamples();
      
      // Debug: Check if we're getting non-zero audio samples
      let nonZeroCount = 0;
      for (let i = 0; i < Math.min(10, samples.length); i++) {
        if (samples[i] !== 0) nonZeroCount++;
      }
      
      console.log(`[AudioSystem] Worklet requested samples, sending ${samples.length} samples (${nonZeroCount}/10 non-zero)`);
      
      this.audioWorkletNode?.port.postMessage({
        type: 'samples',
        samples: samples,
      });
    }
  }

  /**
   * Start audio playback
   */
  async start(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[AudioSystem] Resuming audio context');
      await this.audioContext.resume();
      console.log(`[AudioSystem] Audio context state after resume: ${this.audioContext.state}`);
    } else if (this.audioContext) {
      console.log(`[AudioSystem] Audio context already in state: ${this.audioContext.state}`);
    }
  }

  /**
   * Stop audio playback
   */
  async stop(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  /**
   * Set audio volume
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({
        type: 'set-volume',
        volume: Math.max(0, Math.min(1, volume)),
      });
    }
  }

  /**
   * Clean up audio resources
   */
  cleanup(): void {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.core = null;
  }
}
