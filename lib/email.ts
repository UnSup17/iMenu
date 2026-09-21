/**
 * lib/email.ts
 * Módulo de envío de emails con nodemailer.
 * Si EMAIL_SERVER_HOST no está configurado, los emails se loguean en consola (modo desarrollo).
 */

import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM = process.env.EMAIL_FROM ?? 'iMenu <noreply@imenu.app>'

function getTransporter() {
  const host = process.env.EMAIL_SERVER_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  })
}

async function sendMail(to: string, subject: string, html: string) {
  const transporter = getTransporter()

  if (!transporter) {
    // Fallback de desarrollo: imprimir en consola
    console.log('\n' + '═'.repeat(60))
    console.log('📧  [iMenu Email — Modo Desarrollo / Sin SMTP]')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('─'.repeat(60))
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(l => l.startsWith('http'))
    if (links.length > 0) {
      console.log('Links en el email:')
      links.forEach(l => console.log('  →', l))
    }
    console.log('═'.repeat(60) + '\n')
    return
  }

  await transporter.sendMail({ from: FROM, to, subject, html })
}

/* ── Templates ─────────────────────────────────────────────────────────── */

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #27272a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">i<span style="color:#f59e0b;">Menu</span></h1>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #27272a;background:#09090b;">
            <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
              © 2026 iMenu · Si no solicitaste este email, ignóralo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(href: string, text: string) {
  return `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#09090b;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">${text}</a>`
}

function fallbackLink(url: string) {
  return `<p style="margin:20px 0 0;font-size:12px;color:#52525b;">Si el botón no funciona, copia: <code style="color:#f59e0b;word-break:break-all;">${url}</code></p>`
}

/* ── Email: Verificación de email ───────────────────────────────────────── */

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  await sendMail(to, 'Confirma tu cuenta en iMenu', baseTemplate(`
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">¡Bienvenido a iMenu! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Tu restaurante está casi listo. Confirma tu dirección de email para activar tu cuenta:
    </p>
    ${btn(url, 'Confirmar mi cuenta →')}
    <p style="margin:16px 0 0;font-size:12px;color:#52525b;">Este link expira en <strong style="color:#d4d4d8;">24 horas</strong>.</p>
    ${fallbackLink(url)}
  `))
}

/* ── Email: Reset de contraseña ─────────────────────────────────────────── */

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
  await sendMail(to, 'Restablecer contraseña — iMenu', baseTemplate(`
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">Restablece tu contraseña 🔑</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br/>
      Si no la solicitaste, ignora este email.
    </p>
    ${btn(url, 'Restablecer contraseña →')}
    <p style="margin:16px 0 0;font-size:12px;color:#52525b;">Este link expira en <strong style="color:#d4d4d8;">1 hora</strong>.</p>
    ${fallbackLink(url)}
  `))
}

/* ── Email: Invitación de usuario ───────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
  ACCOUNTANT: 'Contador',
  MANAGER: 'Gerente',
  RESTAURANT_ADMIN: 'Administrador',
  ORG_ADMIN: 'Admin de Organización',
}

export async function sendInviteEmail(
  to: string,
  token: string,
  restaurantName: string,
  role: string
) {
  const url = `${APP_URL}/accept-invite?token=${encodeURIComponent(token)}`
  const roleLabel = ROLE_LABELS[role] ?? role

  await sendMail(to, `Invitación a ${restaurantName} en iMenu`, baseTemplate(`
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">Te han invitado a iMenu 📩</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      <strong style="color:#ffffff;">${restaurantName}</strong> te ha invitado como
      <strong style="color:#f59e0b;">${roleLabel}</strong>.
      Acepta la invitación para crear tu cuenta:
    </p>
    ${btn(url, 'Aceptar invitación →')}
    <p style="margin:16px 0 0;font-size:12px;color:#52525b;">Esta invitación expira en <strong style="color:#d4d4d8;">72 horas</strong>.</p>
    ${fallbackLink(url)}
  `))
}

/* ── Email: Factura / Comprobante de Pago ───────────────────────────────── */

export interface InvoiceEmailPayload {
  to: string
  invoiceNumber: string
  restaurantName: string
  totalAmount: number
  items: Array<{ description: string; quantity: number; unitPrice: number; subtotal: number }>
  invoiceUrl?: string
}

