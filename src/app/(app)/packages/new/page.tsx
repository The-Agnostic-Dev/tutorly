import { requireUser } from '@/lib/auth'
import { allStudentNames } from '@/lib/data/students'
import { formatNaira } from '@/lib/money'
import { PACKAGE_OPTIONS, PACKAGE_VALID_DAYS } from '@/lib/policy'
import { sellPackage } from '../actions'

export const metadata = { title: 'Sell a package' }

export default async function NewPackagePage({ searchParams }: { searchParams: Promise<{ student?: string; error?: string }> }) {
  await requireUser(['admin'])
  const { student, error } = await searchParams
  return (
    <>
      <h1>Sell a package</h1>
      <p className="lead">Prepaid hours, valid for {PACKAGE_VALID_DAYS} days from today. The package appears on this month&apos;s invoice.</p>
      <form className="card" action={sellPackage}>
        {error && <p className="notice error">Choose a student and a package.</p>}
        <div className="field">
          <label htmlFor="studentId">Student</label>
          <select id="studentId" name="studentId" defaultValue={student ?? ''} required>
            <option value="">Choose...</option>
            {allStudentNames().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hours">Package</label>
          <select id="hours" name="hours" defaultValue="10">
            {PACKAGE_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.hours} hours for {formatNaira(o.price)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">
          Add package
        </button>
      </form>
    </>
  )
}
