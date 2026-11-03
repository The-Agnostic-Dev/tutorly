import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { requireUser } from '@/lib/auth'
import type { Lesson } from '@/lib/data/lessons'
import { packageStatus, packagesForStudent } from '@/lib/data/packages'
import { getStudent, pastLessons, upcomingLessons } from '@/lib/data/students'
import { formatDuration, formatHours } from '@/lib/hours'
import { formatNaira } from '@/lib/money'
import { PACKAGE_VALID_DAYS } from '@/lib/policy'
import { formatDate, formatDateTime, lagosDate } from '@/lib/time'

export const metadata = { title: 'Student' }

function LessonTable({ lessons, testId }: { lessons: Lesson[]; testId: string }) {
  return (
    <table data-testid={testId}>
      <thead>
        <tr>
          <th>When</th>
          <th>Subject</th>
          <th>Tutor</th>
          <th>Length</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {lessons.map((l) => (
          <tr key={l.id} data-starts-at={l.startsAt}>
            <td>
              <Link href={`/lessons/${l.id}`}>{formatDateTime(l.startsAt)}</Link>
            </td>
            <td>{l.subjectName}</td>
            <td>{l.tutorName}</td>
            <td>{formatDuration(l.durationMin)}</td>
            <td>
              <StatusBadge status={l.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ sold?: string }> }

export default async function StudentPage({ params, searchParams }: Params) {
  const user = await requireUser()
  const { id } = await params
  const { sold } = await searchParams
  const now = new Date()
  const today = lagosDate(now)
  const student = getStudent(Number(id), today, now.toISOString())
  if (!student) notFound()
  if (user.role === 'parent' && student.parentId !== user.id) notFound()

  const packages = packagesForStudent(student.id)
  const upcoming = upcomingLessons(student.id, now.toISOString())
  const past = pastLessons(student.id, now.toISOString())

  return (
    <>
      <h1>{student.name}</h1>
      <p className="lead">
        {student.classLevel} · Parent: {student.parentName}
      </p>
      {sold && <p className="notice ok">Package added.</p>}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Packages</h2>
          {user.role === 'admin' && (
            <Link className="btn secondary" href={`/packages/new?student=${student.id}`}>
              Sell a package
            </Link>
          )}
        </div>
        {packages.length === 0 ? (
          <p className="hint">No packages. Lessons are billed pay as you go on the monthly invoice.</p>
        ) : (
          <table data-testid="packages">
            <thead>
              <tr>
                <th>Bought</th>
                <th className="num">Hours</th>
                <th className="num">Left</th>
                <th className="num">Price</th>
                <th>Valid until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => {
                const status = packageStatus(p, today)
                return (
                  <tr key={p.id} data-package-id={p.id}>
                    <td>{formatDate(`${p.purchasedOn}T12:00:00Z`)}</td>
                    <td className="num">{p.hoursPurchased}</td>
                    <td className="num" data-col="left">
                      {formatHours(p.hoursRemaining)}
                    </td>
                    <td className="num">{formatNaira(p.price)}</td>
                    <td>{formatDate(`${p.expiresOn}T12:00:00Z`)}</td>
                    <td>
                      <span className={`badge ${status.split(' ')[0]}`}>{status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="hint">
          Packages are valid for {PACKAGE_VALID_DAYS} days from the day they are bought. Any hours left when a package
          expires lapse with it.
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Upcoming lessons</h2>
          {user.role !== 'tutor' && (
            <Link className="btn secondary" href={`/lessons/new?student=${student.id}`}>
              Book a lesson
            </Link>
          )}
        </div>
        {upcoming.length === 0 ? <p className="hint">Nothing booked.</p> : <LessonTable lessons={upcoming} testId="upcoming" />}
      </div>

      <div className="card">
        <h2>Recent lessons</h2>
        {past.length === 0 ? <p className="hint">No lessons yet.</p> : <LessonTable lessons={past} testId="past" />}
      </div>
    </>
  )
}
