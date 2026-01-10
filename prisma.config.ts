import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },

  // This makes Prisma Client use the Node-API engine (normal for Node backends)
  engine: {
    type: "library",
  },

  datasource: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
