/**
 * NextAuth route handler (Auth.js v5).
 * Maneja: /api/auth/signin, /api/auth/signout, /api/auth/session, /api/auth/csrf
 */
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
