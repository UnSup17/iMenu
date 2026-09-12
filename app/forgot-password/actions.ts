'use server'

import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const schema = z.object({ email: z.string().email('Email inválido') })

export type ForgotResult = { success?: boolean; error?: string }

export async function requestPasswordReset(
  formData: FormData
): Promise<ForgotResult> {
  const parsed = schema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Email inválido' }
  }

  const email = parsed.data.email.trim().toLowerCase()

  // Siempre responder con éxito (no revelar si el email existe)
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = randomUUID()
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry: expiry,
      },
    })

    try {
      await sendPasswordResetEmail(email, token)
    } catch (err) {
      console.error('[ForgotPassword] Error al enviar email:', err)
    }
  }

  return { success: true }
}
