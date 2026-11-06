import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db'
import { getLesson } from '@/lib/data/lessons'
import { upcomingLessons } from '@/lib/data/students'
import { packagesForStudent } from '@/lib/data/packages'
import { bookLesson, cancelLesson, checkSlot, validateSlot, type BookingRequest } from '@/lib/services/bookings'
import { admin, freshCentre, parent, withPackage } from './fixtures'

// Wednesday 4 November 2026, 09:00 in Lagos
const NOW = new Date('2026-11-04T08:00:00.000Z')

function request(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return { studentId: 1, tutorId: 1, subjectId: 1, date: '2026-11-06', time: '16:00', durationMin: 60, ...overrides }
}

describe('validateSlot', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('accepts a normal afternoon lesson', () => {
    expect(validateSlot(request(), NOW)).toBeNull()
  })

  it('refuses Sundays, late finishes and the past', () => {
    expect(validateSlot(request({ date: '2026-11-08' }), NOW)).toMatch(/Sundays/)
    expect(validateSlot(request({ time: '19:30' }), NOW)).toMatch(/between/)
    expect(validateSlot(request({ date: '2026-11-03' }), NOW)).toMatch(/passed/)
  })

  it('refuses a subject the tutor does not teach', () => {
    expect(validateSlot(request({ subjectId: 2 }), NOW)).toMatch(/does not teach/)
  })
})

describe('booking and cancelling', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('draws the lesson from the package', () => {
    withPackage(10, '2026-10-20')
    const result = bookLesson(request({ durationMin: 90 }), NOW)
    expect(result.ok).toBe(true)
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(8.5)
  })

  it('bills pay as you go when there is no package', () => {
    const result = bookLesson(request(), NOW)
    expect(result).toMatchObject({ ok: true, packageId: null })
  })

  it('refuses when the package is short', () => {
    withPackage(0.5, '2026-10-20')
    const result = bookLesson(request(), NOW)
    expect(result).toMatchObject({ ok: false })
  })

  it('shows a clash while the form is being filled in', () => {
    bookLesson(request(), NOW)
    expect(checkSlot(request({ time: '16:30', studentId: 1 }), NOW)).toMatchObject({ ok: false })
    expect(checkSlot(request({ time: '17:00' }), NOW)).toEqual({ ok: true })
  })

  it('refuses a second student when the tutor is already booked', () => {
    const first = bookLesson(request(), NOW)
    expect(first.ok).toBe(true)
    getDb()
      .prepare("INSERT INTO students (id, name, class_level, parent_id) VALUES (2, 'Chioma Okoro', 'JSS 3', 3)")
      .run()

    const sameTime = bookLesson(request({ studentId: 2 }), NOW)
    expect(sameTime.ok).toBe(false)
    if (!sameTime.ok) expect(sameTime.message).toMatch(/already has a lesson/)

    const overlapping = bookLesson(request({ studentId: 2, time: '16:30' }), NOW)
    expect(overlapping.ok).toBe(false)
    if (!overlapping.ok) expect(overlapping.message).toMatch(/already has a lesson/)

    const free = bookLesson(request({ studentId: 2, time: '17:00' }), NOW)
    if (!free.ok) throw new Error(free.message)
    const lessons = upcomingLessons(2, NOW.toISOString())
    expect(lessons).toHaveLength(1)
    expect(lessons[0].id).toBe(free.lessonId)
  })

  it('returns hours when cancelled two days ahead', () => {
    withPackage(10, '2026-10-20')
    const booked = bookLesson(request(), NOW)
    if (!booked.ok) throw new Error(booked.message)
    expect(cancelLesson(booked.lessonId, parent, NOW)).toEqual({ ok: true, hoursReturned: true })
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(10)
    expect(getLesson(booked.lessonId)?.status).toBe('cancelled')
  })

  it('keeps the hours on a late cancellation by the centre', () => {
    withPackage(10, '2026-10-20')
    const booked = bookLesson(request({ date: '2026-11-04', time: '15:00' }), NOW)
    if (!booked.ok) throw new Error(booked.message)
    expect(cancelLesson(booked.lessonId, admin, NOW)).toEqual({ ok: true, hoursReturned: false })
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(9)
  })
})

describe('upcomingLessons ordering', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('returns booked lessons in chronological order', () => {
    const first = bookLesson(request({ date: '2026-11-07', time: '16:00' }), NOW)
    const second = bookLesson(request({ date: '2026-11-05', time: '15:00' }), NOW)
    const third = bookLesson(request({ date: '2026-11-06', time: '17:00' }), NOW)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(true)

    const lessons = upcomingLessons(1, NOW.toISOString())
    const starts = lessons.map(l => l.startsAt)
    expect(starts).toEqual([...starts].sort())
  })
})
