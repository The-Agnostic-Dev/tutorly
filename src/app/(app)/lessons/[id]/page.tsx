import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CancelLessonButton } from '@/components/CancelLessonButton'
import { StatusBadge } from '@/components/StatusBadge'
import { requireUser } from '@/lib/auth'
import { getLesson } from '@/lib/data/lessons'
import { formatDuration } from '@/lib/hours'
import { FREE_CANCELLATION_HOURS } from '@/lib/policy'
import { formatDateTime, hoursUntil } from '@/lib/time'
import { completeLessonAction } from '../actions'

export const metadata = { title: 'Lesson' }

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ booked?: string }> }

export default async function LessonPage({ params, searchParams }: Params) {
  const user = await requireUser()
  const { id } = await params
  const { booked } = await searchParams
  const lesson = getLesson(Number(id))
  if (!lesson) notFound()
  if (user.role === 'parent' && lesson.parentId !== user.id) notFound()
  if (user.role === 'tutor' && lesson.tutorId !== user.tutorId) notFound()

  const early = hoursUntil(lesson.startsAt) >= FREE_CANCELLATION_HOURS
  const canCancel = lesson.status === 'booked' && user.role !== 'tutor'
  const canComplete = lesson.status === 'booked' && user.role !== 'parent'

  return (
    <>
      <h1>
        {lesson.subjectName} with {lesson.tutorName}
      </h1>
      <p className="lead">
        <StatusBadge status={lesson.status} />
      </p>
      {booked && lesson.status === 'booked' && <p className="notice ok">Lesson booked.</p>}

      <div className="card">
        <table>
          <tbody>
            <tr>
              <th>Student</th>
              <td>
                {user.role === 'tutor' ? lesson.studentName : <Link href={`/students/${lesson.studentId}`}>{lesson.studentName}</Link>}
              </td>
            </tr>
            <tr>
              <th>When</th>
              <td data-testid="lesson-when">{formatDateTime(lesson.startsAt)}</td>
            </tr>
            <tr>
              <th>Length</th>
              <td>{formatDuration(lesson.durationMin)}</td>
            </tr>
            <tr>
              <th>Paid from</th>
              <td>{lesson.packageId ? 'Prepaid package' : 'Pay as you go (monthly invoice)'}</td>
            </tr>
            {lesson.status === 'cancelled' && lesson.cancelledAt && (
              <tr>
                <th>Cancelled</th>
                <td>
                  {formatDateTime(lesson.cancelledAt)}
                  {lesson.packageId ? (lesson.hoursReturned ? ', hours returned to the package' : ', late cancellation (hours not returned)') : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canComplete && (
        <form className="no-print" action={completeLessonAction.bind(null, lesson.id)} style={{ marginBottom: '1rem' }}>
          <button className="btn secondary" type="submit">
            Mark as taught
          </button>
        </form>
      )}
      {user.role !== 'tutor' && (
        <div className="no-print">
          <CancelLessonButton lessonId={lesson.id} cancellable={canCancel} returnsHours={early && lesson.packageId !== null} />
          {canCancel && (
            <p className="hint">
              Cancelling at least {FREE_CANCELLATION_HOURS} hours before the start returns the hours to the package.
              Within {FREE_CANCELLATION_HOURS} hours only the centre can cancel, and the hours are not returned.
            </p>
          )}
        </div>
      )}
    </>
  )
}
