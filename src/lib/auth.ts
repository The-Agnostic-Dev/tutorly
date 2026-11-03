import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from './db'
import { verifyPassword } from './passwords'

export type Role = 'admin' | 'tutor' | 'parent'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  /** Set for tutors: their row in the tutors table. */
  tutorId: number | null
}

const COOKIE = 'tutorly_session'
const SESSION_HOURS = 12

function secret(): string {
  return process.env.SESSION_SECRET ?? 'tutorly-local-dev-secret'
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function loadUser(id: number): User | null {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, t.id AS tutorId
       FROM users u LEFT JOIN tutors t ON t.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(id) as User | undefined
  return row ?? null
}

export function checkCredentials(email: string, password: string): User | null {
  const row = getDb()
    .prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as { id: number; password_hash: string } | undefined
  if (!row || !verifyPassword(password, row.password_hash)) return null
  return loadUser(row.id)
}

export async function startSession(userId: number) {
  const value = String(userId)
  const jar = await cookies()
  jar.set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null
  const [value, signature] = raw.split('.')
  if (!value || !signature) return null
  const expected = Buffer.from(sign(value))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return loadUser(Number(value))
}

/** For pages and actions: sends visitors to the login page, and other roles home. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (roles && !roles.includes(user.role)) redirect('/')
  return user
}
