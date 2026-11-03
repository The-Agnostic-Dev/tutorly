import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { lessonsBetween, type Lesson } from '@/lib/data/lessons'
import { listStudents } from '@/lib/data/students'
import { formatDuration, formatHours } from '@/lib/hours'
import { LOW_BALANCE_HOURS } from '@/lib/policy'
import { addDays, formatDateTime, lagosDate, lagosTime, toUtcIso, weekStart } from '@/lib/time'

export const metadata = { title: 'Dashboard' }

function LessonList({ lessons, empty }: { lessons: Lesson[]; empty: string }) {
  if (lessons.length === 0) return <p className="hint">{empty}</p>
  return (
    <table>
      <tbody>
        {lessons.map((l) => (
          <tr key={l.id}>
            <td>{lagosTime(new Date(l.startsAt))}</td>
            <td>
              <Link href={`/lessons/${l.id}`}>{l.subjectName}</Link>
            </td>
            <td>{l.studentName}</td>
            <td>{l.tutorName}</td>
            <td>{formatDuration(l.durationMin)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function Dashboard() {
  const user = await requireUser()
  const now = new Date()
  const today = lagosDate(now)
  const todayFrom = toUtcIso(today, '00:00')
  const todayTo = toUtcIso(addDays(today, 1), '00:00')
  const monday = weekStart(today)
  const weekFrom = toUtcIso(monday, '00:00')
  const weekTo = toUtcIso(addDays(monday, 7), '00:00')

  if (user.role === 'parent') {
    const children = listStudents(today, now.toISOString(), user.id)
    return (
      <>
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        <p className="lead">Your children&apos;s lessons and package balances.</p>
        <div className="grid-3">
          {children.map((child) => (
            <div className="card" key={child.id}>
              <h2>
                <Link href={`/students/${child.id}`}>{child.name}</Link>
              </h2>
              <div className="stat">{child.hoursLeft === null ? 'Pay as you go' : formatHours(child.hoursLeft)}</div>
              <div className="stat-label">{child.hoursLeft === null ? 'No active package' : 'left on package'}</div>
              <p className="hint">Next lesson: {child.nextLesson ? formatDateTime(child.nextLesson) : 'none booked'}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>This week</h2>
          <LessonList lessons={lessonsBetween(weekFrom, weekTo, { parentId: user.id })} empty="No lessons this week." />
        </div>
      </>
    )
  }

  if (user.role === 'tutor') {
    const scope = { tutorId: user.tutorId ?? -1 }
    return (
      <>
        <h1>Good day, {user.name.split(' ')[0]}</h1>
        <p className="lead">Your lessons for today. Mark each one as taught when you finish.</p>
        <div className="card">
          <h2>Today</h2>
          <LessonList lessons={lessonsBetween(todayFrom, todayTo, scope)} empty="No lessons today." />
        </div>
        <div className="card">
          <h2>This week</h2>
          <LessonList lessons={lessonsBetween(weekFrom, weekTo, scope)} empty="No lessons this week." />
        </div>
      </>
    )
  }

  const students = listStudents(today, now.toISOString())
  const low = students.filter((s) => s.hoursLeft !== null && s.hoursLeft < LOW_BALANCE_HOURS)
  const week = lessonsBetween(weekFrom, weekTo)
  return (
    <>
      <h1>Front desk</h1>
      <p className="lead">Today is {formatDateTime(now.toISOString()).split(',')[0]}.</p>
      <div className="grid-3">
        <div className="card">
          <div className="stat">{week.length}</div>
          <div className="stat-label">lessons this week</div>
        </div>
        <div className="card">
          <div className="stat">{students.filter((s) => s.hoursLeft !== null).length}</div>
          <div className="stat-label">students on a package</div>
        </div>
        <div className="card">
          <div className="stat">{low.length}</div>
          <div className="stat-label">running low (under {LOW_BALANCE_HOURS} hours)</div>
        </div>
      </div>
      <div className="card">
        <h2>Today</h2>
        <LessonList lessons={lessonsBetween(todayFrom, todayTo)} empty="No lessons today." />
      </div>
      {low.length > 0 && (
        <div className="card">
          <h2>Running low</h2>
          <ul>
            {low.map((s) => (
              <li key={s.id}>
                <Link href={`/students/${s.id}`}>{s.name}</Link>: {formatHours(s.hoursLeft ?? 0)} left ({s.parentName})
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
