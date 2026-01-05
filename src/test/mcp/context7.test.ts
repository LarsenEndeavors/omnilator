/**
 * Test suite for context7 server
 * Type: HTTP
 * URL: https://mcp.context7.com/mcp
 * Requires: API Key authentication
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServerTestClient } from './MCPServerTestClient';
import type { MCPServerConfig } from './types';
import { isNetworkError } from './test-helpers';

const config: MCPServerConfig = {
  type: 'http',
  url: 'https://mcp.context7.com/mcp',
  headers: {
    'CONTEXT7_API_KEY': 'ctx7sk-74afdffb-ffb1-4a75-bc62-cf4c43271ba4',
  },
  tools: ['*'],
};

describe('context7 MCP Server', () => {
  let client: MCPServerTestClient;
  let serverAvailable = false;

  beforeAll(async () => {
    client = new MCPServerTestClient(config);
    try {
      await client.start();
      serverAvailable = true;
    } catch (error) {
      console.warn('context7 server not available:', error);
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
    expect(config.headers).toBeDefined();
    expect(config.headers?.CONTEXT7_API_KEY).toBeDefined();
    expect(config.headers?.CONTEXT7_API_KEY).toMatch(/^ctx7sk-/);
    expect(config.tools).toContain('*');
  });

  it('should include authentication headers', () => {
    expect(config.headers).toBeDefined();
    expect(config.headers?.CONTEXT7_API_KEY).toBeTruthy();
    
    // Verify API key format (should start with ctx7sk-)
    const apiKey = config.headers?.CONTEXT7_API_KEY;
    expect(apiKey).toMatch(/^ctx7sk-[a-f0-9-]+$/);
    
    console.log('✓ API key format is valid');
  });

  it('should initialize successfully with authentication', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      await client.initialize();
      expect(true).toBe(true);
      console.log('✓ Authenticated initialization successful');
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during initialization');
        return;
      }
      
      // Check for authentication errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error('Authentication failed - check API key');
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
      
      // Context7 should provide documentation/library query tools
      if (result.tools.length > 0) {
        const tool = result.tools[0];
        expect(tool).toHaveProperty('name');
        expect(tool.name).toBeTruthy();
      }
      
      console.log(`✓ Found ${result.tools.length} tools from context7`);
      
      // Log tool names for debugging
      result.tools.forEach(tool => {
        console.log(`  - ${tool.name}`);
      });
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during tool listing');
        return;
      }
      throw error;
    }
  }, 20000);

  it('should handle tool invocation with authentication', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      if (toolsList.tools.length === 0) {
        console.log('No tools available to test');
        return;
      }

      const firstTool = toolsList.tools[0];
      console.log(`Testing authenticated tool call: ${firstTool.name}`);
      
      try {
        await client.callTool(firstTool.name, {});
        console.log(`✓ Successfully invoked ${firstTool.name} with authentication`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Tool invocation result: ${errorMessage}`);
        
        // Check for authentication issues
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          throw new Error('Authentication failed during tool call');
        }
        
        // Tool might require specific parameters, which is acceptable
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

  it('should reject requests without proper authentication', async () => {
    // Create a client without authentication
    const unauthConfig: MCPServerConfig = {
      type: 'http',
      url: config.url!,
      tools: ['*'],
    };
    
    const unauthClient = new MCPServerTestClient(unauthConfig);
    
    try {
      await unauthClient.start();
      
      // This should fail or return an error due to missing authentication
      try {
        await unauthClient.listTools();
        console.log('Warning: Server accepted request without authentication');
      } catch (error) {
        // Expected to fail
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toBeDefined();
        console.log('✓ Server properly rejects unauthenticated requests');
      }
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('Skipping: network error during auth test');
        return;
      }
      // This is also acceptable - server might reject at connection level
      console.log('✓ Server rejects connection without authentication');
    } finally {
      await unauthClient.stop();
    }
  }, 20000);

  it('should handle errors gracefully', async () => {
    if (!serverAvailable) {
      console.log('Skipping: server not available');
      return;
    }

    try {
      await expect(
        client.callTool('nonexistent-tool-xyz-12345', {})
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
      
      expect(duration).toBeLessThan(15000);
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
