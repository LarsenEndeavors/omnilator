/**
 * Type definitions for the snes9x2005-wasm WASM module.
 * 
 * This module exports all TypeScript interfaces and types for working
 * with the compiled snes9x2005 WASM emulator.
 */

export type {
  Snes9xWasmModule,
  EmscriptenModule,
  SnesButtonState,
  WasmMemoryHelpers,
} from './Snes9xWasmModule';

export {
  VideoBufferConstants,
  AudioBufferConstants,
  SnesButtons,
  wasmMemoryHelpers,
} from './Snes9xWasmModule';
