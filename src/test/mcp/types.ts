/**
 * MCP Server Configuration Types
 */

export interface MCPServerConfig {
  type: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  tools: string[];
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * MCP Protocol Types (JSON-RPC 2.0)
 */

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * MCP Tool Types
 */

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPToolsListResult {
  tools: MCPTool[];
}

/**
 * Test Result Types
 */

export interface MCPTestResult {
  serverName: string;
  success: boolean;
  error?: string;
  duration?: number;
  details?: Record<string, unknown>;
}
