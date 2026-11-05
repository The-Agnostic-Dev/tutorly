import { describe, it, expect } from 'vitest'
import { freshCentre, withPackage } from './fixtures'
import { packageStatus, packagesForStudent } from '@/lib/data/packages'
import { listStudents, getStudent } from '@/lib/data/students'
import { lagosDate, addDays, weekday } from '@/lib/time'
import { bookLesson } from '@/lib/services/bookings'

describe('package with remaining hours past expiry', () => {
  it('stays Active, keeps hours, and lessons draw from the package', () => {
    freshCentre()

    // Purchase date more than 90 days in the past so the package is expired by date
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    withPackage(5, pastDate)

    const pkg = packagesForStudent(1)[0]
    const today = lagosDate(new Date())

    // Package must be Active because it has remaining hours
    expect(packageStatus(pkg, today)).toBe('Active')

    // Hours remaining unchanged
    expect(pkg.hoursRemaining).toBe(5)

    // Book a 60-minute lesson on a future open day; it should use the package
    let futureDate = addDays(today, 2)
    if (weekday(futureDate) === 0) futureDate = addDays(futureDate, 1)
    const result = bookLesson({
      studentId: 1,
      tutorId: 1,
      subjectId: 1,
      date: futureDate,
      time: '10:00',
      durationMin: 60,
    })

    if (!result.ok) throw new Error(result.message)
    expect(result.packageId).toBe(pkg.id)

    // Balance drawn down from 5 to 4 hours
    const updated = packagesForStudent(1)[0]
    expect(updated.hoursRemaining).toBe(4)
  })

  it('uses a newer package with enough hours when an expired short package cannot cover the lesson', () => {
    freshCentre()
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    withPackage(0.5, pastDate)
    const today = lagosDate(new Date())
    const freshId = withPackage(10, today)

    let futureDate = addDays(today, 2)
    if (weekday(futureDate) === 0) futureDate = addDays(futureDate, 1)
    const result = bookLesson({
      studentId: 1,
      tutorId: 1,
      subjectId: 1,
      date: futureDate,
      time: '10:00',
      durationMin: 60,
    })

    if (!result.ok) throw new Error(result.message)
    expect(result.packageId).toBe(freshId)

    const freshPkg = packagesForStudent(1).find(p => p.id === freshId)
    expect(freshPkg?.hoursRemaining).toBe(9)
  })

  it('listStudents and getStudent work with bind parameters and report hoursLeft', () => {
    freshCentre()
    const today = lagosDate(new Date())
    const nowIso = new Date().toISOString()

    // Pay-as-you-go student has null hoursLeft
    let rows = listStudents(today, nowIso)
    expect(rows).toHaveLength(1)
    expect(rows[0].hoursLeft).toBeNull()
    expect(getStudent(1, today, nowIso)?.hoursLeft).toBeNull()

    // With a 5-hour package, hoursLeft becomes 5
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    withPackage(5, pastDate)

    rows = listStudents(today, nowIso)
    expect(rows[0].hoursLeft).toBe(5)
    expect(getStudent(1, today, nowIso)?.hoursLeft).toBe(5)
  })

  it('refuses a booking when the soonest-expiring unexpired package cannot cover the lesson', () => {
    freshCentre()
    const today = lagosDate(new Date())
    const shortId = withPackage(0.5, addDays(today, -5))
    const longId = withPackage(10, today)

    let futureDate = addDays(today, 2)
    if (weekday(futureDate) === 0) futureDate = addDays(futureDate, 1)
    const result = bookLesson({
      studentId: 1,
      tutorId: 1,
      subjectId: 1,
      date: futureDate,
      time: '10:00',
      durationMin: 60,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('Not enough hours left')

    const longPkg = packagesForStudent(1).find(p => p.id === longId)
    expect(longPkg?.hoursRemaining).toBe(10)
  })

  it('refuses a used-up unexpired package and dashboards still show 0.00 h left', () => {
    freshCentre()
    const today = lagosDate(new Date())
    const nowIso = new Date().toISOString()
    withPackage(0, today)

    let futureDate = addDays(today, 2)
    if (weekday(futureDate) === 0) futureDate = addDays(futureDate, 1)
    const result = bookLesson({
      studentId: 1,
      tutorId: 1,
      subjectId: 1,
      date: futureDate,
      time: '10:00',
      durationMin: 60,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('Not enough hours left')

    const rows = listStudents(today, nowIso)
    expect(rows[0].hoursLeft).toBe(0)
    expect(getStudent(1, today, nowIso)?.hoursLeft).toBe(0)
  })
})
