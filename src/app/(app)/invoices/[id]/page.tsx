import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/PrintButton'
import { requireUser } from '@/lib/auth'
import { getInvoice } from '@/lib/data/invoices'
import { formatNaira } from '@/lib/money'
import { formatDate, formatMonth } from '@/lib/time'

export const metadata = { title: 'Invoice' }

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(['admin', 'parent'])
  const { id } = await params
  const invoice = getInvoice(Number(id))
  if (!invoice) notFound()
  if (user.role === 'parent' && invoice.parentId !== user.id) notFound()

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Invoice {String(invoice.id).padStart(5, '0')}</h1>
          <p className="lead">
            {formatMonth(invoice.month)} · {invoice.parentName} ({invoice.parentEmail}) · issued {formatDate(invoice.issuedAt)}
          </p>
        </div>
        <PrintButton />
      </div>
      <div className="card">
        <table data-testid="invoice-lines">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td className="num">{formatNaira(line.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th className="num" data-testid="invoice-total">
                {formatNaira(invoice.total)}
              </th>
            </tr>
          </tfoot>
        </table>
        <p className="hint">Tutorly Learning Centre, 14 Admiralty Way, Lekki Phase 1, Lagos. Pay by transfer to GTBank 0123456789.</p>
      </div>
    </>
  )
}
