import Link from 'next/link'
import { TutorFilter } from '@/components/TutorFilter'
import { WeekCalendar } from '@/components/WeekCalendar'
import { requireUser } from '@/lib/auth'
import { lessonsBetween, type LessonScope } from '@/lib/data/lessons'
import { addDays, lagosDate, toUtcIso, weekStart } from '@/lib/time'

export const metadata = { title: 'Calendar' }

type Search = { week?: string; tutor?: string }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser()
  const params = await searchParams
  const today = lagosDate()
  const monday = weekStart(params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : today)

  let scope: LessonScope = {}
  if (user.role === 'tutor') scope = { tutorId: user.tutorId ?? -1 }
  else if (user.role === 'parent') scope = { parentId: user.id }
  else if (params.tutor) scope = { tutorId: Number(params.tutor) }

  const lessons = lessonsBetween(toUtcIso(monday, '00:00'), toUtcIso(addDays(monday, 7), '00:00'), scope)

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Calendar</h1>
          <p className="lead">Monday to Saturday, 08:00 to 20:00. Cancelled lessons are not shown.</p>
        </div>
        {user.role !== 'tutor' && (
          <Link className="btn" href="/lessons/new">
            Book a lesson
          </Link>
        )}
      </div>
      {user.role === 'admin' && <TutorFilter week={monday} selected={params.tutor} />}
      <WeekCalendar
        monday={monday}
        today={today}
        tutor={user.role === 'admin' ? params.tutor : undefined}
        lessons={lessons.map(({ id, startsAt, durationMin, status, subjectName, studentName, tutorName }) => ({
          id,
          startsAt,
          durationMin,
          status,
          subjectName,
          studentName,
          tutorName,
        }))}
      />
    </>
  )
}
