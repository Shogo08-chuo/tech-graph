# TechGraph

TechGraph は、プロジェクトで使用した技術と技術同士の関係をグラフで整理・公開できるポートフォリオアプリです。

GitHubログインでユーザーを管理し、プロジェクトごとに使用技術を登録して、技術のつながりを視覚的に表現できます。作成したプロジェクトは公開ページとして表示できます。

## 主な機能

- GitHubログイン
- プロジェクトの作成・編集
- タイトル、概要、開発期間、GitHub URL の管理
- 技術の登録
- プロジェクトごとの使用技術の追加
- React Flow による技術グラフの表示
- ノード位置の保存
- 技術同士の接続ラベル・説明の管理
- 公開用プロジェクトページ

## 使用技術

- フロントエンド: Next.js, React, Tailwind CSS, Auth.js, React Flow
- バックエンド: Hono, Vite
- データベース: PostgreSQL, Prisma
- パッケージ管理: pnpm workspace

## ディレクトリ構成

```txt
apps/
  api/   Hono API
  web/   Next.js アプリ
packages/
  db/    Prisma schema と migrations
  shared-types/
docs/
  deploy.md
```

## ローカル開発

依存関係をインストールします。

```bash
pnpm install
```

PostgreSQL を起動します。

```bash
docker compose up -d
```

環境変数ファイルを作成します。

```bash
cp apps/web/env.example apps/web/.env.local
cp apps/api/env.example apps/api/.env
cp apps/api/env.example packages/db/.env
```

作成したファイルに、ローカル環境用の値を設定します。GitHub OAuth の Callback URL は以下を使います。

```txt
http://localhost:3000/api/auth/callback/github
```

Prisma のマイグレーションとクライアント生成を実行します。

```bash
pnpm --filter db exec prisma migrate deploy
pnpm --filter db exec prisma generate
```

APIを起動します。

```bash
pnpm --filter api dev
```

Webアプリを起動します。

```bash
pnpm --filter web dev
```

以下のURLを開きます。

```txt
http://localhost:3000
```

## 環境変数

フロントエンド:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:5173"
DATABASE_URL="postgresql://user:password@localhost:5433/techgraph_db?schema=public"
AUTH_SECRET="replace-with-auth-secret"
AUTH_GITHUB_ID="replace-with-github-client-id"
AUTH_GITHUB_SECRET="replace-with-github-client-secret"
```

バックエンド:

```env
DATABASE_URL="postgresql://user:password@localhost:5433/techgraph_db?schema=public"
CORS_ORIGINS="http://localhost:3000"
```

## デプロイ

デプロイ手順は [docs/deploy.md](docs/deploy.md) にまとめています。
