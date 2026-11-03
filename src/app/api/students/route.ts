import { NextResponse, type NextRequest } from 'next/server'
import { currentUser } from '@/lib/auth'
import { listStudents } from '@/lib/data/students'
import { lagosDate } from '@/lib/time'

export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  if (user.role === 'parent') return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  const now = new Date()
  const students = listStudents(lagosDate(now), now.toISOString())
  const matches = q
    ? students.filter((s) => s.name.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q))
    : students
  return NextResponse.json(matches)
}
