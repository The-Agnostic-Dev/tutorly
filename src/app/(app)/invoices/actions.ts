'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { generateInvoices } from '@/lib/services/billing'

export async function generateInvoicesAction(formData: FormData) {
  await requireUser(['admin'])
  const month = String(formData.get('month') ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) redirect('/invoices')
  const issued = generateInvoices(month)
  revalidatePath('/invoices')
  redirect(`/invoices?month=${month}&issued=${issued}`)
}
