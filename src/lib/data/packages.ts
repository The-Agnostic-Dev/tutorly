import { getDb } from '../db'
import { minutesToHours } from '../hours'
import { PACKAGE_VALID_DAYS } from '../policy'
import { addDays } from '../time'

export type Package = {
  id: number
  studentId: number
  hoursPurchased: number
  hoursRemaining: number
  price: number
  purchasedOn: string
  expiresOn: string
}

const COLUMNS = `id, student_id AS studentId, hours_purchased AS hoursPurchased, hours_remaining AS hoursRemaining,
  price, purchased_on AS purchasedOn, expires_on AS expiresOn`

export function packagesForStudent(studentId: number): Package[] {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM packages WHERE student_id = ? ORDER BY purchased_on DESC, id DESC`)
    .all(studentId) as Package[]
}

/** The package new lessons draw from: the one that runs out soonest among those still valid. */
export function activePackage(studentId: number, today: string): Package | null {
  const row = getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM packages
       WHERE student_id = ? AND expires_on >= ?
       ORDER BY expires_on, id LIMIT 1`,
    )
    .get(studentId, today) as Package | undefined
  return row ?? null
}

export function packagesWithHours(studentId: number): Package[] {
  return getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM packages
       WHERE student_id = ? AND hours_remaining > 0
       ORDER BY expires_on, id`,
    )
    .all(studentId) as Package[]
}

export function packageStatus(pkg: Package, today: string): 'Active' | 'Used up' | 'Expired' {
  if (pkg.hoursRemaining > 0) return 'Active'
  if (pkg.expiresOn < today) return 'Expired'
  return 'Used up'
}

export function createPackage(studentId: number, hours: number, price: number, purchasedOn: string): number {
  const result = getDb()
    .prepare(
      `INSERT INTO packages (student_id, hours_purchased, hours_remaining, price, purchased_on, expires_on)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(studentId, hours, hours, price, purchasedOn, addDays(purchasedOn, PACKAGE_VALID_DAYS))
  return Number(result.lastInsertRowid)
}

export function hasEnoughHours(pkg: Package, minutes: number): boolean {
  return pkg.hoursRemaining >= minutesToHours(minutes)
}

export function drawDown(packageId: number, minutes: number) {
  getDb()
    .prepare('UPDATE packages SET hours_remaining = hours_remaining - ? WHERE id = ?')
    .run(minutesToHours(minutes), packageId)
}

export function giveBack(packageId: number, minutes: number) {
  getDb()
    .prepare('UPDATE packages SET hours_remaining = hours_remaining + ? WHERE id = ?')
    .run(minutesToHours(minutes), packageId)
}
