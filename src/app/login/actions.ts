'use server'

import { redirect } from 'next/navigation'
import { checkCredentials, endSession, startSession } from '@/lib/auth'

export type LoginState = { error?: string; email?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const user = checkCredentials(email, password)
  if (!user) return { error: 'That email and password do not match.', email }
  await startSession(user.id)
  redirect('/')
}

export async function logout() {
  await endSession()
  redirect('/login')
}
