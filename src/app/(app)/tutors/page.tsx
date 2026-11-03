import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { listTutors } from '@/lib/data/tutors'
import { formatNaira } from '@/lib/money'

export const metadata = { title: 'Tutors' }

export default async function TutorsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireUser(['admin'])
  const { saved } = await searchParams
  const tutors = listTutors()
  return (
    <>
      <h1>Tutors</h1>
      <p className="lead">Hourly rates apply to pay-as-you-go lessons on the monthly invoice.</p>
      {saved && <p className="notice ok">Tutor saved.</p>}
      <div className="card">
        <table data-testid="tutors">
          <thead>
            <tr>
              <th>Name</th>
              <th>Subjects</th>
              <th className="num">Hourly rate</th>
              <th>Email</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tutors.map((t) => (
              <tr key={t.id} data-tutor-id={t.id}>
                <td>{t.name}</td>
                <td>{t.subjects.join(', ') || 'None yet'}</td>
                <td className="num">{formatNaira(t.hourlyRate)}</td>
                <td>{t.email}</td>
                <td>
                  <Link href={`/tutors/${t.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
