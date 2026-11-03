// Resets the database and loads demo data for the Lekki centre. Dates are relative to today.
// Usage: npm run seed   (TUTORLY_DB_PATH picks the file, default ./data/tutorly.db)
import fs from 'node:fs'
import path from 'node:path'
import { openDatabase, useDatabase } from '../src/lib/db'
import { createPackage, drawDown } from '../src/lib/data/packages'
import { hashPassword } from '../src/lib/passwords'
import { generateInvoices } from '../src/lib/services/billing'
import { addDays, lagosDate, recentMonths, toUtcIso, weekday } from '../src/lib/time'

const PASSWORD = 'tutorly2026'
const file = process.env.TUTORLY_DB_PATH ?? path.join(process.cwd(), 'data', 'tutorly.db')
if (file !== ':memory:') for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true })
const db = openDatabase(file)
useDatabase(db)

const now = new Date()
const today = lagosDate(now)
const hash = hashPassword(PASSWORD)

function addUser(name: string, email: string, role: string, phone = ''): number {
  return Number(db.prepare('INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)').run(name, email, phone, role, hash).lastInsertRowid)
}

const subjects: Record<string, number> = {}
for (const name of ['Mathematics', 'Further Mathematics', 'English Language', 'Literature in English', 'Physics', 'Chemistry', 'Biology', 'Economics']) {
  subjects[name] = Number(db.prepare('INSERT INTO subjects (name) VALUES (?)').run(name).lastInsertRowid)
}

addUser('Funke Adebayo', 'admin@tutorly.ng', 'admin', '0803 555 0101')

const tutors: Record<string, number> = {}
for (const [name, email, rate, bio, teaches] of [
  ['Emeka Bello', 'emeka@tutorly.ng', 750_000, 'B.Sc Mathematics (UNILAG). WAEC and JAMB maths specialist.', ['Mathematics', 'Further Mathematics']],
  ['Halima Sani', 'halima@tutorly.ng', 600_000, 'English teacher for 9 years. Comprehension, essay writing and literature.', ['English Language', 'Literature in English']],
  ['Kunle Adeyemi', 'kunle@tutorly.ng', 800_000, 'Engineer turned tutor. Physics and maths for SS students.', ['Physics', 'Mathematics']],
  ['Grace Udoh', 'grace@tutorly.ng', 650_000, 'Pharmacist. Chemistry and biology, practicals included.', ['Chemistry', 'Biology']],
] as const) {
  const userId = addUser(name, email, 'tutor')
  const id = Number(db.prepare('INSERT INTO tutors (user_id, name, hourly_rate, bio) VALUES (?, ?, ?, ?)').run(userId, name, rate, bio).lastInsertRowid)
  for (const s of teaches) db.prepare('INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES (?, ?)').run(id, subjects[s])
  tutors[name.split(' ')[0]] = id
}

const parents: Record<string, number> = {
  okoro: addUser('Ngozi Okoro', 'ngozi.okoro@example.com', 'parent', '0802 111 2233'),
  bakare: addUser('Tunde Bakare', 'tunde.bakare@example.com', 'parent', '0805 222 3344'),
  eze: addUser('Amaka Eze', 'amaka.eze@example.com', 'parent', '0806 333 4455'),
  lawal: addUser('Yusuf Lawal', 'yusuf.lawal@example.com', 'parent', '0809 444 5566'),
  johnson: addUser('Folake Johnson', 'folake.johnson@example.com', 'parent', '0703 555 6677'),
}

function addStudent(name: string, classLevel: string, parent: string): number {
  return Number(db.prepare('INSERT INTO students (name, class_level, parent_id) VALUES (?, ?, ?)').run(name, classLevel, parents[parent]).lastInsertRowid)
}

const busy: Array<{ who: string; start: number; end: number }> = []

