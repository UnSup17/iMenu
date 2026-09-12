import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import * as OTPAuth from 'otpauth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          }),
        ]
      : []),
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        totp: { label: 'Código 2FA', type: 'text' },
      },
      async authorize(credentials) {
        console.log('[Auth authorize] Received credentials:', { email: credentials?.email })
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
            totp: z.string().optional(),
          })
          .safeParse(credentials)

        if (!parsed.success) {
          console.log('[Auth authorize] Zod validation failed:', parsed.error)
          return null
        }

        const email = parsed.data.email.trim().toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email },
          include: { restaurant: true },
        })

        if (!user) {
          console.log('[Auth authorize] User not found for email:', email)
          return null
        }
        if (!user.passwordHash) {
          console.log('[Auth authorize] User has no passwordHash:', email)
          return null
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        console.log('[Auth authorize] bcrypt.compare result for', email, ':', isValid)
        if (!isValid) return null

        // Si tiene 2FA activado, verificar TOTP
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const totpToken = parsed.data.totp?.trim()
          if (!totpToken) {
            throw new Error('2FA_REQUIRED')
          }

          const totp = new OTPAuth.TOTP({
            issuer: 'iMenu',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
          })

          const delta = totp.validate({ token: totpToken, window: 1 })
          if (delta === null) {
            console.log('[Auth authorize] 2FA validation failed for', email)
            throw new Error('INVALID_2FA_CODE')
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          restaurantSlug: user.restaurant?.slug,
          organizationId: user.organizationId,
          foodCourtId: user.foodCourtId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.restaurantId = user.restaurantId
        token.restaurantSlug = user.restaurantSlug
        token.organizationId = user.organizationId
        token.foodCourtId = user.foodCourtId
        token.isImpersonating = user.isImpersonating || false
        token.impersonatorEmail = user.impersonatorEmail || null
      }

      if (trigger === 'update' && session) {
        if (session.user) {
          if (session.user.role !== undefined) token.role = session.user.role
          if (session.user.restaurantId !== undefined) token.restaurantId = session.user.restaurantId
          if (session.user.restaurantSlug !== undefined) token.restaurantSlug = session.user.restaurantSlug
          if (session.user.organizationId !== undefined) token.organizationId = session.user.organizationId
          if (session.user.isImpersonating !== undefined) token.isImpersonating = session.user.isImpersonating
          if (session.user.impersonatorEmail !== undefined) token.impersonatorEmail = session.user.impersonatorEmail
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.restaurantId = token.restaurantId as string | null
        session.user.restaurantSlug = token.restaurantSlug as string | null
        session.user.organizationId = token.organizationId as string | null
        session.user.foodCourtId = token.foodCourtId as string | null
        session.user.isImpersonating = Boolean(token.isImpersonating)
        session.user.impersonatorEmail = (token.impersonatorEmail as string | null) ?? null

        // Soporte dinámico de impersonación para SUPERADMIN
        if (token.role === 'SUPERADMIN') {
          try {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            const impersonateUserId = cookieStore.get('imenu_impersonate_user_id')?.value
            if (impersonateUserId) {
              const target = await prisma.user.findUnique({
                where: { id: impersonateUserId },
                include: { restaurant: true },
              })
              if (target) {
                session.user.id = target.id
                session.user.name = target.name
                session.user.email = target.email
                session.user.role = target.role
                session.user.restaurantId = target.restaurantId
                session.user.restaurantSlug = target.restaurant?.slug ?? null
                session.user.organizationId = target.organizationId
                session.user.foodCourtId = target.foodCourtId
                session.user.isImpersonating = true
                session.user.impersonatorEmail = (token.email as string) || 'superadmin@imenu.app'
              }
            }
          } catch {
            // Silently ignore if cookies() is called outside request context
          }
        }
      }
      return session
    },
  },
})
