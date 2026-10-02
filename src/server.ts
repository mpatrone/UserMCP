import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { userSchema, type User, createUser } from "./utils";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types";

const server = new McpServer({
  name: "mcp-crash",
  version: "1.0.0",
});

server.registerTool(
  "create-user",
  {
    description: "Create a new user in the database",
    annotations: {
      title: "Create User Tool",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: userSchema.shape,
  },
  async (user: User) => {
    try {
      const id = await createUser(user);
      return {
        content: [{ type: "text", text: `User created with ID: ${id}` }],
      };
    } catch {
      return {
        content: [
          { type: "text", text: "An error occurred while creating the user." },
        ],
      };
    }
  },
);

server.registerTool(
  "create-random-user",
   {
    description: "Creates a random user with fake data",
    annotations: {
      title: "Create User Tool",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async () => {
    const res = await server.server.request({
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: 'user',
            content: {
              type: "text", text: "Generate fake user data. The user should have a realistic name, email, address and phone number" + "\n" +
              "Return this data as a JSON object with no other text of formatter so it can be usde with JSON.parse()"   
            }
          }
        ],
        maxTokens: 1024,
      }
    },
    CreateMessageResultSchema );

    if (res.content.type !== "text") {
      return {
        content: [ { type: "text", text: "Failed to generate user data." } ]
      }
    }
    
    try {
      const userData = JSON.parse(
        res.content.text.trim()
        .replace(/^```json/, '')
        .replace(/```$/, '')
        .trim()
      );

      const id = await createUser(userData);
      return {
        content: [
          { type: "text", text: `User created successfully with ID: ${id}` },
        ],
      };
    } catch {
      return {
        content: [
          { type: "text", text: "Failed to parse generated user data." },
        ],
      };
    }
  }
)

server.registerResource(
  "users",
  "users://all",
  {
    title: "Retrieves all users in the database",
    description: "Resource representing the users in the database",
    mimeType: "application/json",
  },
  async (uri: URL) => {
    const users = await import("./data/users.json", {
      with: { type: "json" },
    }).then((m) => m.default);

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(users, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  },
);

server.registerResource(
  "user-details",
  new ResourceTemplate("users://{userId}/profile", { list: undefined }),
  {
    description: "Get a user's details from the database",
    title: "User Details",
    mimeType: "application/json",
  },
  async (uri: URL, { userId }) => {
    
    const users = await import("./data/users.json", {
      with: { type: "json" },
    }).then((m) => m.default);

    const user = users.find((u) => u.id === Number(userId));
    if ( user == null ) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "User not found" }, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(user, null, 2),
          mimeType: "application/json",
        },
      ],
    };

  }
);

server.registerPrompt(
  "generate-fake-user", 
  {
    title:   "Generate a fake user based on a given name",
    description: "Generate a fake user based on a given name",
    argsSchema: z.object({ name: z.string() }).shape,
  },
  async ({ name })  => ({
    messages: [
      {
        role: 'user',
        content: {
          type: "text", text: `Generate a fake user based on the name: ${name}. The user should have a realistic email, address and phone number`
        }
      }
    ]
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
