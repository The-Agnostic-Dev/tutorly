import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Sign in' }

export default async function LoginPage() {
  if (await currentUser()) redirect('/')
  return (
    <main className="login card">
      <div className="brand">Tutorly</div>
      <p className="lead">Sign in to see lessons, packages and invoices.</p>
      <LoginForm />
    </main>
  )
}
