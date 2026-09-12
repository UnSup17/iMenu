'use server'

import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from 'next-auth'

export async function loginWithCredentials(
  formData: FormData
): Promise<{ error?: string; requires2FA?: boolean }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const totp = (formData.get('totp') as string)?.trim()

  // Si no se proveyó TOTP, revisar si el usuario tiene 2FA habilitado
  if (!totp) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { twoFactorEnabled: true },
      })

      if (user?.twoFactorEnabled) {
        return { requires2FA: true }
      }
    } catch {
      // Ignorar si el campo aún no está accesible durante recargas
    }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      totp: totp || '',
      redirectTo: '/dashboard/orders',
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Email, contraseña o código 2FA incorrectos.' }
        default:
          return { error: `Error de autenticación: ${error.type}` }
      }
    }

    const errMsg = error instanceof Error ? error.message : ''
    if (errMsg.includes('2FA_REQUIRED')) {
      return { requires2FA: true }
    }
    if (errMsg.includes('INVALID_2FA_CODE')) {
      return { error: 'Código 2FA incorrecto o expirado.', requires2FA: true }
    }

    // Next.js redirection error (NEXT_REDIRECT) must be re-thrown
    throw error
  }
}
