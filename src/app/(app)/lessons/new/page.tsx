import { BookingForm } from '@/components/BookingForm'
import { requireUser } from '@/lib/auth'
import { allStudentNames, studentsForParent } from '@/lib/data/students'
import { getTutorDirectory, listSubjects } from '@/lib/data/tutors'
import { lagosDate } from '@/lib/time'

export const metadata = { title: 'Book a lesson' }

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const user = await requireUser(['admin', 'parent'])
  const { student } = await searchParams
  const students = user.role === 'admin' ? allStudentNames() : studentsForParent(user.id)
  const tutors = await getTutorDirectory()

  return (
    <>
      <h1>Book a lesson</h1>
      <p className="lead">Pick the subject first, then a tutor who teaches it.</p>
      <BookingForm
        students={students}
        subjects={listSubjects()}
        tutors={tutors.map(({ id, name, subjectIds }) => ({ id, name, subjectIds }))}
        today={lagosDate()}
        initialStudent={student ? Number(student) : undefined}
      />
    </>
  )
}
