'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginWithCredentials(formData: FormData): Promise<{ error?: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard/orders',
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Email o contraseña incorrectos.' }
        default:
          return { error: `Error de autenticación: ${error.type}` }
      }
    }
    // Next.js redirection error (NEXT_REDIRECT) must be re-thrown
    throw error
  }
}
