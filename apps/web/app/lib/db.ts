import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../packages/db/generated/prisma";
import { config } from "dotenv";

const localEnvPaths = [
  path.resolve(process.cwd(), "../../packages/db/.env"),
  path.resolve(process.cwd(), "packages/db/.env"),
];

const localEnvPath = localEnvPaths.find((envPath) => existsSync(envPath));

if (localEnvPath) {
  config({
    path: localEnvPath,
    quiet: true,
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
