import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'tutor', 'parent')),
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tutors (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL,
  bio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tutor_subjects (
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  PRIMARY KEY (tutor_id, subject_id)
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  class_level TEXT NOT NULL,
  parent_id INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  hours_purchased REAL NOT NULL,
  hours_remaining REAL NOT NULL,
  price INTEGER NOT NULL,
  purchased_on TEXT NOT NULL,
  expires_on TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  tutor_id INTEGER NOT NULL REFERENCES tutors(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled')),
  package_id INTEGER REFERENCES packages(id),
  created_at TEXT NOT NULL,
  cancelled_at TEXT,
  hours_returned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lessons_starts_at ON lessons (starts_at);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES users(id),
  month TEXT NOT NULL,
  total INTEGER NOT NULL,
  issued_at TEXT NOT NULL,
  UNIQUE (parent_id, month)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL
);
`

let connection: Database.Database | undefined

export function openDatabase(file: string): Database.Database {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

/** The shared connection. Opened lazily so `next build` never touches the file. */
export function getDb(): Database.Database {
  if (!connection) {
    connection = openDatabase(process.env.TUTORLY_DB_PATH ?? path.join(process.cwd(), 'data', 'tutorly.db'))
  }
  return connection
}

/** Tests swap in a fresh in-memory database. */
export function useDatabase(db: Database.Database) {
  connection = db
}
