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
  try {
    const users = await prisma.user.findMany()
    return c.json(users)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'データベース接続に失敗しました' }, 500)
  }
})

// 2. 新しいユーザーを登録する (POST) ★今回追加
app.post('/users', async (c) => {
  try {
    // フロントから送られてきたJSONデータを取得
    const body = await c.req.json()
    
    // データベースに保存
    const newUser = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
      },
    })
    
    // 成功したら、作成したデータをステータスコード201（Created）で返す
    return c.json(newUser, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'ユーザーの保存に失敗しました' }, 500)
  }
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
    // include を使うと、紐づいているユーザー情報も一緒に取れます
    const projects = await prisma.project.findMany({
      include: { user: true } 
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
    const project = await prisma.project.findUnique({
      where: { id },
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
      return c.json({ error: 'プロジェクトが見つかりません' }, 404)
    }

    return c.json(project)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクト詳細の取得に失敗しました' }, 500)
  }
})

// 7. プロジェクト情報を更新する (PATCH)
app.patch('/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    const data: {
      title?: string
      description?: string | null
      period?: string | null
      githubUrl?: string | null
      isPublic?: boolean
    } = {}

    if (typeof body.title === 'string') {
      data.title = body.title
    }

    if ('description' in body) {
      data.description = body.description
    }

    if ('period' in body) {
      data.period = typeof body.period === 'string' ? body.period : null
    }

    if ('githubUrl' in body) {
      data.githubUrl = typeof body.githubUrl === 'string' ? body.githubUrl : null
    }

    if (typeof body.isPublic === 'boolean') {
      data.isPublic = body.isPublic
    }

    if (Object.keys(data).length === 0) {
      return c.json({ error: '更新する項目がありません' }, 400)
    }

    const project = await prisma.project.update({
      where: { id },
      data,
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

    return c.json(project)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクトの更新に失敗しました' }, 500)
  }
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
  try {
    const projectId = c.req.param('id')
    const body = await c.req.json()
    const technologyId = body.technologyId

    if (!technologyId) {
      return c.json({ error: 'technologyId が必要です' }, 400)
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return c.json({ error: 'プロジェクトが見つかりません' }, 404)
    }

    const technology = await prisma.technology.findUnique({
      where: { id: technologyId },
    })

    if (!technology) {
      return c.json({ error: '技術が見つかりません' }, 404)
    }

    const technologyCount = await prisma.projectTechnology.count({
      where: { projectId },
    })

    const projectTechnology = await prisma.projectTechnology.upsert({
      where: {
        projectId_technologyId: {
          projectId,
          technologyId,
        },
      },
      update: {},
      create: {
        projectId,
        technologyId,
        positionX: (technologyCount % 3) * 230,
        positionY: Math.floor(technologyCount / 3) * 160,
      },
      include: {
        technology: true,
      },
    })

    return c.json(projectTechnology, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクト技術の保存に失敗しました' }, 500)
  }
})

// 8. プロジェクト内の技術ノード位置を更新する (PATCH)
app.patch('/projects/:id/technologies/:technologyId/position', async (c) => {
  try {
    const projectId = c.req.param('id')
    const technologyId = c.req.param('technologyId')
    const body = await c.req.json()
    const { positionX, positionY } = body

    if (typeof positionX !== 'number' || typeof positionY !== 'number') {
      return c.json({ error: 'positionX, positionY は数値で指定してください' }, 400)
    }

    if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) {
      return c.json({ error: 'positionX, positionY は有限の数値で指定してください' }, 400)
    }

    const projectTechnology = await prisma.projectTechnology.findUnique({
      where: {
        projectId_technologyId: {
          projectId,
          technologyId,
        },
      },
    })

    if (!projectTechnology) {
      return c.json({ error: 'プロジェクトの技術が見つかりません' }, 404)
    }

    const updatedProjectTechnology = await prisma.projectTechnology.update({
      where: {
        projectId_technologyId: {
          projectId,
          technologyId,
        },
      },
      data: {
        positionX,
        positionY,
      },
      include: {
        technology: true,
      },
    })

    return c.json(updatedProjectTechnology)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'ノード位置の更新に失敗しました' }, 500)
  }
})

