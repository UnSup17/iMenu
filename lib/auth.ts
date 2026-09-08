import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[Auth authorize] Received credentials:', { email: credentials?.email })
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          restaurantSlug: user.restaurant?.slug,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.restaurantId = user.restaurantId
        token.restaurantSlug = user.restaurantSlug
        token.organizationId = user.organizationId
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
      }
      return session
    },
  },
})
