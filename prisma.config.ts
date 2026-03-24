import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node ./prisma/seed.js" },

  datasource: {
    // Prisma CLI commands like migrate work best against a direct Neon URL.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
