# mcp-docker-git-server

> Production-grade Model Context Protocol (MCP) server written in TypeScript, providing sandboxed Docker and Git operational tools for AI agents and LLM clients.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.6.0-orange.svg)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📌 Architecture Overview

This server implements the official **Model Context Protocol (MCP)** specification via `@modelcontextprotocol/sdk`. Instead of writing non-standard glue scripts, agents connect through standard JSON-RPC 2.0 over `stdio` or Server-Sent Events (SSE).

### Security Boundaries
- **Zero Shell Injection:** Uses `execFile` without shell wrappers (`shell: false`).
- **Strict Parameter Validation:** All input schemas validated with `zod`.
- **Resource Caps:** Buffer caps set to 5MB, strict 15s subprocess timeouts.

---

## 🛠️ Provided Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `docker_ps` | `all: boolean` | List running or all Docker containers |
| `docker_logs` | `containerId: string`, `tail?: number` | Safely read container execution logs |
| `git_status` | `repoPath?: string` | Inspect git working tree status |
| `git_diff` | `repoPath?: string`, `staged?: boolean` | View uncommitted working or staged diffs |

---

## 🚀 Quickstart

### Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docker-git": {
      "command": "node",
      "args": ["/path/to/mcp-docker-git-server/dist/index.js"]
    }
  }
}
```

### Build & Run Locally

```bash
git clone https://github.com/vaibhav7087/mcp-docker-git-server.git
cd mcp-docker-git-server
npm install
npm run build
npm start
```

---

## 👨‍💻 Author

**Vaibhav Kadam**  
- Portfolio: [builtbyvaibhav.bylance.in](https://builtbyvaibhav.bylance.in)  
- GitHub: [@vaibhav7087](https://github.com/vaibhav7087)