export async function sendInvoiceEmail(payload: InvoiceEmailPayload) {
  const { to, invoiceNumber, restaurantName, totalAmount, items, invoiceUrl } = payload
  const formattedTotal = totalAmount.toLocaleString('es-CO')

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;color:#e4e4e7;font-size:14px;border-bottom:1px solid #27272a;">
          ${item.description}
        </td>
        <td align="center" style="padding:8px 0;color:#a1a1aa;font-size:14px;border-bottom:1px solid #27272a;">
          ${item.quantity}
        </td>
        <td align="right" style="padding:8px 0;color:#ffffff;font-size:14px;font-family:monospace;border-bottom:1px solid #27272a;">
          $${item.subtotal.toLocaleString('es-CO')}
        </td>
      </tr>
    `
    )
    .join('')

  const buttonHtml = invoiceUrl ? `<div style="margin-top:24px;">${btn(invoiceUrl, 'Ver Comprobante Digital 🧾')}</div>` : ''

  await sendMail(
    to,
    `Comprobante de Pago #${invoiceNumber} — ${restaurantName}`,
    baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">¡Gracias por tu visita! 🍽️</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;">
        Adjuntamos el resumen de tu consumo en <strong style="color:#f59e0b;">${restaurantName}</strong>.
      </p>

      <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:12px;color:#71717a;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">
          Factura N° <span style="color:#ffffff;">${invoiceNumber}</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #3f3f46;">
              <th align="left" style="padding-bottom:8px;font-size:12px;color:#a1a1aa;font-weight:600;">Ítem</th>
              <th align="center" style="padding-bottom:8px;font-size:12px;color:#a1a1aa;font-weight:600;">Cant.</th>
              <th align="right" style="padding-bottom:8px;font-size:12px;color:#a1a1aa;font-weight:600;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding-top:14px;font-size:16px;font-weight:700;color:#ffffff;">Total Pagado:</td>
              <td align="right" style="padding-top:14px;font-size:18px;font-weight:900;color:#10b981;font-family:monospace;">
                $${formattedTotal} COP
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${buttonHtml}
    `)
  )
}

/* ── Email: Bienvenida Restaurante / Usuario ───────────────────────────── */

export async function sendWelcomeEmail(to: string, userName: string, restaurantName: string) {
  const url = `${APP_URL}/dashboard`
  await sendMail(
    to,
    `¡Te damos la bienvenida a iMenu, ${userName}! 🚀`,
    baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">¡Hola, ${userName}! 👋</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
        Tu restaurante <strong style="color:#f59e0b;">${restaurantName}</strong> ya está configurado en <strong>iMenu</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.5;">
        Con iMenu puedes gestionar comandas en vivo con KDS, control de inventario automatizado, facturación electrónica, códigos QR dinámicos y branding personalizado.
      </p>
      ${btn(url, 'Ir a mi Panel de Control →')}
    `)
  )
}

/* ── Email: Alerta de Stock Bajo (Inventario) ──────────────────────────── */

export async function sendLowStockAlertEmail(
  to: string,
  restaurantName: string,
  lowStockItems: Array<{ name: string; currentStock: number; minStock: number; unit: string }>
) {
  const url = `${APP_URL}/dashboard/inventory`
  const itemsList = lowStockItems
    .map(
      (item) => `
      <li style="margin-bottom:8px;font-size:14px;color:#fca5a5;">
        <strong>${item.name}</strong>: Stock actual 
        <span style="font-family:monospace;color:#ffffff;">${item.currentStock} ${item.unit}</span> 
        (Mínimo configurado: ${item.minStock} ${item.unit})
      </li>
    `
    )
    .join('')

  await sendMail(
    to,
    `⚠️ ALERTA: ${lowStockItems.length} ingrediente(s) con stock crítico en ${restaurantName}`,
    baseTemplate(`
      <div style="display:inline-block;background:#ef444420;border:1px solid #ef444450;color:#f87171;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:12px;">
        ⚠️ Alerta de Inventario
      </div>
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">
        Ingredientes con Existencias Críticas
      </h2>
      <p style="margin:0 0 16px;font-size:14px;color:#a1a1aa;line-height:1.5;">
        Los siguientes ingredientes de <strong style="color:#f59e0b;">${restaurantName}</strong> han alcanzado o descendido por debajo de su umbral mínimo de seguridad:
      </p>
      <ul style="background:#09090b;border:1px solid #7f1d1d;border-radius:12px;padding:16px 20px 16px 36px;margin:0 0 24px 0;">
        ${itemsList}
      </ul>
      ${btn(url, 'Gestionar Inventario →')}
    `)
  )
}

/* ── Email: Bienvenida y Onboarding de 3 Pasos (Fase 9) ────────────────── */

