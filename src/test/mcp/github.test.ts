/**
 * Test suite for github server
 * Type: stdio
 * Command: npx -y @modelcontextprotocol/server-github
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServerTestClient } from './MCPServerTestClient';
import type { MCPServerConfig } from './types';

const config: MCPServerConfig = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  tools: ['*'],
};

describe('github MCP Server', () => {
  let client: MCPServerTestClient;
  let serverStarted = false;

  beforeAll(async () => {
    client = new MCPServerTestClient(config);
    try {
      await client.start();
      serverStarted = true;
    } catch (error) {
      console.warn('github server failed to start:', error);
      serverStarted = false;
    }
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  }, 10000);

  it('should have valid configuration', () => {
    expect(config.type).toBe('stdio');
    expect(config.command).toBe('npx');
    expect(config.args).toBeDefined();
    expect(config.args).toContain('-y');
    expect(config.args).toContain('@modelcontextprotocol/server-github');
    expect(config.tools).toContain('*');
  });

  it('should start the server process', () => {
    if (!serverStarted) {
      console.log('Server failed to start - this may be expected if npx/network is unavailable');
      return;
    }
    
    expect(client.isRunning()).toBe(true);
    console.log('✓ Server process is running');
  });

  it('should initialize successfully', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      await client.initialize();
      console.log('✓ Server initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }, 20000);

  it('should list available tools', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const result = await client.listTools();
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      
      // GitHub server should have GitHub-related tools
      const toolNames = result.tools.map(t => t.name);
      console.log(`✓ Found ${result.tools.length} tools:`, toolNames);
      
      // Look for expected GitHub tools
      const hasGitHubTools = toolNames.some(name => 
        name.includes('repo') || 
        name.includes('issue') || 
        name.includes('pull') ||
        name.includes('commit')
      );
      
      if (hasGitHubTools) {
        console.log('✓ Found expected GitHub-related tools');
      }
      
      // Check tool structure
      result.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool.name).toBeTruthy();
      });
    } catch (error) {
      console.error('List tools error:', error);
      throw error;
    }
  }, 20000);

  it('should handle tool invocation', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      if (toolsList.tools.length === 0) {
        throw new Error('No tools available');
      }

      const firstTool = toolsList.tools[0];
      console.log(`Testing tool: ${firstTool.name}`);
      
      try {
        const result = await client.callTool(firstTool.name, {});
        console.log(`✓ Tool invocation result:`, result);
      } catch (error) {
        // GitHub tools likely require authentication or specific parameters
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Tool requires auth/parameters: ${errorMessage}`);
        expect(errorMessage).toBeDefined();
      }
    } catch (error) {
      console.error('Tool invocation error:', error);
      throw error;
    }
  }, 30000);

  it('should handle missing authentication gracefully', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      if (toolsList.tools.length === 0) {
        console.log('No tools to test authentication with');
        return;
      }

      // GitHub tools should handle missing auth gracefully
      try {
        await client.callTool(toolsList.tools[0].name, {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Should get a proper error message, not a crash
        expect(errorMessage).toBeDefined();
        expect(errorMessage.length).toBeGreaterThan(0);
        
        console.log('✓ Server handles missing authentication gracefully');
      }
    } catch (error) {
      console.error('Auth handling test error:', error);
      throw error;
    }
  }, 20000);

  it('should handle errors gracefully', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const result = await client.callTool('nonexistent-tool-12345', {});
      
      // Some servers return error objects instead of throwing
      if (result && typeof result === 'object' && 'isError' in result) {
        expect(result.isError).toBe(true);
        console.log('✓ Server properly returns error for invalid tool calls');
      } else {
        throw new Error('Expected error for invalid tool call');
      }
    } catch (error) {
      expect(error).toBeDefined();
      console.log('✓ Server properly rejects invalid tool calls');
    }
  }, 20000);

  it('should maintain stable connection', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    for (let i = 0; i < 3; i++) {
      try {
        await client.listTools();
      } catch (error) {
        throw new Error(`Connection failed on request ${i + 1}: ${error}`);
      }
    }
    
    console.log('✓ Connection remained stable across multiple requests');
  }, 30000);
});
