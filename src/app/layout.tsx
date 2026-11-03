import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Tutorly', template: '%s · Tutorly' },
  description: 'Lessons, packages and invoices for the tutoring centre',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  )
}
