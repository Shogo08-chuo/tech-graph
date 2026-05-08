import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PrismaPg } from '@prisma/adapter-pg'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../../../packages/db/generated/prisma')

// .envファイルを読み込む設定
config({
  path: fileURLToPath(new URL('../../../packages/db/.env', import.meta.url)),
  quiet: true,
})
config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
})

const app = new Hono()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Check packages/db/.env.')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({
  adapter,
})

const DEFAULT_CONNECTION_LABEL = '関連'
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
const WRITE_ENDPOINT_DISABLED_MESSAGE =
  'このエンドポイントは無効化されています。認証済みの /api/me 系ルートを利用してください。'

function envList(value: string | undefined) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

const allowedOrigins = (() => {
  const configuredOrigins = envList(process.env.CORS_ORIGINS || process.env.FRONTEND_URL)

  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CORS_ORIGINS
})()

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function connectionLabel(value: unknown) {
  return optionalText(value) ?? DEFAULT_CONNECTION_LABEL
}

app.use(
  '/*',
  cors({
    origin: allowedOrigins,
  }),
)

// --- ここからエンドポイント ---

// 1. ユーザー一覧を取得する (GET)
app.get('/users', async (c) => {
  return c.json({ error: 'このエンドポイントは公開されていません' }, 403)
})

// 2. 新しいユーザーを登録する (POST) ★今回追加
app.post('/users', async (c) => {
  return c.json({ error: 'このエンドポイントは公開されていません' }, 403)
})

// 最初の挨拶
app.get('/', (c) => {
  return c.text('Hello TechGraph API!')
})

// 3. 技術一覧を取得する (GET)
app.get('/technologies', async (c) => {
  try {
    const techs = await prisma.technology.findMany()
    return c.json(techs)
  } catch (error) {
    console.error(error)
    return c.json({ error: '技術データの取得に失敗しました' }, 500)
  }
})

// 4. 新しい技術を登録する (POST)
app.post('/technologies', async (c) => {
  try {
    const body = await c.req.json()
    const name = optionalText(body.name)
    const category = optionalText(body.category)

    if (!name || !category) {
      return c.json({ error: 'name, category が必要です' }, 400)
    }

    const newTech = await prisma.technology.upsert({
      where: { name },
      update: {},
      create: {
        name,
        category,
      },
    })
    return c.json(newTech, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: '技術の保存に失敗しました' }, 500)
  }
})

// 5. プロジェクト一覧を取得する (GET)
app.get('/projects', async (c) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    return c.json(projects)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクトの取得に失敗しました' }, 500)
  }
})

// 6. プロジェクト詳細を取得する (GET)
app.get('/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const project = await prisma.project.findFirst({
      where: {
        id,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        technologies: {
          include: {
            technology: true,
          },
        },
        connections: {
          include: {
            fromTech: true,
            toTech: true,
          },
        },
      },
    })

    if (!project) {
      return c.json({ error: '公開中のプロジェクトが見つかりません' }, 404)
    }

    return c.json(project)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクト詳細の取得に失敗しました' }, 500)
  }
})

// 7. プロジェクト情報を更新する (PATCH)
app.patch('/projects/:id', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 8. 公開中のプロジェクトを取得する (GET)
app.get('/public/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const project = await prisma.project.findFirst({
      where: {
        id,
        isPublic: true,
      },
      include: {
        user: true,
        technologies: {
          include: {
            technology: true,
          },
        },
        connections: {
          include: {
            fromTech: true,
            toTech: true,
          },
        },
      },
    })

    if (!project) {
      return c.json({ error: '公開中のプロジェクトが見つかりません' }, 404)
    }

    return c.json(project)
  } catch (error) {
    console.error(error)
    return c.json({ error: '公開プロジェクトの取得に失敗しました' }, 500)
  }
})

// 7. プロジェクトに使用技術を追加する (POST)
app.post('/projects/:id/technologies', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 8. プロジェクト内の技術ノード位置を更新する (PATCH)
app.patch('/projects/:id/technologies/:technologyId/position', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 8. プロジェクトから使用技術を削除する (DELETE)
app.delete('/projects/:id/technologies/:technologyId', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 8. プロジェクト内の技術同士を接続する (POST)
app.post('/projects/:id/connections', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 9. プロジェクト内の接続ラベル・理由を更新する (PATCH)
app.patch('/projects/:id/connections/:connectionId', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 9. プロジェクト内の接続を削除する (DELETE)
app.delete('/projects/:id/connections/:connectionId', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 6. 新しいプロジェクトを登録する (POST)
app.post('/projects', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

// 8. 技術同士のつながり一覧を取得 (GET)
app.get('/connections', async (c) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        project: {
          isPublic: true,
        },
      },
      include: {
        fromTech: true,
        toTech: true
      }
    })
    return c.json(connections)
  } catch (error) {
    console.error(error)
    return c.json({ error: '接続データの取得に失敗しました' }, 500)
  }
})

// 9. 新しいつながりを登録 (POST)
app.post('/connections', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})
app.post('/seed-techs', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

app.get('/seed-techs', async (c) => {
  return c.json({ error: WRITE_ENDPOINT_DISABLED_MESSAGE }, 403)
})

export default app
