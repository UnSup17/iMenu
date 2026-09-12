'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const acceptSchema = z
  .object({
    token: z.string().min(1, 'Token requerido'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type AcceptResult = {
  success?: boolean
  error?: string
}

export async function acceptInvite(formData: FormData): Promise<AcceptResult> {
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    name: formData.get('name'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Datos inválidos' }
  }

  const { token, name, password } = parsed.data

  const user = await prisma.user.findFirst({
    where: {
      inviteToken: token,
      inviteExpiry: {
        gt: new Date(),
      },
    },
  })

  if (!user) {
    return {
      error: 'La invitación es inválida, ya fue aceptada o ha expirado.',
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      passwordHash,
      emailVerified: new Date(),
      inviteAccepted: true,
      inviteToken: null,
      inviteExpiry: null,
    },
  })

  return { success: true }
}
