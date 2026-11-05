import type { User } from '../auth'
import { getDb } from '../db'
import { getLesson } from '../data/lessons'
import { activePackage, drawDown, giveBack, hasEnoughHours, packagesWithHours, type Package } from '../data/packages'
import { tutorTeaches } from '../data/tutors'
import { formatHours } from '../hours'
import { CLOSE_HOUR, FREE_CANCELLATION_HOURS, LESSON_DURATIONS, OPEN_HOUR } from '../policy'
import { hoursUntil, lagosDate, toUtcIso, weekday } from '../time'

export type BookingRequest = {
  studentId: number
  tutorId: number
  subjectId: number
  date: string
  time: string
  durationMin: number
}

export type Outcome<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string }

const pad = (n: number) => String(n).padStart(2, '0')

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message }
}

/** Checks a request against the centre's rules. Returns a message for the parent or admin, or null. */
export function validateSlot(req: BookingRequest, now: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date) || !/^\d{2}:\d{2}$/.test(req.time)) return 'Choose a date and a start time.'
  if (!(LESSON_DURATIONS as readonly number[]).includes(req.durationMin)) return 'Choose how long the lesson is.'
  if (weekday(req.date) === 0) return 'The centre is closed on Sundays.'

  const [hour, minute] = req.time.split(':').map(Number)
  const start = hour * 60 + minute
  const end = start + req.durationMin
  if (start <= OPEN_HOUR * 60 || end > CLOSE_HOUR * 60) {
    return `Lessons run between ${pad(OPEN_HOUR)}:00 and ${pad(CLOSE_HOUR)}:00.`
  }
  if (new Date(toUtcIso(req.date, req.time)) <= now) return 'That time has already passed.'
  if (!tutorTeaches(req.tutorId, req.subjectId)) return 'This tutor does not teach that subject.'
  return null
}

type Busy = { startsAt: string; durationMin: number; who: string }

function overlaps(a: { start: number; end: number }, b: Busy): boolean {
  const bStart = new Date(b.startsAt).getTime()
  const bEnd = bStart + b.durationMin * 60_000
  return a.start < bEnd && bStart < a.end
}

/** Describes the first lesson that collides with the request, for the tutor or the student. */
export function findClash(req: BookingRequest): string | null {
  const startsAt = toUtcIso(req.date, req.time)
  const start = new Date(startsAt).getTime()
  const window = { start, end: start + req.durationMin * 60_000 }
  const from = new Date(start - 4 * 3_600_000).toISOString()
  const to = new Date(window.end).toISOString()
  const db = getDb()

  const tutorBusy = db
    .prepare(
      `SELECT l.starts_at AS startsAt, l.duration_min AS durationMin, t.name AS who
       FROM lessons l JOIN tutors t ON t.id = l.tutor_id
       WHERE l.tutor_id = ? AND l.status != 'cancelled' AND l.starts_at >= ? AND l.starts_at < ?`,
    )
    .all(req.tutorId, from, to) as Busy[]
  const tutorClash = tutorBusy.find((b) => overlaps(window, b))
  if (tutorClash) return `${tutorClash.who} already has a lesson at that time.`

  const studentBusy = db
    .prepare(
      `SELECT l.starts_at AS startsAt, l.duration_min AS durationMin, st.name AS who
       FROM lessons l JOIN students st ON st.id = l.student_id
       WHERE l.student_id = ? AND l.status != 'cancelled' AND l.starts_at >= ? AND l.starts_at < ?`,
    )
    .all(req.studentId, from, to) as Busy[]
  const studentClash = studentBusy.find((b) => overlaps(window, b))
  if (studentClash) return `${studentClash.who} already has a lesson at that time.`
  return null
}

/** What the booking form shows while the user is still choosing. */
export function checkSlot(req: BookingRequest, now: Date = new Date()): Outcome {
  const problem = validateSlot(req, now) ?? findClash(req)
  return problem ? fail(problem) : { ok: true }
}

export function bookLesson(
  req: BookingRequest,
  now: Date = new Date(),
): Outcome<{ lessonId: number; packageId: number | null }> {
  const problem = validateSlot(req, now)
  if (problem) return fail(problem)

  const today = lagosDate(now)
  const pkgs = packagesWithHours(req.studentId)
  let pkg: Package | null = null
  if (pkgs.length > 0) {
    pkg = pkgs.find((p) => p.expiresOn >= today) ?? pkgs[0]
    if (!hasEnoughHours(pkg, req.durationMin)) {
      return fail(`Not enough hours left on the package (${formatHours(pkg.hoursRemaining)} left). Please top up first.`)
    }
  } else {
    const active = activePackage(req.studentId, today)
    if (active) {
      return fail(`Not enough hours left on the package (${formatHours(active.hoursRemaining)} left). Please top up first.`)
    }
  }

  const db = getDb()
  const lessonId = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO lessons (student_id, tutor_id, subject_id, starts_at, duration_min, package_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(req.studentId, req.tutorId, req.subjectId, toUtcIso(req.date, req.time), req.durationMin, pkg?.id ?? null, now.toISOString())
    if (pkg) drawDown(pkg.id, req.durationMin)
    return Number(result.lastInsertRowid)
  })()

  return { ok: true, lessonId, packageId: pkg?.id ?? null }
}

export function cancelLesson(lessonId: number, user: User, now: Date = new Date()): Outcome<{ hoursReturned: boolean }> {
  const lesson = getLesson(lessonId)
  if (!lesson) return fail('That lesson no longer exists.')
  if (lesson.status !== 'booked') return fail('Only booked lessons can be cancelled.')
  if (user.role === 'tutor') return fail('Please ask the front desk to cancel lessons.')
  if (user.role === 'parent' && lesson.parentId !== user.id) return fail('That lesson no longer exists.')

  const early = hoursUntil(lesson.startsAt, now) >= FREE_CANCELLATION_HOURS
  if (user.role === 'parent' && !early) {
    return fail(`This lesson starts in less than ${FREE_CANCELLATION_HOURS} hours. Please call the centre to cancel it.`)
  }

  const returnHours = early && lesson.packageId !== null
  const db = getDb()
  db.transaction(() => {
    db.prepare("UPDATE lessons SET status = 'cancelled', cancelled_at = ?, hours_returned = ? WHERE id = ?").run(
      now.toISOString(),
      returnHours ? 1 : 0,
      lessonId,
    )
    if (returnHours) giveBack(lesson.packageId!, lesson.durationMin)
  })()
  return { ok: true, hoursReturned: returnHours }
}
