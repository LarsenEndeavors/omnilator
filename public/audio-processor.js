/**
 * REDESIGNED Audio Worklet Processor for Low-Latency Audio Streaming
 * 
 * This processor runs in the audio worklet thread for real-time audio processing.
 * 
 * Key improvements:
 * - INCREASED buffer threshold for smoother playback (8192 instead of 4096)
 * - Proactive buffer top-up to prevent underruns
 * - Enhanced buffer health monitoring and logging
 * - Clear documentation of buffer calculations
 * 
 * Buffer sizing rationale:
 * - At 48kHz, 8192 samples = 4096 stereo frames = ~85ms of audio
 * - This provides substantial headroom to handle:
 *   - Frame timing variations
 *   - JavaScript GC pauses
 *   - Main thread blocking
 * - AudioWorklet processes chunks of 128 frames (~2.67ms at 48kHz)
 */
class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Audio sample buffer (interleaved stereo: L, R, L, R, ...)
    this.sampleBuffer = [];
    
    // Volume control
    this.volume = 1.0;
    
    // Request management
    this.requestPending = false;
    
    // Buffer health metrics
    this.frameCount = 0;
    this.underrunCount = 0;
    this.lastBufferSize = 0;
    this.minBufferSize = Infinity;
    
    // Buffer thresholds (in samples, interleaved stereo)
    this.BUFFER_REQUEST_THRESHOLD = 8192;  // Request more samples when below 8192 (~85ms)
    this.BUFFER_LOW_THRESHOLD = 2048;      // Warning threshold for critically low buffer (~21ms)
    this.BUFFER_TARGET = 12288;            // Ideal buffer size (~128ms)
    
    // Message handler for receiving samples and configuration
    this.port.onmessage = (event) => {
      if (event.data.type === 'samples') {
        // Add new samples to buffer
        const samples = event.data.samples;
        for (let i = 0; i < samples.length; i++) {
          this.sampleBuffer.push(samples[i]);
        }
        this.requestPending = false;
        
        // Debug: Log when we receive a large batch of samples
        if (samples.length >= 4096) {
          console.log(`[AudioWorklet] Received ${samples.length} samples, buffer now: ${this.sampleBuffer.length} samples (${(this.sampleBuffer.length / 2 / 48).toFixed(1)}ms)`);
        }
      } else if (event.data.type === 'set-volume') {
        this.volume = event.data.volume;
      }
    };
  }

  /**
   * Main audio processing callback
   * Called by the audio system for each 128-frame chunk
   * 
   * @param inputs - Input audio (unused, we generate from emulator)
   * @param outputs - Output audio buffers to fill
   * @param parameters - Audio parameters (unused)
   * @returns true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputL = output[0];
    const outputR = output[1];
    const frameCount = outputL.length; // Typically 128 frames

    // PROACTIVE BUFFER MANAGEMENT
    // Request more samples well before we run out
    // This gives the main thread time to generate samples before underrun
    if (this.sampleBuffer.length < this.BUFFER_REQUEST_THRESHOLD && !this.requestPending) {
      this.port.postMessage({ type: 'request-samples' });
      this.requestPending = true;
    }

    // FILL OUTPUT BUFFER
    let underrunThisFrame = false;
    for (let i = 0; i < frameCount; i++) {
      if (this.sampleBuffer.length >= 2) {
        // We have stereo samples available
        outputL[i] = this.sampleBuffer.shift() * this.volume;
        outputR[i] = this.sampleBuffer.shift() * this.volume;
      } else {
        // Buffer underrun - output silence
        outputL[i] = 0;
        outputR[i] = 0;
        underrunThisFrame = true;
      }
    }

    // BUFFER HEALTH TRACKING
    if (underrunThisFrame) {
      this.underrunCount++;
    }

    // Track buffer statistics
    const currentBufferSize = this.sampleBuffer.length;
    this.minBufferSize = Math.min(this.minBufferSize, currentBufferSize);
    this.lastBufferSize = currentBufferSize;

    // PERIODIC BUFFER HEALTH LOGGING
    // Log approximately once per second (48000 / 128 = 375 frames per second)
    this.frameCount++;
    if (this.frameCount >= 375) {
      const bufferMs = (this.lastBufferSize / 2 / 48).toFixed(1); // stereo samples to ms
      const minBufferMs = (this.minBufferSize / 2 / 48).toFixed(1);
      
      // Always log if we had underruns or if buffer is getting low
      if (this.underrunCount > 0 || this.lastBufferSize < this.BUFFER_LOW_THRESHOLD) {
        console.warn(
          `[AudioWorklet] ⚠️ Buffer: ${bufferMs}ms (${this.lastBufferSize} samples), ` +
          `Min: ${minBufferMs}ms, Underruns: ${this.underrunCount}/sec`
        );
      } else if (this.lastBufferSize < this.BUFFER_REQUEST_THRESHOLD) {
        // Buffer is below request threshold but not critical
        console.log(
          `[AudioWorklet] Buffer: ${bufferMs}ms (${this.lastBufferSize} samples), ` +
          `Underruns: ${this.underrunCount}/sec`
        );
      } else {
        // Healthy buffer - only log occasionally to avoid spam
        if (this.frameCount % (375 * 10) === 0) { // Every 10 seconds
          console.log(
            `[AudioWorklet] ✓ Healthy buffer: ${bufferMs}ms (${this.lastBufferSize} samples), ` +
            `No underruns in last second`
          );
        }
      }
      
      // Reset counters
      this.frameCount = 0;
      this.underrunCount = 0;
      this.minBufferSize = this.lastBufferSize;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('emulator-audio-processor', EmulatorAudioProcessor);
