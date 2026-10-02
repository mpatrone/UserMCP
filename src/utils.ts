import {z} from 'zod/v4';
import fs from "node:fs/promises";

export const userSchema = z.object({
    id: z.number().positive(),
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  });

export type User = z.infer<typeof userSchema>;

export async function createUser(user: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) {
  const users = await import("./data/users.json", {
    with: { type: "json" }
  }).then((m) => m.default);

  const id = users.length + 1;
  users.push({ id, ...user });

  await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2))
  return id;
}
