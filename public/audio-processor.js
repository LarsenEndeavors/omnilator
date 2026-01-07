/**
 * Audio Worklet Processor for low-latency audio streaming
 * 
 * This processor runs in the audio worklet thread (separate from main thread)
 * for real-time audio processing with minimal latency and no blocking.
 * 
 * Buffer Strategy:
 * - Maintain a large buffer (8192 samples = ~170ms at 48kHz) to prevent underruns
 * - Request new samples when buffer drops below 50% (4096 samples = ~85ms)
 * - This provides headroom for frame timing variations and prevents choppy audio
 * 
 * Performance Metrics:
 * - Tracks buffer health (samples available in milliseconds)
 * - Counts underruns per second
 * - Logs warnings when buffer is low
 */
class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Audio sample buffer (interleaved stereo: [L, R, L, R, ...])
    this.sampleBuffer = [];
    
    // Volume control (0.0 to 1.0)
    this.volume = 1.0;
    
    // Request management
    this.requestPending = false;
    
    // Performance metrics
    this.frameCount = 0;
    this.underrunCount = 0;
    this.lowBufferCount = 0;
    
    // Buffer thresholds (in samples)
    // At 48kHz sample rate:
    // - 8192 samples = ~170ms (high water mark, maximum buffer)
    // - 4096 samples = ~85ms (low water mark, request more samples)
    // - 2048 samples = ~43ms (warning threshold)
    this.BUFFER_SIZE_HIGH = 8192;  // Request samples when below this
    this.BUFFER_SIZE_LOW = 2048;   // Warn when below this
    
    // Set up message handler for receiving audio samples from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'samples') {
        // Add new samples to buffer
        const samples = event.data.samples;
        for (let i = 0; i < samples.length; i++) {
          this.sampleBuffer.push(samples[i]);
        }
        this.requestPending = false;
      } else if (event.data.type === 'set-volume') {
        this.volume = Math.max(0.0, Math.min(1.0, event.data.volume));
      }
    };
  }

  /**
   * Process audio samples
   * 
   * This is called by the browser audio system at regular intervals (typically 128 samples).
   * We need to fill the output buffers with samples from our buffer, or output silence
   * if we don't have enough samples (underrun condition).
   * 
   * @param inputs - Input audio streams (unused, we generate audio)
   * @param outputs - Output audio streams to fill
   * @param parameters - Audio parameters (unused)
   * @returns true to keep processor alive, false to terminate
   */
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputL = output[0];
    const outputR = output[1];

    // Proactive buffer management: Request more samples when buffer drops below high water mark
    // This ensures we always have enough headroom to prevent underruns
    if (this.sampleBuffer.length < this.BUFFER_SIZE_HIGH && !this.requestPending) {
      this.port.postMessage({ type: 'request-samples' });
      this.requestPending = true;
    }

    // Check for low buffer condition (potential future underrun)
    if (this.sampleBuffer.length < this.BUFFER_SIZE_LOW) {
      this.lowBufferCount++;
    }

    // Fill output buffers
    let underrunThisFrame = false;
    for (let i = 0; i < outputL.length; i++) {
      if (this.sampleBuffer.length >= 2) {
        // We have samples - output them with volume applied
        outputL[i] = this.sampleBuffer.shift() * this.volume;
        outputR[i] = this.sampleBuffer.shift() * this.volume;
      } else {
        // Buffer underrun - output silence
        outputL[i] = 0;
        outputR[i] = 0;
        underrunThisFrame = true;
      }
    }

    if (underrunThisFrame) {
      this.underrunCount++;
    }

    // Log buffer health metrics periodically (~once per second at 48kHz)
    // 375 frames * 128 samples = 48000 samples = 1 second
    this.frameCount++;
    if (this.frameCount >= 375) {
      const bufferMs = (this.sampleBuffer.length / 2 / 48).toFixed(1); // stereo samples to ms
      const bufferSamples = this.sampleBuffer.length;
      
      // Always log if there were underruns or low buffer warnings
      if (this.underrunCount > 0 || this.lowBufferCount > 0) {
        console.warn(
          `[AudioWorklet] Buffer Health - Size: ${bufferMs}ms (${bufferSamples} samples), ` +
          `Underruns: ${this.underrunCount}/sec, Low buffer warnings: ${this.lowBufferCount}/sec`
        );
      } else if (Math.random() < 0.1) {
        // Occasionally log healthy buffer status (10% chance)
        console.log(`[AudioWorklet] Buffer: ${bufferMs}ms (${bufferSamples} samples) - Healthy`);
      }
      
      // Reset counters
      this.frameCount = 0;
      this.underrunCount = 0;
      this.lowBufferCount = 0;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('emulator-audio-processor', EmulatorAudioProcessor);
