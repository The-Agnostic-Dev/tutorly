import { getDb } from '../db'

export type InvoiceSummary = { id: number; parentId: number; parentName: string; month: string; total: number; issuedAt: string }
export type InvoiceDetail = InvoiceSummary & { parentEmail: string; lines: Array<{ id: number; description: string; amount: number }> }

const SUMMARY = `SELECT i.id, i.parent_id AS parentId, u.name AS parentName, i.month, i.total, i.issued_at AS issuedAt
  FROM invoices i JOIN users u ON u.id = i.parent_id`

export function invoicesForMonth(month: string): InvoiceSummary[] {
  return getDb().prepare(`${SUMMARY} WHERE i.month = ? ORDER BY u.name`).all(month) as InvoiceSummary[]
}

export function invoicesForParent(parentId: number): InvoiceSummary[] {
  return getDb().prepare(`${SUMMARY} WHERE i.parent_id = ? ORDER BY i.month DESC`).all(parentId) as InvoiceSummary[]
}

export function getInvoice(id: number): InvoiceDetail | null {
  const db = getDb()
  const invoice = db.prepare(`${SUMMARY.replace('u.name AS parentName', 'u.name AS parentName, u.email AS parentEmail')} WHERE i.id = ?`).get(id) as
    | (InvoiceSummary & { parentEmail: string })
    | undefined
  if (!invoice) return null
  const lines = db.prepare('SELECT id, description, amount FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id) as InvoiceDetail['lines']
  return { ...invoice, lines }
}
