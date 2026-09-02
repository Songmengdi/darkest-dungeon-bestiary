import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "darkest-dungeon-mcp",
  version: "0.1.0",
});

registerTools(server);

await server.connect(new StdioServerTransport());
process.stderr.write("darkest-dungeon-mcp ready\n");