// 8. プロジェクトから使用技術を削除する (DELETE)
app.delete('/projects/:id/technologies/:technologyId', async (c) => {
  try {
    const projectId = c.req.param('id')
    const technologyId = c.req.param('technologyId')

    const projectTechnology = await prisma.projectTechnology.findUnique({
      where: {
        projectId_technologyId: {
          projectId,
          technologyId,
        },
      },
    })

    if (!projectTechnology) {
      return c.json({ error: 'プロジェクトの技術が見つかりません' }, 404)
    }

    const [deletedConnections] = await prisma.$transaction([
      prisma.connection.deleteMany({
        where: {
          projectId,
          OR: [
            { fromTechId: technologyId },
            { toTechId: technologyId },
          ],
        },
      }),
      prisma.projectTechnology.delete({
        where: {
          projectId_technologyId: {
            projectId,
            technologyId,
          },
        },
      }),
    ])

    return c.json({
      message: '技術をプロジェクトから削除しました',
      deletedConnections: deletedConnections.count,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクト技術の削除に失敗しました' }, 500)
  }
})

// 8. プロジェクト内の技術同士を接続する (POST)
app.post('/projects/:id/connections', async (c) => {
  try {
    const projectId = c.req.param('id')
    const body = await c.req.json()
    const { fromTechId, toTechId, description } = body

    if (!fromTechId || !toTechId) {
      return c.json({ error: 'fromTechId, toTechId が必要です' }, 400)
    }

    if (fromTechId === toTechId) {
      return c.json({ error: '異なる技術同士を選択してください' }, 400)
    }

    const projectTechnologies = await prisma.projectTechnology.findMany({
      where: {
        projectId,
        technologyId: {
          in: [fromTechId, toTechId],
        },
      },
    })

    if (projectTechnologies.length !== 2) {
      return c.json({ error: 'プロジェクトに追加済みの技術だけ接続できます' }, 400)
    }

    const newConnection = await prisma.connection.create({
      data: {
        projectId,
        fromTechId,
        toTechId,
        label: connectionLabel(body.label),
        description: optionalText(description),
      },
      include: {
        fromTech: true,
        toTech: true,
      },
    })

    return c.json(newConnection, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: '接続の保存に失敗しました' }, 500)
  }
})

// 9. プロジェクト内の接続ラベル・理由を更新する (PATCH)
app.patch('/projects/:id/connections/:connectionId', async (c) => {
  try {
    const projectId = c.req.param('id')
    const connectionId = c.req.param('connectionId')
    const body = await c.req.json()
    const { description } = body

    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        projectId,
      },
    })

    if (!connection) {
      return c.json({ error: '接続が見つかりません' }, 404)
    }

    const updatedConnection = await prisma.connection.update({
      where: {
        id: connectionId,
      },
      data: {
        label: connectionLabel(body.label),
        description: optionalText(description),
      },
      include: {
        fromTech: true,
        toTech: true,
      },
    })

    return c.json(updatedConnection)
  } catch (error) {
    console.error(error)
    return c.json({ error: '接続の更新に失敗しました' }, 500)
  }
})

// 9. プロジェクト内の接続を削除する (DELETE)
app.delete('/projects/:id/connections/:connectionId', async (c) => {
  try {
    const projectId = c.req.param('id')
    const connectionId = c.req.param('connectionId')

    const result = await prisma.connection.deleteMany({
      where: {
        id: connectionId,
        projectId,
      },
    })

    if (result.count === 0) {
      return c.json({ error: '接続が見つかりません' }, 404)
    }

    return c.json({ message: '接続を削除しました' })
  } catch (error) {
    console.error(error)
    return c.json({ error: '接続の削除に失敗しました' }, 500)
  }
})

// 6. 新しいプロジェクトを登録する (POST)
app.post('/projects', async (c) => {
  try {
    const body = await c.req.json()
    const newProject = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description,
        period: body.period,
        githubUrl: body.githubUrl,
        userId: body.userId, // ここでユーザーと紐付け！
      },
    })
    return c.json(newProject, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'プロジェクトの保存に失敗しました' }, 500)
  }
})

// 8. 技術同士のつながり一覧を取得 (GET)
app.get('/connections', async (c) => {
  try {
    const connections = await prisma.connection.findMany({
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
  try {
    const body = await c.req.json()
    const newConnection = await prisma.connection.create({
      data: {
        projectId: body.projectId, // どのプロジェクト内でのつながりか
        fromTechId: body.fromTechId,
        toTechId: body.toTechId,
        label: connectionLabel(body.label),
        description: optionalText(body.description),
      },
    })
    return c.json(newConnection, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: '接続の保存に失敗しました' }, 500)
  }
})
app.post('/seed-techs', async (c) => {
  const commonTechs = [
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Vue.js', category: 'Frontend' },
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'Hono', category: 'Backend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'Python', category: 'Backend' },
    { name: 'Go', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Infrastructure' },
    { name: 'MySQL', category: 'Infrastructure' },
    { name: 'Docker', category: 'Infrastructure' },
    { name: 'AWS', category: 'Infrastructure' },
    { name: 'Prisma', category: 'Tool' },
    { name: 'Vite', category: 'Tool' },
  ];

  try {
    const results = await Promise.all(
      commonTechs.map(tech => 
        prisma.technology.upsert({
          where: { name: tech.name },
          update: {},
          create: tech,
        })
      )
    );
    return c.json({ message: '主要技術の投入完了！', count: results.length });
  } catch (e) {
    return c.json({ error: 'シード失敗' }, 500);
  }
});

export default app
