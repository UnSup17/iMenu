import { Role } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: Role | string
      restaurantId?: string | null
      restaurantSlug?: string | null
      organizationId?: string | null
      foodCourtId?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    role?: Role | string
    restaurantId?: string | null
    restaurantSlug?: string | null
    organizationId?: string | null
    foodCourtId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role | string
    restaurantId?: string | null
    restaurantSlug?: string | null
    organizationId?: string | null
    foodCourtId?: string | null
  }
}

