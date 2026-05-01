# TechGraph Deploy Notes

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
