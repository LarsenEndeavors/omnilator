/**
 * Test helpers and utilities for MCP server testing
 */

import type { MCPServerConfig, MCPTestResult } from './types';

/**
 * Create a timeout promise that rejects after a specified duration
 */
export function createTimeout(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}

/**
 * Retry a function multiple times with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Validate MCP server configuration
 */
export function validateServerConfig(config: MCPServerConfig): string[] {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Server type is required');
  }

  if (config.type === 'http' && !config.url) {
    errors.push('HTTP servers require a URL');
  }

  if (config.type === 'stdio' && !config.command) {
    errors.push('Stdio servers require a command');
  }

  if (!config.tools || !Array.isArray(config.tools)) {
    errors.push('Tools configuration is required');
  }

  return errors;
}

/**
 * Create a mock MCP response
 */
export function createMockResponse(id: string | number, result: unknown) {
  return {
    jsonrpc: '2.0' as const,
    id,
    result,
  };
}

/**
 * Create a mock MCP error response
 */
export function createMockError(id: string | number, code: number, message: string) {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message,
    },
  };
}

/**
 * Assert that a test result is successful
 */
export function assertTestSuccess(result: MCPTestResult): void {
  if (!result.success) {
    throw new Error(`Test failed for ${result.serverName}: ${result.error || 'Unknown error'}`);
  }
}



/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Timeout');
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('empty response') ||
    error.message.includes('not reachable')
  );
}

/**
 * Sanitize error messages for logging (remove sensitive data)
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  let message = error.message;
  
  // Remove potential API keys or tokens
  message = message.replace(/[a-z0-9]{20,}/gi, '[REDACTED]');
  message = message.replace(/ctx7sk-[a-f0-9-]+/gi, '[API_KEY]');
  
  return message;
}