export async function sendOnboardingWelcomeEmail(
  to: string,
  restaurantName: string,
  adminName: string
) {
  const url = `${APP_URL}/dashboard`
  await sendMail(
    to,
    `¡Bienvenido a iMenu, ${restaurantName}! 🚀 Tu guía de primeros pasos`,
    baseTemplate(`
      <div style="display:inline-block;background:#f59e0b20;border:1px solid #f59e0b50;color:#f59e0b;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:12px;">
        🎉 Bienvenida a iMenu
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;">
        ¡Hola, ${adminName}! Tu restaurante está listo para despegar 🚀
      </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">
        Estamos emocionados de acompañar a <strong style="color:#f59e0b;">${restaurantName}</strong> en su transformación digital. Para poner en marcha tu establecimiento en menos de 10 minutos, sigue estos 3 simples pasos:
      </p>

      <div style="background:#09090b;border:1px solid #27272a;border-radius:14px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;margin-bottom:16px;">
          <div style="font-size:18px;margin-right:12px;">📋</div>
          <div>
            <strong style="color:#ffffff;font-size:14px;display:block;margin-bottom:2px;">Paso 1: Carga tu Menú o Sube tu PDF</strong>
            <span style="color:#71717a;font-size:13px;line-height:1.4;">Crea tus categorías y platos estrella, o sube tu PDF y conviértelo en una carta táctil interactiva.</span>
          </div>
        </div>

        <div style="display:flex;margin-bottom:16px;">
          <div style="font-size:18px;margin-right:12px;">🪑</div>
          <div>
            <strong style="color:#ffffff;font-size:14px;display:block;margin-bottom:2px;">Paso 2: Distribuye tus Mesas</strong>
            <span style="color:#71717a;font-size:13px;line-height:1.4;">Organiza tu salón por zonas (Terraza, Salón, Barra) con el diseñador 2D interactivo.</span>
          </div>
        </div>

        <div style="display:flex;">
          <div style="font-size:18px;margin-right:12px;">📱</div>
          <div>
            <strong style="color:#ffffff;font-size:14px;display:block;margin-bottom:2px;">Paso 3: Descarga e Imprime tus QR</strong>
            <span style="color:#71717a;font-size:13px;line-height:1.4;">Imprime los identificadores QR con tu logotipo oficial y colócalos en cada mesa para recibir comandas en tiempo real.</span>
          </div>
        </div>
      </div>

      <p style="margin:0 0 24px;font-size:13px;color:#71717a;">
        Tienes <strong>14 días de prueba gratuita</strong> con acceso completo a todas las herramientas profesionales.
      </p>

      ${btn(url, 'Iniciar Configuración en mi Panel →')}
    `)
  )
}

/* ── Email: Alerta de Expiración de Prueba Gratuita (Fase 9) ────────────── */

export async function sendTrialExpiringEmail(
  to: string,
  restaurantName: string,
  daysLeft: number,
  upgradeUrl?: string
) {
  const url = upgradeUrl || `${APP_URL}/dashboard/settings/billing`
  const urgencyTitle = daysLeft <= 1 ? '¡Tu prueba de iMenu expira MAÑANA! ⏳' : `Tu prueba gratuita de iMenu finaliza en ${daysLeft} días ⏳`

  await sendMail(
    to,
    urgencyTitle,
    baseTemplate(`
      <div style="display:inline-block;background:#ef444420;border:1px solid #ef444450;color:#f87171;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:12px;">
        ⏳ Notificación de Suscripción
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;">
        ${urgencyTitle}
      </h2>
      <p style="margin:0 0 16px;font-size:14px;color:#a1a1aa;line-height:1.6;">
        El período de prueba de 14 días para <strong style="color:#f59e0b;">${restaurantName}</strong> está por culminar. Para garantizar que tus clientes sigan ordenando mediante los códigos QR de mesa sin interrupciones, actualiza a cualquiera de nuestros planes comerciales:
      </p>

      <ul style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:16px 20px 16px 36px;margin:0 0 24px 0;font-size:13px;color:#d4d4d8;line-height:1.6;">
        <li>✨ <strong>Menú QR ilimitado</strong> y pedidos directos a cocina (KDS).</li>
        <li>📊 <strong>Control de inventario y mermas</strong> con costeo de recetas.</li>
        <li>📑 <strong>Facturación electrónica</strong> directa (DIAN Colombia / CFDI México).</li>
        <li>🎨 <strong>Estudio de marca con White-Label</strong> y dominio propio.</li>
      </ul>

      ${btn(url, 'Elegir Plan y Mantener mi Menú Activo →')}
      <p style="margin:16px 0 0;font-size:12px;color:#52525b;text-align:center;">
        Sin contratos forzosos. Puedes cambiar de plan o cancelar en cualquier momento.
      </p>
    `)
  )
}


