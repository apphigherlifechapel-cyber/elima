// This file is included for schema tooling compatibility but is optional for runtime.
import "dotenv/config";

// Prisma v4 does not require prisma/config; provide a no-op fallback to satisfy type checking.
const defineConfig = <T>(config: T): T => config;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
