import { describe, it, expect } from 'vitest'
import { freshCentre, withPackage } from './fixtures'
import { packageStatus, hoursRemaining } from '@/lib/data/packages'
import { bookLesson } from '@/lib/services/bookings'

describe('package with remaining hours past expiry', () => {
  it('stays Active, keeps hours, and lessons draw from the package', () => {
    freshCentre()

    // Purchase date more than 90 days in the past so the package is expired by date
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const packageId = withPackage(5, pastDate)

    // Package must be Active because it has remaining hours
    expect(packageStatus(packageId)).toBe('Active')

    // Hours remaining unchanged
    expect(hoursRemaining(packageId)).toBe(5)

    // Book a 60-minute lesson now; it should use the package
    const result = bookLesson({
      studentId: 1,
      tutorId: 1,
      subjectId: 1,
      startAt: new Date().toISOString(),
      durationMinutes: 60,
    })

    expect(result.packageId).toBe(packageId)

    // Balance drawn down from 5 to 4 hours
    expect(hoursRemaining(packageId)).toBe(4)
  })
})
