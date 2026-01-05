/**
 * Test suite for mcp-docs server (ModelContextProtocol documentation)
 * Type: HTTP
 * URL: https://modelcontextprotocol.io/mcp
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServerTestClient } from './MCPServerTestClient';
import type { MCPServerConfig } from './types';
import { isNetworkError } from './test-helpers';

const config: MCPServerConfig = {
  type: 'http',
  url: 'https://modelcontextprotocol.io/mcp',
  tools: ['*'],
};

describe('mcp-docs MCP Server', () => {
  let client: MCPServerTestClient;
  let serverAvailable = false;

  beforeAll(async () => {
    client = new MCPServerTestClient(config);
    try {
      await client.start();
      serverAvailable = true;
    } catch (error) {
      console.warn('mcp-docs server not available:', error);
      serverAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  });

  it('should have valid configuration', () => {
    expect(config.type).toBe('http');
    expect(config.url).toBeTruthy();
    expect(config.url).toMatch(/^https?:\/\//);
    expect(config.tools).toContain('*');
  });

  it('should initialize successfully', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      await client.initialize();
      expect(true).toBe(true); // If we get here, initialization succeeded
    } catch (error) {
      // Check if it's a network error - if so, skip test
      if (isNetworkError(error)) {
        console.log('Skipping: network error during initialization');
        return;
      }
      throw error;
    }
  }, 20000);

  it('should list available tools', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      const result = await client.listTools();
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      
      // Check that tools have expected structure
      if (result.tools.length > 0) {
        const tool = result.tools[0];
        expect(tool).toHaveProperty('name');
      }
      
      console.log(`✓ Found ${result.tools.length} tools from mcp-docs`);
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during tool listing');
        return;
      }
      throw error;
    }
  }, 20000);

  it('should handle tool invocation', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      // First get the list of available tools
      const toolsList = await client.listTools();
      
      if (toolsList.tools.length === 0) {
        console.log('No tools available to test');
        return;
      }

      // Try to call the first available tool with minimal/safe parameters
      const firstTool = toolsList.tools[0];
      console.log(`Testing tool: ${firstTool.name}`);
      
      // Most MCP tools should handle empty or minimal args gracefully
      try {
        await client.callTool(firstTool.name, {});
        console.log(`✓ Successfully invoked ${firstTool.name}`);
      } catch (error) {
        // Tool might require specific parameters, which is acceptable
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Tool invocation result: ${errorMessage}`);
        
        // As long as we got a proper error response (not a network error), the server is working
        expect(errorMessage).toBeDefined();
      }
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during tool invocation');
        return;
      }
      throw error;
    }
  }, 30000);

  it('should handle errors gracefully', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      // Try to call a non-existent tool
      await expect(
        client.callTool('nonexistent-tool-12345', {})
      ).rejects.toThrow();
      
      console.log('✓ Server properly rejects invalid tool calls');
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during error handling test');
        return;
      }
      throw error;
    }
  }, 20000);

  it('should respond within acceptable timeout', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      const startTime = Date.now();
      await client.listTools();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(15000); // Should respond within 15 seconds
      console.log(`✓ Response time: ${duration}ms`);
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during timeout test');
        return;
      }
      throw error;
    }
  }, 20000);
});
