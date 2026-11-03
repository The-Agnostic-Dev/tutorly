import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db'
import { generateInvoices, invoiceLinesFor, lessonCharge } from '@/lib/services/billing'
import { freshCentre, withPackage } from './fixtures'

function addLesson(startsAt: string, minutes: number, status = 'booked', packageId: number | null = null) {
  getDb()
    .prepare(
      `INSERT INTO lessons (student_id, tutor_id, subject_id, starts_at, duration_min, status, package_id, created_at)
       VALUES (1, 1, 1, ?, ?, ?, ?, ?)`,
    )
    .run(startsAt, minutes, status, packageId, startsAt)
}

describe('lessonCharge', () => {
  it('charges the hourly rate for whole and half hours', () => {
    expect(lessonCharge(750_000, 60)).toBe(750_000)
    expect(lessonCharge(750_000, 90)).toBe(1_125_000)
    expect(lessonCharge(600_000, 30)).toBe(300_000)
    expect(lessonCharge(800_000, 120)).toBe(1_600_000)
  })
})

describe('monthly invoice', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('bills packages bought in the month and pay-as-you-go lessons', () => {
    const pkg = withPackage(10, '2026-10-03')
    addLesson('2026-10-05T15:00:00.000Z', 60, 'completed', pkg)
    addLesson('2026-10-12T15:00:00.000Z', 90, 'completed')
    addLesson('2026-10-19T15:00:00.000Z', 60, 'cancelled')
    addLesson('2026-11-02T15:00:00.000Z', 60)

    const lines = invoiceLinesFor(3, '2026-10')
    expect(lines.map((l) => l.amount)).toEqual([6_500_000, 1_125_000])
    expect(lines[0].description).toContain('10-hour package')
  })

  it('counts a lesson at 00:30 on the 1st (Lagos) in that month', () => {
    addLesson('2026-10-31T23:30:00.000Z', 60)
    expect(invoiceLinesFor(3, '2026-11')).toHaveLength(1)
    expect(invoiceLinesFor(3, '2026-10')).toHaveLength(0)
  })

  it('replaces an existing invoice when generated again', () => {
    addLesson('2026-10-12T15:00:00.000Z', 60, 'completed')
    expect(generateInvoices('2026-10')).toBe(1)
    addLesson('2026-10-13T15:00:00.000Z', 60, 'completed')
    expect(generateInvoices('2026-10')).toBe(1)
    const totals = getDb().prepare('SELECT total FROM invoices').all()
    expect(totals).toEqual([{ total: 1_500_000 }])
  })
})
