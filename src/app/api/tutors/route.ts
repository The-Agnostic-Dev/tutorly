import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { getTutorDirectory } from '@/lib/data/tutors'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const tutors = await getTutorDirectory()
  return NextResponse.json(tutors.map(({ id, name, subjects }) => ({ id, name, subjects })))
}
