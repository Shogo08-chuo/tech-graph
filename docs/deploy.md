# TechGraph Deploy Notes

## AWS EC2 + Docker Compose

The first AWS deployment target is a small EC2 instance running Docker Compose.
The EC2 instance and security group can be created with Terraform under `infra/terraform`.

```txt
EC2
  Nginx: public port 80
  Web: Next.js on internal port 3000
  API: Hono on internal port 5173
  DB: PostgreSQL on the private Docker network
```

Create the production environment file from the sample:

```bash
cp env.production.example env.production
```

Set these values in `env.production`:

```bash
APP_ORIGIN=http://YOUR_EC2_PUBLIC_IP
NEXT_PUBLIC_API_BASE_URL=/backend
POSTGRES_USER=techgraph
POSTGRES_PASSWORD=replace-with-strong-password
POSTGRES_DB=techgraph_db
DATABASE_URL=postgresql://techgraph:replace-with-strong-password@postgres:5432/techgraph_db?schema=public
PORT=5173
CORS_ORIGINS=http://YOUR_EC2_PUBLIC_IP
AUTH_URL=http://YOUR_EC2_PUBLIC_IP
AUTH_TRUST_HOST=true
AUTH_SECRET=replace-with-long-random-secret
AUTH_GITHUB_ID=replace-with-github-client-id
AUTH_GITHUB_SECRET=replace-with-github-client-secret
```

Build and start the production stack:

```bash
docker compose --env-file env.production -f docker-compose.prod.yml up -d --build
```

If you want to validate the Compose file before creating `env.production`, use the example file:

```bash
docker compose --env-file env.production.example -f docker-compose.prod.yml config
```

Check the running containers:

```bash
docker compose --env-file env.production -f docker-compose.prod.yml ps
```

Check the API through Nginx:

```bash
curl http://YOUR_EC2_PUBLIC_IP/backend/
```

For GitHub OAuth, add this callback URL in GitHub Developer Settings:

```bash
http://YOUR_EC2_PUBLIC_IP/api/auth/callback/github
```

Before creating AWS resources, set an AWS Budgets alert to reduce the chance of unexpected charges.

## Required Environment Variables

Frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
AUTH_SECRET=your-auth-secret
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
```

Backend:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
CORS_ORIGINS=https://your-frontend.example.com
```

`CORS_ORIGINS` accepts a comma-separated list when multiple frontend origins are needed.

For GitHub OAuth, set the callback URL in GitHub Developer Settings:

```bash
https://your-frontend.example.com/api/auth/callback/github
```

For local development, use:

```bash
http://localhost:3000/api/auth/callback/github
```

## Local Defaults

Frontend falls back to `http://localhost:5173`.

Backend CORS falls back to:

```bash
http://localhost:3000,http://127.0.0.1:3000
```

The local PostgreSQL container is exposed on `localhost:5433` to avoid colliding with another local PostgreSQL on `5432`.

## Deployment Checklist

1. Create the production PostgreSQL database.
2. Set `DATABASE_URL` on the API runtime.
3. Run Prisma migrations:

```bash
pnpm --filter db exec prisma migrate deploy
```

4. Deploy the API and set `CORS_ORIGINS` to the frontend URL.
5. Deploy the frontend and set `NEXT_PUBLIC_API_BASE_URL` to the API URL.
6. Smoke test:

```bash
curl https://your-api.example.com/
```
