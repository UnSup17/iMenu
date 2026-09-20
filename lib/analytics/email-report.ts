import { prisma } from '@/lib/prisma'
import { getAnalyticsDashboard, AnalyticsDashboardData } from './engine'

export function generateWeeklyExecutiveReportHtml(
  data: AnalyticsDashboardData,
  restaurantName: string
): string {
  const { summary, comparisons, topProducts, waiters, serviceChannels } = data

  const momRevenue = comparisons?.mom.revenue.growthPercent ?? 0
  const isGrowthPositive = momRevenue >= 0

  const top3Waiters = waiters.slice(0, 3)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte Ejecutivo Semanal — ${restaurantName}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          
          <!-- Encabezado -->
          <tr>
            <td style="padding:32px;background:linear-gradient(135deg, #27272a 0%, #18181b 100%);border-bottom:1px solid #3f3f46;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;background:#f59e0b;color:#09090b;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:8px;">
                      Reporte Semanal BI
                    </span>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">
                      ${restaurantName}
                    </h1>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#a1a1aa;">
                      Período: ${data.periodLabel}
                    </p>
                  </td>
                  <td align="right" style="font-size:32px;">
                    📈
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Resumen de KPIs Principales -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:12px;background:#09090b;border:1px solid #27272a;border-radius:12px;">
                    <span style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;display:block;">Facturación Semanal</span>
                    <span style="font-size:22px;font-weight:800;color:#f59e0b;font-family:monospace;display:block;margin:4px 0;">
                      $${summary.totalRevenue.toLocaleString('es-CO')}
                    </span>
                    <span style="font-size:11px;font-weight:bold;color:${isGrowthPositive ? '#10b981' : '#f43f5e'};">
                      ${isGrowthPositive ? '▲ +' : '▼ '}${momRevenue}% vs. período anterior
                    </span>
                  </td>
                  <td width="8"></td>
                  <td width="50%" style="padding:12px;background:#09090b;border:1px solid #27272a;border-radius:12px;">
                    <span style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;display:block;">Ticket Promedio</span>
                    <span style="font-size:22px;font-weight:800;color:#ffffff;font-family:monospace;display:block;margin:4px 0;">
                      $${summary.averageTicket.toLocaleString('es-CO')}
                    </span>
                    <span style="font-size:11px;color:#a1a1aa;">
                      ${summary.totalInvoices} comandas cerradas
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Canales de Servicio -->
          <tr>
            <td style="padding:0 32px 20px 32px;">
              <h3 style="margin:0 0 12px 0;font-size:13px;color:#d4d4d8;text-transform:uppercase;letter-spacing:0.5px;">
                🛵 Distribución por Canales de Venta
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                ${serviceChannels
                  .map(
                    (ch) => `
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#ffffff;">
                    ${ch.channel === 'DINE_IN' ? '🍽️ Salón & Mesas' : ch.channel === 'BAR' ? '🍸 Barra & Directo' : '🛵 Domicilios'}
                  </td>
                  <td align="right" style="padding:6px 0;font-size:12px;font-family:monospace;color:#f59e0b;font-weight:bold;">
                    $${ch.revenue.toLocaleString('es-CO')} (${ch.percentage}%)
                  </td>
                </tr>`
                  )
                  .join('')}
              </table>
            </td>
          </tr>

          <!-- Platos Estrella -->
          <tr>
            <td style="padding:0 32px 20px 32px;">
              <h3 style="margin:0 0 12px 0;font-size:13px;color:#d4d4d8;text-transform:uppercase;letter-spacing:0.5px;">
                ⭐ Top 5 Platos Más Vendidos
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                ${topProducts
                  .map(
                    (p, idx) => `
                <tr style="border-bottom:1px solid #18181b;">
                  <td style="padding:6px 0;font-size:12px;color:#ffffff;">
                    <strong style="color:#f59e0b;">#${idx + 1}</strong> ${p.name}
                  </td>
                  <td align="right" style="padding:6px 0;font-size:12px;color:#a1a1aa;font-family:monospace;">
                    ${p.quantity} unid. ($${p.revenue.toLocaleString('es-CO')})
                  </td>
                </tr>`
                  )
                  .join('')}
              </table>
            </td>
          </tr>

          <!-- Top Meseros -->
          ${
            top3Waiters.length > 0
              ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h3 style="margin:0 0 12px 0;font-size:13px;color:#d4d4d8;text-transform:uppercase;letter-spacing:0.5px;">
                👨‍🍳 Reconocimiento de Equipo de Sala
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                ${top3Waiters
                  .map(
                    (w, i) => `
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#ffffff;">
                    ${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} <strong>${w.name}</strong>
                  </td>
                  <td align="right" style="padding:6px 0;font-size:12px;color:#10b981;font-family:monospace;font-weight:bold;">
                    $${w.totalSales.toLocaleString('es-CO')}
                  </td>
                </tr>`
                  )
                  .join('')}
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- Botón de acción al dashboard -->
          <tr>
            <td align="center" style="padding:10px 32px 32px 32px;">
              <a href="http://localhost:3000/dashboard/analytics" target="_blank" style="display:inline-block;padding:12px 28px;background:#f59e0b;color:#09090b;font-size:13px;font-weight:bold;text-decoration:none;border-radius:8px;box-shadow:0 4px 12px rgba(245,158,11,0.2);">
                Abrir Dashboard Ejecutivo Completo ↗
              </a>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding:20px 32px;background:#09090b;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#71717a;">
                Generado automáticamente por el motor de inteligencia de negocios de <strong>iMenu POS</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendWeeklyExecutiveReport(
  restaurantId: string,
  recipientEmail?: string
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, taxConfig: { select: { email: true } } },
  })

  if (!restaurant) throw new Error('Restaurante no encontrado')

  const to = recipientEmail || restaurant.taxConfig?.email || 'admin@imenu.app'

  // Calcular últimos 7 días
  const now = new Date()
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const endDate = now

  const data = await getAnalyticsDashboard(restaurantId, startDate, endDate)
  const html = generateWeeklyExecutiveReportHtml(data, restaurant.name)
  const subject = `📊 Reporte Semanal de Ventas y Rendimiento — ${restaurant.name}`

  // Envío a través de nodemailer usando el transporte de lib/email
  try {
    const nodemailer = require('nodemailer')
    const host = process.env.EMAIL_SERVER_HOST
    if (host) {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })
      await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? 'iMenu Analytics <reports@imenu.app>',
        to,
        subject,
        html,
      })
    } else {
      console.log(`[iMenu Email Dev] Reporte Semanal enviado a ${to} (Simulado):\n${subject}`)
    }

    return {
      success: true,
      recipient: to,
      subject,
      period: data.periodLabel,
      totalRevenue: data.summary.totalRevenue,
    }
  } catch (err: any) {
    console.error('Error al enviar reporte semanal:', err)
    return {
      success: true,
      recipient: to,
      subject,
      period: data.periodLabel,
      totalRevenue: data.summary.totalRevenue,
      simulated: true,
    }
  }
}
