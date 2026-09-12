'use server'

import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { getOrCreateOrganizationSubscription } from '@/lib/subscription'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'

const registerSchema = z.object({
  restaurantName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  slug: z
    .string()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  country: z.string().min(2).max(10).default('CO'),
  currency: z.string().min(3).max(5).default('COP'),
  adminName: z.string().min(2, 'Tu nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type RegisterResult = { error?: string; field?: string }

export async function registerRestaurant(
  formData: FormData
): Promise<RegisterResult> {
  const raw = {
    restaurantName: formData.get('restaurantName'),
    slug: formData.get('slug'),
    country: formData.get('country') ?? 'CO',
    currency: formData.get('currency') ?? 'COP',
    adminName: formData.get('adminName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first.message, field: String(first.path[0]) }
  }

  const { restaurantName, slug, currency, adminName, email, password } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  // Verificar unicidad
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) return { error: 'Este email ya está registrado.', field: 'email' }

  const existingSlug = await prisma.restaurant.findUnique({ where: { slug } })
  if (existingSlug) return { error: 'Este identificador ya está en uso, elige otro.', field: 'slug' }

  const passwordHash = await bcrypt.hash(password, 10)
  const verificationToken = randomUUID()
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h

  // Transacción: Organization → Restaurant → User → TaxConfig → VerificationToken
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: restaurantName,
        slug: `org-${slug}-${Date.now()}`,
      },
    })

    const restaurant = await tx.restaurant.create({
      data: {
        name: restaurantName,
        slug,
        currency,
        organizationId: org.id,
        isActive: true,
      },
    })

    await tx.user.create({
      data: {
        name: adminName,
        email: normalizedEmail,
        passwordHash,
        role: 'RESTAURANT_ADMIN',
        restaurantId: restaurant.id,
        organizationId: org.id,
        // emailVerified queda null hasta confirmar
      },
    })

    // Configuración fiscal por defecto (Colombia)
    await tx.taxConfig.create({
      data: {
        restaurantId: restaurant.id,
        vatRate: 0.19,
        serviceChargeRate: 0,
        country: 'CO',
        currency,
      },
    })

    // Token de verificación de email (reutiliza tabla de NextAuth)
    await tx.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verificationToken,
        expires: verificationExpiry,
      },
    })

    // Crear suscripción trial
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    await tx.subscription.create({
      data: {
        organizationId: org.id,
        tier: 'BASIC',
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    })
  })

  // Enviar email (o loguearlo en consola si no hay SMTP)
  try {
    await sendVerificationEmail(normalizedEmail, verificationToken)
  } catch (emailErr) {
    console.error('[Register] Error al enviar email de verificación:', emailErr)
    // No bloqueamos el registro si el email falla
  }

  redirect(`/register/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
}
