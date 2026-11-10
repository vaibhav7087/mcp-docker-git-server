import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

// Safe execution helper with timeout and sanitization
async function runSafeCommand(cmd: string, args: string[], cwd: string = process.cwd()): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 5, // 5MB limit
      shell: false, // Prevents shell injection
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message} - ${error.stderr || ""}`);
  }
}

// Tool definitions
const DOCKER_PS_TOOL: Tool = {
  name: "docker_ps",
  description: "Lists active or all Docker containers with status, ports, and image names.",
  inputSchema: {
    type: "object",
    properties: {
      all: {
        type: "boolean",
        description: "Show all containers (default false shows only running)",
      },
    },
  },
};

const DOCKER_LOGS_TOOL: Tool = {
  name: "docker_logs",
  description: "Retrieves container execution logs with optional tail limit.",
  inputSchema: {
    type: "object",
    properties: {
      containerId: {
        type: "string",
        description: "The container name or hash ID",
      },
      tail: {
        type: "number",
        description: "Number of lines to show from the end of the logs (default 100)",
      },
    },
    required: ["containerId"],
  },
};

const GIT_STATUS_TOOL: Tool = {
  name: "git_status",
  description: "Checks git repository working tree status and branch state.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Path to git repository root (defaults to current directory)",
      },
    },
  },
};

const GIT_DIFF_TOOL: Tool = {
  name: "git_diff",
  description: "Inspects uncommitted git changes or commit differences.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Path to git repository root",
      },
      staged: {
        type: "boolean",
        description: "Show staged changes vs working tree",
      },
    },
  },
};

// Input validators using Zod
const DockerLogsSchema = z.object({
  containerId: z.string().regex(/^[a-zA-Z0-9_\-\.]+$/),
  tail: z.number().int().positive().max(5000).optional().default(100),
});

const GitStatusSchema = z.object({
  repoPath: z.string().optional(),
});

const GitDiffSchema = z.object({
  repoPath: z.string().optional(),
  staged: z.boolean().optional(),
});

// MCP Server Instance
const server = new Server(
  {
    name: "mcp-docker-git-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [DOCKER_PS_TOOL, DOCKER_LOGS_TOOL, GIT_STATUS_TOOL, GIT_DIFF_TOOL],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "docker_ps": {
        const showAll = Boolean(args?.all);
        const cmdArgs = showAll ? ["ps", "-a", "--format", "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"] : ["ps", "--format", "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"];
        const { stdout } = await runSafeCommand("docker", cmdArgs);
        return {
          content: [{ type: "text", text: stdout || "No containers found." }],
        };
      }

      case "docker_logs": {
        const parsed = DockerLogsSchema.parse(args);
        const { stdout, stderr } = await runSafeCommand("docker", ["logs", "--tail", String(parsed.tail), parsed.containerId]);
        return {
          content: [{ type: "text", text: stdout || stderr || "No logs output." }],
        };
      }

      case "git_status": {
        const parsed = GitStatusSchema.parse(args || {});
        const targetPath = parsed.repoPath || process.cwd();
        const { stdout } = await runSafeCommand("git", ["status", "--short", "--branch"], targetPath);
        return {
          content: [{ type: "text", text: stdout || "Clean working tree." }],
        };
      }

      case "git_diff": {
        const parsed = GitDiffSchema.parse(args || {});
        const targetPath = parsed.repoPath || process.cwd();
        const cmdArgs = parsed.staged ? ["diff", "--cached"] : ["diff"];
        const { stdout } = await runSafeCommand("git", cmdArgs, targetPath);
        return {
          content: [{ type: "text", text: stdout || "No differences found." }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// Run server on stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Docker & Git Server running on stdio transport");
}

main().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});
