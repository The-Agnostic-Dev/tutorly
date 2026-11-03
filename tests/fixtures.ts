import { openDatabase, useDatabase } from '@/lib/db'
import { createPackage } from '@/lib/data/packages'
import type { User } from '@/lib/auth'

/** A tiny centre: one tutor teaching Mathematics, one parent with one child. */
export function freshCentre() {
  const db = openDatabase(':memory:')
  useDatabase(db)
  db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (1, 'Admin', 'admin@test', 'admin', 'x')").run()
  db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (2, 'Tutor', 'tutor@test', 'tutor', 'x')").run()
  db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (3, 'Parent', 'parent@test', 'parent', 'x')").run()
  db.prepare("INSERT INTO subjects (id, name) VALUES (1, 'Mathematics'), (2, 'Biology')").run()
  db.prepare("INSERT INTO tutors (id, user_id, name, hourly_rate) VALUES (1, 2, 'Emeka Bello', 750000)").run()
  db.prepare('INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES (1, 1)').run()
  db.prepare("INSERT INTO students (id, name, class_level, parent_id) VALUES (1, 'Chidera Okoro', 'JSS 3', 3)").run()
  return db
}

export function withPackage(hours: number, purchasedOn: string) {
  return createPackage(1, hours, 6_500_000, purchasedOn)
}

export const admin: User = { id: 1, name: 'Admin', email: 'admin@test', role: 'admin', tutorId: null }
export const parent: User = { id: 3, name: 'Parent', email: 'parent@test', role: 'parent', tutorId: null }
