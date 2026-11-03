import { getDb } from '../db'

export type LessonStatus = 'booked' | 'completed' | 'cancelled'

export type Lesson = {
  id: number
  studentId: number
  studentName: string
  parentId: number
  tutorId: number
  tutorName: string
  subjectId: number
  subjectName: string
  startsAt: string
  durationMin: number
  status: LessonStatus
  packageId: number | null
  cancelledAt: string | null
  hoursReturned: number
}

export const LESSON_SELECT = `
  SELECT l.id, l.student_id AS studentId, st.name AS studentName, st.parent_id AS parentId,
         l.tutor_id AS tutorId, t.name AS tutorName, l.subject_id AS subjectId, s.name AS subjectName,
         l.starts_at AS startsAt, l.duration_min AS durationMin, l.status, l.package_id AS packageId,
         l.cancelled_at AS cancelledAt, l.hours_returned AS hoursReturned
  FROM lessons l
  JOIN students st ON st.id = l.student_id
  JOIN tutors t ON t.id = l.tutor_id
  JOIN subjects s ON s.id = l.subject_id`

export type LessonScope = { tutorId?: number; parentId?: number }

/** Lessons that have not been cancelled, starting in [from, to). */
export function lessonsBetween(from: string, to: string, scope: LessonScope = {}): Lesson[] {
  const where = ["l.status != 'cancelled'", 'l.starts_at >= ?', 'l.starts_at < ?']
  const params: Array<string | number> = [from, to]
  if (scope.tutorId) {
    where.push('l.tutor_id = ?')
    params.push(scope.tutorId)
  }
  if (scope.parentId) {
    where.push('st.parent_id = ?')
    params.push(scope.parentId)
  }
  return getDb()
    .prepare(`${LESSON_SELECT} WHERE ${where.join(' AND ')} ORDER BY l.starts_at, t.name`)
    .all(...params) as Lesson[]
}

export function getLesson(id: number): Lesson | null {
  return (getDb().prepare(`${LESSON_SELECT} WHERE l.id = ?`).get(id) as Lesson | undefined) ?? null
}

export function markCompleted(id: number) {
  getDb().prepare("UPDATE lessons SET status = 'completed' WHERE id = ? AND status = 'booked'").run(id)
}
