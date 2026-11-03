import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { invoicesForMonth, invoicesForParent, type InvoiceSummary } from '@/lib/data/invoices'
import { formatNaira } from '@/lib/money'
import { formatDate, formatMonth, lagosDate, recentMonths } from '@/lib/time'
import { generateInvoicesAction } from './actions'

export const metadata = { title: 'Invoices' }

function InvoiceTable({ invoices, showParent }: { invoices: InvoiceSummary[]; showParent: boolean }) {
  return (
    <table data-testid="invoices">
      <thead>
        <tr>
          <th>Month</th>
          {showParent && <th>Parent</th>}
          <th>Issued</th>
          <th className="num">Total</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} data-invoice-id={inv.id}>
            <td>{formatMonth(inv.month)}</td>
            {showParent && <td>{inv.parentName}</td>}
            <td>{formatDate(inv.issuedAt)}</td>
            <td className="num">{formatNaira(inv.total)}</td>
            <td>
              <Link href={`/invoices/${inv.id}`}>View</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Search = { month?: string; issued?: string }

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser(['admin', 'parent'])
  const params = await searchParams

  if (user.role === 'parent') {
    const invoices = invoicesForParent(user.id)
    return (
      <>
        <h1>Invoices</h1>
        <p className="lead">One invoice per month: packages bought that month and pay-as-you-go lessons.</p>
        <div className="card">
          {invoices.length === 0 ? <p className="hint">No invoices yet.</p> : <InvoiceTable invoices={invoices} showParent={false} />}
        </div>
      </>
    )
  }

  const months = recentMonths(lagosDate(), 6)
  const month = params.month && months.includes(params.month) ? params.month : months[0]
  const invoices = invoicesForMonth(month)

  return (
    <>
      <h1>Invoices</h1>
      <p className="lead">
        Each parent gets one invoice per month: packages bought in the month, plus lessons booked without a package
        (charged at the tutor&apos;s hourly rate). Cancelled lessons are not charged.
      </p>
      {params.issued !== undefined && (
        <p className="notice ok">
          {params.issued} invoice{params.issued === '1' ? '' : 's'} issued for {formatMonth(month)}.
        </p>
      )}
      <div className="card no-print">
        <div className="row">
          <form className="row" style={{ flex: 1 }}>
            <div className="field">
              <label htmlFor="month">Month</label>
              <select id="month" name="month" defaultValue={month}>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 0 }}>
              <button className="btn secondary" type="submit">
                Show
              </button>
            </div>
          </form>
          <form action={generateInvoicesAction} className="field" style={{ flex: 0 }}>
            <input type="hidden" name="month" value={month} />
            <button className="btn" type="submit">
              Generate invoices for {formatMonth(month)}
            </button>
          </form>
        </div>
        <p className="hint">Generating again replaces that month&apos;s invoices with fresh figures.</p>
      </div>
      <div className="card">
        {invoices.length === 0 ? (
          <p className="hint">No invoices for {formatMonth(month)} yet.</p>
        ) : (
          <InvoiceTable invoices={invoices} showParent />
        )}
      </div>
    </>
  )
}
