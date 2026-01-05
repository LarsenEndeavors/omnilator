# MCP Server Test Suite

This directory contains automated tests for all configured MCP (Model Context Protocol) servers used in the Omnilator project.

## Overview

The test suite validates:
- Server initialization and startup
- Tool discovery and invocation
- Authentication handling (for authenticated servers)
- Error handling and edge cases
- Connection stability
- JSON-RPC protocol compliance

## Tested Servers

### HTTP-based Servers
1. **mcp-docs** - ModelContextProtocol documentation server
   - URL: `https://modelcontextprotocol.io/mcp`
   - Authentication: None

2. **context7** - Context7 documentation/library query server
   - URL: `https://mcp.context7.com/mcp`
   - Authentication: API Key (CONTEXT7_API_KEY header)

### Stdio-based Servers
3. **sequential-thinking** - Sequential thinking/reasoning server
   - Package: `@modelcontextprotocol/server-sequential-thinking`

4. **github** - GitHub operations server
   - Package: `@modelcontextprotocol/server-github`

5. **playwright** - Browser automation server
   - Package: `@playwright/mcp@latest`

6. **filesystem** - Filesystem operations server
   - Package: `@modelcontextprotocol/server-filesystem`
   - Scoped to current directory (`.`)

## Running Tests

### Run All MCP Tests
```bash
npm test -- src/test/mcp
```

### Run Specific Server Tests
```bash
# HTTP servers
npm test -- src/test/mcp/mcp-docs.test.ts
npm test -- src/test/mcp/context7.test.ts

# Stdio servers
npm test -- src/test/mcp/sequential-thinking.test.ts
npm test -- src/test/mcp/github.test.ts
npm test -- src/test/mcp/playwright.test.ts
npm test -- src/test/mcp/filesystem.test.ts

# Integration tests
npm test -- src/test/mcp/integration.test.ts
```

### Run with Coverage
```bash
npm test -- src/test/mcp --coverage
```

### Run in Watch Mode
```bash
npm test -- src/test/mcp --watch
```

## Test Structure

### Test Files
- `mcp-docs.test.ts` - Tests for ModelContextProtocol docs server
- `context7.test.ts` - Tests for Context7 server (with auth)
- `sequential-thinking.test.ts` - Tests for sequential thinking server
- `github.test.ts` - Tests for GitHub operations server
- `playwright.test.ts` - Tests for Playwright automation server
- `filesystem.test.ts` - Tests for filesystem operations server
- `integration.test.ts` - Integration tests for all servers together

### Helper Files
- `MCPServerTestClient.ts` - Generic MCP client for testing both HTTP and stdio servers
- `types.ts` - TypeScript type definitions for MCP protocol and tests
- `test-helpers.ts` - Shared utilities (timeout, retry, validation, etc.)

## Test Coverage

Each server test suite includes:

1. **Configuration Validation**
   - Validates server type, command, URL, authentication
   - Ensures required parameters are present

2. **Server Lifecycle**
   - Tests server startup/initialization
   - Validates process management (stdio servers)
   - Confirms graceful shutdown

3. **Tool Discovery**
   - Lists available tools
   - Validates tool structure and metadata
   - Checks for expected tool names

4. **Tool Invocation**
   - Tests basic tool calls
   - Handles parameter requirements
   - Validates response format

5. **Error Handling**
   - Tests invalid tool calls
   - Validates error messages
   - Checks authentication failures (where applicable)

6. **Connection Stability**
   - Multiple sequential requests
   - Timeout handling
   - Response time validation

## CI Integration

The MCP test suite is integrated into the CI pipeline:

```yaml
# .github/workflows/emscripten-build.yml
- name: Run MCP tests
  run: npm test -- src/test/mcp --run
```

Tests run on every push and pull request to ensure MCP server configurations remain valid.

## Troubleshooting

### Tests Skip Due to Network Issues

Many tests gracefully skip if servers are unavailable:
```
Skipping: server not available
Skipping: network error during initialization
```

This is expected behavior in environments without network access or when external servers are down.

### Stdio Server Tests Fail

Stdio servers require `npx` and network access to download packages. If tests fail:

1. Ensure `npx` is installed: `npm install -g npm`
2. Check network connectivity
3. Verify package names in `mcp-config.json`

### Authentication Failures

For context7 tests, ensure the API key is valid:
```json
{
  "headers": {
    "CONTEXT7_API_KEY": "ctx7sk-..."
  }
}
```

## Adding New Server Tests

To add tests for a new MCP server:

1. Update `mcp-config.json` with the new server configuration
2. Create a new test file: `src/test/mcp/[server-name].test.ts`
3. Use existing tests as templates
4. Import `MCPServerTestClient` and helper utilities
5. Follow the standard test structure (see above)

Example template:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServerTestClient } from './MCPServerTestClient';
import type { MCPServerConfig } from './types';

const config: MCPServerConfig = {
  type: 'http', // or 'stdio'
  url: 'https://example.com/mcp', // for HTTP
  // command: 'npx', // for stdio
  // args: ['-y', '@example/server'],
  tools: ['*'],
};

describe('example MCP Server', () => {
  let client: MCPServerTestClient;
  let serverAvailable = false;

  beforeAll(async () => {
    client = new MCPServerTestClient(config);
    try {
      await client.start();
      serverAvailable = true;
    } catch (error) {
      console.warn('Server not available:', error);
    }
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  });

  it('should have valid configuration', () => {
    expect(config.type).toBeDefined();
    // Add more validation...
  });

  // Add more tests...
});
```

## Best Practices

1. **Graceful Degradation**: Tests should skip gracefully when servers are unavailable
2. **Clear Logging**: Use `console.log` to provide clear status messages
3. **Timeout Handling**: Always specify appropriate timeouts (default: 30s)
4. **Error Sanitization**: Don't log sensitive data (API keys, tokens)
5. **Resource Cleanup**: Always clean up processes and test files in `afterAll`

## Related Documentation

- [MCP Specification](https://modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Vitest Documentation](https://vitest.dev/)

## Support

For issues with the test suite:
1. Check this README for troubleshooting steps
2. Review test logs for specific error messages
3. Verify `mcp-config.json` configuration
4. Create an issue with test output and environment details
