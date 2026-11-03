import { StudentTable } from '@/components/StudentTable'
import { requireUser } from '@/lib/auth'
import { listStudents } from '@/lib/data/students'
import { lagosDate } from '@/lib/time'

export const metadata = { title: 'Students' }

export default async function StudentsPage() {
  await requireUser(['admin', 'tutor'])
  const now = new Date()
  const rows = listStudents(lagosDate(now), now.toISOString())
  return (
    <>
      <h1>Students</h1>
      <p className="lead">Hours left counts every package that has not expired. Click a heading to sort.</p>
      <StudentTable initialRows={rows.map(({ id, name, classLevel, parentName, hoursLeft, nextLesson }) => ({ id, name, classLevel, parentName, hoursLeft, nextLesson }))} />
    </>
  )
}
