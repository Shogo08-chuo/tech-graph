import { serve } from '@hono/node-server'
import app from './index.js'

const port = Number(process.env.PORT ?? 5173)

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`TechGraph API listening on http://${info.address}:${info.port}`)
  },
)
