/**
 * Audio Worklet Processor for low-latency audio streaming
 * This runs in the audio worklet thread for real-time audio processing
 */
class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleBuffer = [];
    this.volume = 1.0;
    this.requestPending = false;
    this.frameCount = 0;
    this.underrunCount = 0;
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'samples') {
        // Add new samples to buffer
        const samples = event.data.samples;
        for (let i = 0; i < samples.length; i++) {
          this.sampleBuffer.push(samples[i]);
        }
        this.requestPending = false;
      } else if (event.data.type === 'set-volume') {
        this.volume = event.data.volume;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputL = output[0];
    const outputR = output[1];

    // Request more samples if buffer is running low and no request is pending
    // Keep buffer with at least 2048 samples (1024 stereo pairs = ~21ms at 48kHz)
    // This provides a larger buffer to smooth out choppy audio
    if (this.sampleBuffer.length < 2048 && !this.requestPending) {
      this.port.postMessage({ type: 'request-samples' });
      this.requestPending = true;
    }

    let underrunThisFrame = false;
    for (let i = 0; i < outputL.length; i++) {
      if (this.sampleBuffer.length >= 2) {
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
    this.frameCount++;
    if (this.frameCount >= 375) { // 375 * 128 samples = 48000 samples = 1 second
      const bufferMs = (this.sampleBuffer.length / 2 / 48).toFixed(1); // stereo samples to ms
      if (this.underrunCount > 0 || this.sampleBuffer.length < 1024) {
        console.log(`[AudioWorklet] Buffer: ${bufferMs}ms (${this.sampleBuffer.length} samples), Underruns: ${this.underrunCount}/sec`);
      }
      this.frameCount = 0;
      this.underrunCount = 0;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('emulator-audio-processor', EmulatorAudioProcessor);
