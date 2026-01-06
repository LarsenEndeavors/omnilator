/**
 * Mock WASM module exports for testing.
 * 
 * This module provides mock implementations of the snes9x2005-wasm module
 * for unit testing without requiring the actual WASM binary.
 * 
 * @example
 * ```typescript
 * import { createMockModule } from '../__mocks__';
 * 
 * const mock = createMockModule();
 * mock.simulateRomLoad();
 * mock.simulateFrames(60);
 * ```
 */

export {
  MockSnes9xWasmModule,
  createMockModule,
  createFailingRomLoadModule,
  createFailingAllocationModule,
  createFailingStateModule,
  createNoSramModule,
  type MockModuleOptions,
} from './MockSnes9xWasmModule';
