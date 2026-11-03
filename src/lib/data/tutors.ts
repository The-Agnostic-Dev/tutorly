import { unstable_cache } from 'next/cache'
import { getDb } from '../db'

export type Subject = { id: number; name: string }

export type TutorSummary = {
  id: number
  name: string
  hourlyRate: number
  subjectIds: number[]
  subjects: string[]
}

export type TutorDetail = TutorSummary & { bio: string; email: string | null }

type TutorRow = { id: number; name: string; hourly_rate: number; bio: string; email: string | null }

function subjectsByTutor(): Map<number, Subject[]> {
  const rows = getDb()
    .prepare(
      `SELECT ts.tutor_id AS tutorId, s.id, s.name
       FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
       ORDER BY s.name`,
    )
    .all() as Array<Subject & { tutorId: number }>
  const map = new Map<number, Subject[]>()
  for (const row of rows) {
    const list = map.get(row.tutorId) ?? []
    list.push({ id: row.id, name: row.name })
    map.set(row.tutorId, list)
  }
  return map
}

export function listTutors(): TutorDetail[] {
  const rows = getDb()
    .prepare(
      `SELECT t.id, t.name, t.hourly_rate, t.bio, u.email
       FROM tutors t LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.name`,
    )
    .all() as TutorRow[]
  const subjects = subjectsByTutor()
  return rows.map((row) => {
    const own = subjects.get(row.id) ?? []
    return {
      id: row.id,
      name: row.name,
      hourlyRate: row.hourly_rate,
      bio: row.bio,
      email: row.email,
      subjectIds: own.map((s) => s.id),
      subjects: own.map((s) => s.name),
    }
  })
}

export function getTutor(id: number): TutorDetail | null {
  return listTutors().find((t) => t.id === id) ?? null
}

/**
 * Tutors with the subjects they teach, for the booking form and the calendar filter.
 * Read on almost every screen, so it is cached and tagged "tutors".
 */
export const getTutorDirectory = unstable_cache(
  async (): Promise<TutorSummary[]> =>
    listTutors().map(({ id, name, hourlyRate, subjectIds, subjects }) => ({ id, name, hourlyRate, subjectIds, subjects })),
  ['tutor-directory'],
  { tags: ['tutors'] },
)

export function listSubjects(): Subject[] {
  return getDb().prepare('SELECT id, name FROM subjects ORDER BY name').all() as Subject[]
}

export function tutorTeaches(tutorId: number, subjectId: number): boolean {
  return Boolean(
    getDb().prepare('SELECT 1 FROM tutor_subjects WHERE tutor_id = ? AND subject_id = ?').get(tutorId, subjectId),
  )
}

export type TutorUpdate = { name: string; hourlyRate: number; bio: string; subjectIds: number[] }

export function saveTutor(id: number, update: TutorUpdate) {
  const db = getDb()
  db.transaction(() => {
    db.prepare('UPDATE tutors SET name = ?, hourly_rate = ?, bio = ? WHERE id = ?').run(
      update.name,
      update.hourlyRate,
      update.bio,
      id,
    )
    db.prepare('DELETE FROM tutor_subjects WHERE tutor_id = ?').run(id)
    const insert = db.prepare('INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES (?, ?)')
    for (const subjectId of update.subjectIds) insert.run(id, subjectId)
  })()
}
