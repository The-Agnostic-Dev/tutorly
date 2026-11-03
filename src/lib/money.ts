// All amounts are stored as integer kobo (₦1 = 100 kobo).

const nairaFormat = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatNaira(kobo: number): string {
  const sign = kobo < 0 ? '-' : ''
  return `${sign}₦${nairaFormat.format(Math.abs(kobo) / 100)}`
}

/** Reads what an admin types into a naira field: "7500", "7,500", "₦7,500.50". */
export function parseNaira(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}
