'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDuration } from '@/lib/hours'
import { addDays, dayOfMonth, formatDate, lagosDate, lagosTime, openDays, weekStart } from '@/lib/time'
import { dayName } from '@/lib/dayName'

export type CalendarLesson = {
  id: number
  startsAt: string
  durationMin: number
  status: string
  subjectName: string
  studentName: string
  tutorName: string
}


type Props = { monday: string; today: string; lessons: CalendarLesson[]; tutor?: string }

export function WeekCalendar({ monday, today, lessons, tutor }: Props) {
  const router = useRouter()
  const days = openDays(monday)

  function go(week: string) {
    const params = new URLSearchParams({ week })
    if (tutor) params.set('tutor', tutor)
    router.push(`/calendar?${params}`)
  }

  const byDay = new Map<string, CalendarLesson[]>()
  for (const lesson of lessons) {
    const day = lagosDate(new Date(lesson.startsAt))
    byDay.set(day, [...(byDay.get(day) ?? []), lesson])
  }

  return (
    <>
      <div className="week-nav">
        <h2 data-testid="week-title">Week of {formatDate(`${monday}T12:00:00Z`)}</h2>
        <button className="btn secondary" type="button" onClick={() => go(addDays(monday, -7))}>
          Previous week
        </button>
        <button className="btn secondary" type="button" onClick={() => go(weekStart(today))}>
          This week
        </button>
        <button className="btn secondary" type="button" onClick={() => go(addDays(monday, -7))}>
          Next week
        </button>
      </div>
      <div className="week">
        {days.map((day) => (
          <section key={day} className={day === today ? 'day today' : 'day'} data-date={day}>
            <header>
              {dayName(day)} {dayOfMonth(day)}
            </header>
            {(byDay.get(day) ?? []).map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className={`lesson-card ${lesson.status}`}
                data-lesson-id={lesson.id}
              >
                <strong>
                  {lagosTime(new Date(lesson.startsAt))} · {lesson.subjectName}
                </strong>
                {lesson.studentName} with {lesson.tutorName}
                <br />
                {formatDuration(lesson.durationMin)}
              </Link>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
