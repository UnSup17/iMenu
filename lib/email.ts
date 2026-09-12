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
