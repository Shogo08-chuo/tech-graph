# TechGraph

TechGraph は、プロジェクトで使用した技術と技術同士の関係をグラフで整理・公開できるポートフォリオアプリです。

単に「使用技術を一覧で並べる」だけでは、技術選定の理由や技術同士のつながりが伝わりにくいという課題があります。そこで、プロジェクトごとに使用技術を登録し、技術間の関係をノードとエッジで可視化することで、開発内容をより構造的に説明できるようにすることを目的として作成しました。

## 作成物の説明

TechGraph では、GitHubログイン / Googleログインでユーザーを管理し、ログインユーザーが自身のプロジェクトを作成・編集できます。各プロジェクトには、タイトル、概要、開発期間、GitHub URL、使用技術、技術同士の接続情報を登録できます。

登録した情報は React Flow によるグラフとして表示され、ノードの位置も保存できます。また、作成したプロジェクトは公開ページとして表示できます。

## 担当範囲

本リポジトリは個人開発として、以下の工程を担当しました。

- 要件整理、基本設計、詳細設計
- Prisma によるデータベース設計
- Hono によるバックエンドAPI実装
- Next.js / React によるフロントエンド実装
- Auth.js と GitHub OAuth / Google OAuth によるログイン機能実装
- React Flow を用いた技術グラフ表示、ノード位置保存機能の実装
- Docker / Nginx / Docker Compose による本番実行構成の作成
- Terraform によるAWS EC2環境の構築と本番運用反映
- README、デプロイ手順などのドキュメント整備

## 主な機能

- GitHubログイン
- プロジェクトの作成・編集
- タイトル、概要、開発期間、GitHub URL の管理
- 技術の登録
- プロジェクトごとの使用技術の追加・削除
- React Flow による技術グラフの表示
- ノード位置の保存
- 技術同士の接続ラベル・説明の管理
- 公開用プロジェクトページ

## 直面した課題と解決方法

### ノード位置が保存されない問題

技術ノードを移動しても、画面更新後に位置が反映されない問題がありました。原因は、フロントエンドで変更した座標情報をバックエンド・DBへ正しく更新する処理が不足していたことです。

対応として、プロジェクト内の技術ノードごとに位置情報を更新するAPIを追加し、ドラッグ後の座標をPrisma経由で保存するように修正しました。

### 接続情報入力のUX改善

当初は技術同士の接続にラベルや説明の入力を必須としていましたが、毎回理由を書く必要があり、操作負荷が高くなる課題がありました。

対応として、接続ラベル・説明を任意入力に変更し、まずは技術同士を素早くつなげられるようにしました。必要な場合だけ補足説明を書ける設計にすることで、入力の手軽さと情報量のバランスを取りました。

### ログインとユーザー別データ管理

GitHubログイン / Googleログイン後に、ログインユーザー本人のプロジェクトだけを扱えるようにする必要がありました。

対応として、Auth.js のセッション情報とDB上のユーザー情報を紐づけ、ログイン中のユーザーIDをもとにプロジェクトを作成・取得するAPIを実装しました。

### 秘密情報の管理

GitHub OAuth / Google OAuth の Client Secret や `AUTH_SECRET` など、公開リポジトリに含めてはいけない情報を扱う必要がありました。

対応として、`.env.local` や `.env` を `.gitignore` に追加し、READMEには実値ではなくダミー値を記載しました。

### AWSデプロイ実施

EC2へSSH接続できない場面がありました。セキュリティグループやVPCの設定は正常でしたが、利用ネットワークから22番ポートへ到達できない可能性がありました。

対応として、EC2にSystems Manager用IAMロールを付与し、Session Manager経由で接続できるようにしました。また、EC2上にGit、Docker、Docker Composeを導入し、`web` / `api` / `postgres` / `nginx` を起動して公開URLからの動作確認まで実施しました。あわせて Elastic IP を関連付け、停止・起動後も同じ公開IPで運用できる構成にしました。

## 技術情報

### 使用技術

- フロントエンド: Next.js, React, Tailwind CSS, Auth.js, React Flow
- バックエンド: Hono, Vite
- データベース: PostgreSQL, Prisma
- インフラ: AWS EC2, IAM, Systems Manager Session Manager
- IaC: Terraform
- コンテナ: Docker, Docker Compose, Nginx
- パッケージ管理: pnpm workspace

### 使用API・外部連携

- GitHub OAuth API: GitHubログインに使用
- Google OAuth API: Googleログインに使用
- AWS Systems Manager Session Manager: EC2への接続に使用
- Terraform AWS Provider: AWSリソース作成に使用

### 使用モデル

アプリケーション機能として、生成AIや機械学習モデルは使用していません。

データモデルとしては、主に以下の情報を扱っています。

- User: GitHubログインユーザー
- Project: ユーザーが作成するプロジェクト
- Technology: 登録済みの技術
- ProjectTechnology: プロジェクト内で使用する技術とノード位置
- Connection: 技術同士の接続関係、ラベル、説明

### アーキテクチャ

```txt
Browser
  |
  | Next.js
  v
apps/web
  |-- Auth.js / GitHub OAuth / Google OAuth
  |-- React Flow
  |
  | API request
  v
apps/api
  |-- Hono API
  |
  | Prisma
  v
PostgreSQL
```

本番環境では、Nginx をリバースプロキシとして配置し、Web、API、DBをDocker Composeでまとめて起動する構成を想定しています。

```txt
Internet
  |
  v
Nginx
  |-- /          -> Next.js
  |-- /backend/  -> Hono API
                  |
                  v
              PostgreSQL
```

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
infra/
  terraform/
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

作成したファイルに、ローカル環境用の値を設定します。OAuth の Callback URL は以下を使います。

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
AUTH_GOOGLE_ID="replace-with-google-client-id"
AUTH_GOOGLE_SECRET="replace-with-google-client-secret"
```

バックエンド:

```env
DATABASE_URL="postgresql://user:password@localhost:5433/techgraph_db?schema=public"
CORS_ORIGINS="http://localhost:3000"
```

## デプロイ

デプロイ手順は [docs/deploy.md](docs/deploy.md) にまとめています。
Google Play 提出準備は [docs/google-play-release-checklist.md](docs/google-play-release-checklist.md) にまとめています。

## 本番反映状況

EC2上で Docker Compose により `web` / `api` / `postgres` / `nginx` を起動し、Nginx 経由でアプリを公開できることを確認済みです。

- API疎通確認: `curl http://localhost/backend/` で `Hello TechGraph API!` を確認
- ブラウザ確認: 公開URLでトップ画面を表示可能
- Session Manager 経由で運用可能

## 運用メモ

- 公開IPは Elastic IP を関連付けて固定化済み
- EC2を停止しても同じElastic IPを使えるため、毎回のIP差し替え作業を減らせる
- OAuth設定は以下を使用
  - Homepage URL: `http://<ELASTIC_IP>`
  - Authorization callback URL: `http://<ELASTIC_IP>/api/auth/callback/github`
