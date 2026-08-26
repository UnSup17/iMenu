/**
 * Custom Next.js Server con Socket.IO integrado.
 *
 * Uso: npm run dev:server (en lugar de npm run dev)
 *
 * IMPORTANTE: Este servidor es para DESARROLLO LOCAL y deploys en
 * Railway/Render/VPS. Vercel no soporta WebSockets de larga duración.
 *
 * En Vercel, los eventos se deben manejar via Upstash Redis Pub/Sub + SSE.
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './lib/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME ?? 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('[Custom Server] Error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // Inicializar Socket.IO adjunto al servidor HTTP
  initSocketServer(httpServer)

  httpServer.listen(port, hostname, () => {
    console.log(`
  ┌─────────────────────────────────────────┐
  │  🍔 iMenu Dev Server listo              │
  │  URL:  http://${hostname}:${port}         │
  │  WS:   ws://${hostname}:${port}/api/socketio │
  └─────────────────────────────────────────┘
    `)
  })
})
