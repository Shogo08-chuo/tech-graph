FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV DATABASE_URL="postgresql://user:password@localhost:5432/techgraph_db?schema=public"

RUN pnpm --filter db exec prisma generate
RUN pnpm --filter api build

WORKDIR /app

EXPOSE 5173

CMD ["pnpm", "--filter", "api", "start"]
