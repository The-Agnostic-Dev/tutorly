import { getDb } from '../db'
import { LESSON_SELECT, type Lesson } from './lessons'

export type StudentRow = {
  id: number
  name: string
  classLevel: string
  parentId: number
  parentName: string
  /** Hours left across packages that have not expired; null when the student pays as they go. */
  hoursLeft: number | null
  nextLesson: string | null
}

export function listStudents(today: string, nowIso: string, parentId?: number): StudentRow[] {
  return getDb()
    .prepare(
      `SELECT st.id, st.name, st.class_level AS classLevel, st.parent_id AS parentId, u.name AS parentName,
              (SELECT SUM(p.hours_remaining) FROM packages p
                WHERE p.student_id = st.id AND p.hours_remaining > 0) AS hoursLeft,
              (SELECT MIN(l.starts_at) FROM lessons l
                WHERE l.student_id = st.id AND l.status = 'booked' AND l.starts_at >= @now) AS nextLesson
       FROM students st JOIN users u ON u.id = st.parent_id
       WHERE @parentId IS NULL OR st.parent_id = @parentId
       ORDER BY st.name`,
    )
    .all({ now: nowIso, parentId: parentId ?? null }) as StudentRow[]
}

export function getStudent(id: number, today: string, nowIso: string): StudentRow | null {
  return listStudents(today, nowIso).find((s) => s.id === id) ?? null
}

export function upcomingLessons(studentId: number, nowIso: string): Lesson[] {
  return getDb()
    .prepare(
      `${LESSON_SELECT}
       WHERE l.student_id = ? AND l.status = 'booked' AND l.starts_at >= ?
       ORDER BY l.starts_at ASC`,
    )
    .all(studentId, nowIso) as Lesson[]
}

export function pastLessons(studentId: number, nowIso: string, limit = 10): Lesson[] {
  return getDb()
    .prepare(
      `${LESSON_SELECT}
       WHERE l.student_id = ? AND (l.starts_at < ? OR l.status = 'cancelled')
       ORDER BY l.starts_at DESC
       LIMIT ?`,
    )
    .all(studentId, nowIso, limit) as Lesson[]
}

export function studentsForParent(parentId: number): Array<{ id: number; name: string }> {
  return getDb().prepare('SELECT id, name FROM students WHERE parent_id = ? ORDER BY name').all(parentId) as Array<{
    id: number
    name: string
  }>
}

export function allStudentNames(): Array<{ id: number; name: string }> {
  return getDb().prepare('SELECT id, name FROM students ORDER BY name').all() as Array<{ id: number; name: string }>
}
