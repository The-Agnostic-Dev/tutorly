import Link from 'next/link'
import { logout } from '@/app/login/actions'
import type { User } from '@/lib/auth'

const LINKS: Array<{ href: string; label: string; roles: User['role'][] }> = [
  { href: '/', label: 'Dashboard', roles: ['admin', 'tutor', 'parent'] },
  { href: '/calendar', label: 'Calendar', roles: ['admin', 'tutor', 'parent'] },
  { href: '/lessons/new', label: 'Book a lesson', roles: ['admin', 'parent'] },
  { href: '/students', label: 'Students', roles: ['admin', 'tutor'] },
  { href: '/tutors', label: 'Tutors', roles: ['admin'] },
  { href: '/invoices', label: 'Invoices', roles: ['admin', 'parent'] },
]

const ROLE_LABEL: Record<User['role'], string> = { admin: 'Centre admin', tutor: 'Tutor', parent: 'Parent' }

export function Sidebar({ user }: { user: User }) {
  return (
    <nav className="sidebar">
      <div className="brand">Tutorly</div>
      {LINKS.filter((link) => link.roles.includes(user.role)).map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
      <div className="who">
        <div>{user.name}</div>
        <div>{ROLE_LABEL[user.role]}</div>
        <form action={logout}>
          <button className="btn link" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
