/**
 * POST /api/hardware/print-escpos
 *
 * Recibe un buffer de bytes ESC/POS y lo envía via TCP a la impresora térmica de red.
 * Requiere runtime Node.js (no Edge). La impresora debe ser accesible desde el servidor.
 *
 * Body: { printerIp: string, printerPort?: number, buffer: number[] }
 * Respuesta: { ok: boolean, message: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import net from 'net'

export const runtime = 'nodejs'

const CONNECT_TIMEOUT_MS = 4000
const SEND_TIMEOUT_MS    = 6000

function sendToNetworkPrinter(
  ip: string,
  port: number,
  data: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false

    const done = (err?: Error) => {
      if (settled) return
      settled = true
      socket.destroy()
      err ? reject(err) : resolve()
    }

    socket.setTimeout(SEND_TIMEOUT_MS)

    socket.connect(port, ip, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) return done(writeErr)
        // Pequeño delay para que la impresora procese antes de cerrar
        setTimeout(() => done(), 200)
      })
    })

    socket.on('timeout', () => done(new Error('Timeout de conexión con la impresora')))
    socket.on('error', (err) => done(err))

    // Timeout de conexión inicial
    const connectTimer = setTimeout(
      () => done(new Error(`No se pudo conectar a ${ip}:${port} en ${CONNECT_TIMEOUT_MS}ms`)),
      CONNECT_TIMEOUT_MS
    )
    socket.once('connect', () => clearTimeout(connectTimer))
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { printerIp, printerPort = 9100, buffer } = body

    if (!printerIp || typeof printerIp !== 'string') {
      return NextResponse.json({ error: 'printerIp es requerido' }, { status: 400 })
    }

    if (!Array.isArray(buffer) || buffer.length === 0) {
      return NextResponse.json({ error: 'buffer ESC/POS vacío' }, { status: 400 })
    }

    // Validar que la IP no apunte a rangos no privados (seguridad básica)
    const privateIpRe = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|localhost)/i
    if (!privateIpRe.test(printerIp)) {
      return NextResponse.json(
        { error: 'Solo se permiten impresoras en red local (IPs privadas)' },
        { status: 400 }
      )
    }

    const rawBuffer = Buffer.from(buffer as number[])
    await sendToNetworkPrinter(printerIp, Number(printerPort), rawBuffer)

    return NextResponse.json({ ok: true, message: `Ticket enviado a ${printerIp}:${printerPort}` })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[ESC/POS Print API]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
