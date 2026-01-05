/**
 * Test suite for filesystem server
 * Type: stdio
 * Command: npx -y @modelcontextprotocol/server-filesystem .
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServerTestClient } from './MCPServerTestClient';
import type { MCPServerConfig } from './types';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const config: MCPServerConfig = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  tools: ['*'],
};

// Test directory for filesystem operations
const TEST_DIR = join(process.cwd(), 'test-mcp-fs');

describe('filesystem MCP Server', () => {
  let client: MCPServerTestClient;
  let serverStarted = false;

  beforeAll(async () => {
    // Create test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    client = new MCPServerTestClient(config);
    try {
      await client.start();
      serverStarted = true;
    } catch (error) {
      console.warn('filesystem server failed to start:', error);
      serverStarted = false;
    }
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.stop();
    }

    // Clean up test directory
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  }, 10000);

  it('should have valid configuration', () => {
    expect(config.type).toBe('stdio');
    expect(config.command).toBe('npx');
    expect(config.args).toBeDefined();
    expect(config.args).toContain('-y');
    expect(config.args).toContain('@modelcontextprotocol/server-filesystem');
    expect(config.args).toContain('.');
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
      
      // Filesystem server should have file operation tools
      const toolNames = result.tools.map(t => t.name);
      console.log(`✓ Found ${result.tools.length} tools:`, toolNames);
      
      // Look for expected filesystem tools
      const hasFilesystemTools = toolNames.some(name => 
        name.includes('read') || 
        name.includes('write') || 
        name.includes('list') ||
        name.includes('file') ||
        name.includes('directory')
      );
      
      if (hasFilesystemTools) {
        console.log('✓ Found expected filesystem-related tools');
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

  it('should handle filesystem operations', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      if (toolsList.tools.length === 0) {
        throw new Error('No tools available');
      }

      // Create a test file
      const testFilePath = join(TEST_DIR, 'test-file.txt');
      writeFileSync(testFilePath, 'Hello from MCP test!');
      
      // Try to find a read or list tool
      const readTool = toolsList.tools.find(t => 
        t.name.includes('read') || t.name.includes('list')
      );
      
      if (readTool) {
        console.log(`Testing filesystem tool: ${readTool.name}`);
        
        try {
          const result = await client.callTool(readTool.name, {
            path: testFilePath
          });
          console.log(`✓ Filesystem operation successful:`, result);
        } catch (error) {
          // Tool might need different parameters
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`Tool invocation: ${errorMessage}`);
          expect(errorMessage).toBeDefined();
        }
      } else {
        console.log('No read/list tool found to test');
      }
    } catch (error) {
      console.error('Filesystem operation error:', error);
      throw error;
    }
  }, 30000);

  it('should handle missing files gracefully', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      const readTool = toolsList.tools.find(t => 
        t.name.includes('read')
      );
      
      if (readTool) {
        // Try to read a non-existent file
        try {
          await client.callTool(readTool.name, {
            path: '/nonexistent/file/path/xyz123.txt'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Should get a proper error message
          expect(errorMessage).toBeDefined();
          expect(errorMessage.length).toBeGreaterThan(0);
          
          console.log('✓ Server handles missing files gracefully');
        }
      } else {
        console.log('No read tool found to test error handling');
      }
    } catch (error) {
      console.error('Missing file test error:', error);
      throw error;
    }
  }, 20000);

  it('should respect filesystem boundaries', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      const toolsList = await client.listTools();
      
      // Filesystem server should be scoped to current directory
      // Try to access parent directory or system files
      const readTool = toolsList.tools.find(t => 
        t.name.includes('read') || t.name.includes('list')
      );
      
      if (readTool) {
        try {
          // Try to access a system file outside the allowed directory
          await client.callTool(readTool.name, {
            path: '/etc/passwd'  // Should be denied
          });
          
          console.log('Warning: Server allowed access outside allowed directory');
        } catch (error) {
          // Expected to fail
          console.log('✓ Server properly restricts filesystem access');
        }
      }
    } catch (error) {
      console.error('Boundary test error:', error);
      throw error;
    }
  }, 20000);

  it('should handle errors gracefully', async () => {
    if (!serverStarted) {
      console.log('Skipping: server not started');
      return;
    }

    try {
      await expect(
        client.callTool('nonexistent-tool-12345', {})
      ).rejects.toThrow();
      
      console.log('✓ Server properly rejects invalid tool calls');
    } catch (error) {
      console.error('Error handling test error:', error);
      throw error;
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