/** Books a lesson on the nearest open day, moving it later in the day if the tutor or student is busy. */
function lesson(student: number, tutor: string, subject: string, date: string, time: string, minutes: number, pkg: number | null = null) {
  let day = date
  if (weekday(day) === 0) day = addDays(day, 1)
  let [h, m] = time.split(':').map(Number)
  for (;;) {
    const startsAt = toUtcIso(day, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    const start = new Date(startsAt).getTime()
    const end = start + minutes * 60_000
    const keys = [`t${tutors[tutor]}`, `s${student}`]
    if (!busy.some((b) => keys.includes(b.who) && b.start < end && start < b.end)) {
      keys.forEach((who) => busy.push({ who, start, end }))
      db.prepare(
        `INSERT INTO lessons (student_id, tutor_id, subject_id, starts_at, duration_min, status, package_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(student, tutors[tutor], subjects[subject], startsAt, minutes, start < now.getTime() ? 'completed' : 'booked', pkg, now.toISOString())
      if (pkg) drawDown(pkg, minutes)
      return
    }
    m += 30
    if (m === 60) [h, m] = [h + 1, 0]
  }
}

const rel = (days: number) => addDays(today, days)

// Okoro family
const chidera = addStudent('Chidera Okoro', 'JSS 3', 'okoro')
const chideraPkg = createPackage(chidera, 10, 6_500_000, rel(-20))
lesson(chidera, 'Emeka', 'Mathematics', rel(-15), '16:00', 60, chideraPkg)
lesson(chidera, 'Halima', 'English Language', rel(-8), '15:00', 90, chideraPkg)
lesson(chidera, 'Emeka', 'Mathematics', rel(9), '16:00', 90, chideraPkg)
lesson(chidera, 'Emeka', 'Mathematics', rel(2), '16:00', 60, chideraPkg)
lesson(chidera, 'Halima', 'English Language', rel(5), '15:00', 60, chideraPkg)

const ebuka = addStudent('Ebuka Okoro', 'Primary 5', 'okoro')
lesson(ebuka, 'Emeka', 'Mathematics', rel(-6), '14:00', 60)
lesson(ebuka, 'Halima', 'English Language', rel(3), '14:00', 45)

// Bakare
const tobi = addStudent('Tobi Bakare', 'SS 2', 'bakare')
const tobiPkg = createPackage(tobi, 10, 6_500_000, rel(-40))
const tobiPlan: Array<[number, string, string, number]> = [
  [-38, 'Kunle', 'Physics', 90], [-35, 'Emeka', 'Mathematics', 60], [-31, 'Kunle', 'Physics', 40],
  [-28, 'Emeka', 'Mathematics', 60], [-24, 'Kunle', 'Physics', 30], [-21, 'Kunle', 'Physics', 40],
  [-17, 'Emeka', 'Mathematics', 30], [-14, 'Kunle', 'Physics', 60], [-10, 'Emeka', 'Mathematics', 40],
  [-7, 'Kunle', 'Physics', 90],
]
for (const [offset, tutor, subject, minutes] of tobiPlan) lesson(tobi, tutor, subject, rel(offset), '17:00', minutes, tobiPkg)

// Eze family
const ifeoma = addStudent('Ifeoma Eze', 'SS 3', 'eze')
const ifeomaPkg = createPackage(ifeoma, 5, 3_500_000, rel(-100))
lesson(ifeoma, 'Halima', 'Literature in English', rel(-95), '10:00', 60, ifeomaPkg)
lesson(ifeoma, 'Halima', 'Literature in English', rel(-80), '10:00', 90, ifeomaPkg)
lesson(ifeoma, 'Halima', 'Literature in English', rel(-4), '11:00', 60)

const daniel = addStudent('Daniel Eze', 'JSS 1', 'eze')
const danielPkg = createPackage(daniel, 20, 12_000_000, rel(-10))
lesson(daniel, 'Kunle', 'Mathematics', rel(-7), '15:00', 60, danielPkg)
lesson(daniel, 'Kunle', 'Mathematics', rel(-2), '15:00', 60, danielPkg)
lesson(daniel, 'Kunle', 'Mathematics', rel(4), '15:00', 60, danielPkg)

// Lawal family: Aisha pays as she goes, 40-minute school-period lessons
const aisha = addStudent('Aisha Lawal', 'SS 1', 'lawal')
const month = today.slice(0, 7)
lesson(aisha, 'Emeka', 'Mathematics', `${month}-06`, '13:00', 40)
lesson(aisha, 'Grace', 'Chemistry', `${month}-13`, '13:00', 60)
lesson(aisha, 'Emeka', 'Further Mathematics', `${month}-20`, '13:00', 40)

const musa = addStudent('Musa Lawal', 'Primary 6', 'lawal')
const musaPkg = createPackage(musa, 5, 3_500_000, rel(-30))
lesson(musa, 'Emeka', 'Mathematics', rel(-25), '11:00', 60, musaPkg)
lesson(musa, 'Emeka', 'Mathematics', rel(-12), '11:00', 60, musaPkg)
lesson(musa, 'Emeka', 'Mathematics', rel(1), '11:00', 60, musaPkg)

// Johnson family
const tomi = addStudent('Tomi Johnson', 'SS 3', 'johnson')
const tomiPkg = createPackage(tomi, 20, 12_000_000, rel(-45))
for (const [offset, tutor, subject] of [[-40, 'Kunle', 'Physics'], [-33, 'Grace', 'Chemistry'], [-26, 'Kunle', 'Physics'], [-19, 'Grace', 'Chemistry'], [-12, 'Kunle', 'Physics'], [6, 'Grace', 'Chemistry']] as const) {
  lesson(tomi, tutor, subject, rel(offset), '10:00', 90, tomiPkg)
}

const bisola = addStudent('Bisola Johnson', 'JSS 2', 'johnson')
const bisolaPkg = createPackage(bisola, 5, 3_500_000, rel(-5))
lesson(bisola, 'Halima', 'English Language', rel(-3), '12:00', 45, bisolaPkg)
lesson(bisola, 'Halima', 'English Language', rel(2), '12:00', 45, bisolaPkg)

const lastMonth = recentMonths(today, 2)[1]
generateInvoices(lastMonth, now)

const counts = db.prepare('SELECT (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(*) FROM lessons) AS lessons').get()
console.log(`Seeded ${file}:`, counts, `password for every account: ${PASSWORD}`)
