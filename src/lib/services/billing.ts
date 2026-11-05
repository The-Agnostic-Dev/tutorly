import { getDb } from '../db'
import { LESSON_SELECT, type Lesson } from '../data/lessons'
import { formatDuration } from '../hours'
import { formatNaira } from '../money'
import { formatDate, formatDateTime, monthBounds } from '../time'

export type InvoiceLine = { description: string; amount: number }

/** Price of a pay-as-you-go lesson at the tutor's hourly rate (kobo). */
export function lessonCharge(hourlyRate: number, minutes: number): number {
  return Math.round((hourlyRate * minutes) / 60)
}

/**
 * What a parent owes for a month: packages bought that month, plus lessons booked without a
 * package (pay as you go) that were not cancelled. Lessons taken from a package are already paid for.
 */
export function invoiceLinesFor(parentId: number, month: string): InvoiceLine[] {
  const db = getDb()
  const packages = db
    .prepare(
      `SELECT p.hours_purchased AS hours, p.price, p.purchased_on AS purchasedOn, st.name AS studentName
       FROM packages p JOIN students st ON st.id = p.student_id
       WHERE st.parent_id = ? AND p.purchased_on LIKE ?
       ORDER BY p.purchased_on, p.id`,
    )
    .all(parentId, `${month}-%`) as Array<{ hours: number; price: number; purchasedOn: string; studentName: string }>

  const { from, to } = monthBounds(month)
  const lessons = db
    .prepare(
      `${LESSON_SELECT.replace('SELECT', 'SELECT t.hourly_rate AS hourlyRate,')}
       WHERE st.parent_id = ? AND l.package_id IS NULL AND l.status != 'cancelled'
         AND l.starts_at >= ? AND l.starts_at < ?
       ORDER BY l.starts_at`,
    )
    .all(parentId, from, to) as Array<Lesson & { hourlyRate: number }>

  return [
    ...packages.map((p) => ({
      description: `${p.studentName}: ${p.hours}-hour package, bought ${formatDate(`${p.purchasedOn}T12:00:00Z`)}`,
      amount: p.price,
    })),
    ...lessons.map((l) => ({
      description: `${l.studentName}: ${l.subjectName} with ${l.tutorName}, ${formatDateTime(l.startsAt)}, ${formatDuration(l.durationMin)} at ${formatNaira(l.hourlyRate)}/h`,
      amount: lessonCharge(l.hourlyRate, l.durationMin),
    })),
  ]
}

/** Creates (or recreates) the month's invoice for every parent who owes something. */
export function generateInvoices(month: string, now: Date = new Date()): number {
  const db = getDb()
  const parents = db.prepare("SELECT id FROM users WHERE role = 'parent' ORDER BY id").all() as Array<{ id: number }>
  let issued = 0
  db.transaction(() => {
    for (const parent of parents) {
      db.prepare('DELETE FROM invoices WHERE parent_id = ? AND month = ?').run(parent.id, month)
      const lines = invoiceLinesFor(parent.id, month)
      if (lines.length === 0) continue
      const total = lines.reduce((sum, line) => sum + line.amount, 0)
      const invoice = db
        .prepare('INSERT INTO invoices (parent_id, month, total, issued_at) VALUES (?, ?, ?, ?)')
        .run(parent.id, month, total, now.toISOString())
      const insertLine = db.prepare('INSERT INTO invoice_lines (invoice_id, description, amount) VALUES (?, ?, ?)')
      for (const line of lines) insertLine.run(invoice.lastInsertRowid, line.description, line.amount)
      issued++
    }
  })()
  return issued
}
