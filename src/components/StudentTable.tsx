'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatHours } from '@/lib/hours'
import { formatDateTime } from '@/lib/time'

export type StudentListRow = {
  id: number
  name: string
  classLevel: string
  parentName: string
  hoursLeft: number | null
  nextLesson: string | null
}

type Column = { key: string; label: string; show: (row: StudentListRow) => string; sortable: boolean; numeric?: boolean }

const COLUMNS: Column[] = [
  { key: 'name', label: 'Student', show: (r) => r.name, sortable: true },
  { key: 'class', label: 'Class', show: (r) => r.classLevel, sortable: true },
  { key: 'parent', label: 'Parent', show: (r) => r.parentName, sortable: true },
  {
    key: 'hours',
    label: 'Hours left',
    show: (r) => (r.hoursLeft === null ? 'Pay as you go' : formatHours(r.hoursLeft)),
    sortable: true,
    numeric: true,
  },
  { key: 'next', label: 'Next lesson', show: (r) => (r.nextLesson ? formatDateTime(r.nextLesson) : 'None booked'), sortable: false },
]

export function StudentTable({ initialRows }: { initialRows: StudentListRow[] }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(initialRows)
  const [sortKey, setSortKey] = useState('name')
  const [ascending, setAscending] = useState(true)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setRows(initialRows)
      return
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`)
      if (res.ok) setRows(await res.json())
    }, 250)
    return () => clearTimeout(timer)
  }, [query, initialRows])

  const column = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0]
  const sorted = rows.toSorted((a, b) => column.show(a).localeCompare(column.show(b)) * (ascending ? 1 : -1))

  function sortBy(key: string) {
    if (key === sortKey) setAscending(!ascending)
    else {
      setSortKey(key)
      setAscending(true)
    }
  }

  return (
    <div className="card">
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="student-search">Search by student or parent</label>
        <input id="student-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Okoro" />
      </div>
      <table data-testid="students">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.numeric ? 'num' : undefined}>
                {c.sortable ? (
                  <button type="button" onClick={() => sortBy(c.key)}>
                    {c.label}
                    {c.key === sortKey ? (ascending ? ' ▲' : ' ▼') : ''}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} data-student-id={row.id}>
              {COLUMNS.map((c) => (
                <td key={c.key} className={c.numeric ? 'num' : undefined} data-col={c.key}>
                  {c.key === 'name' ? <Link href={`/students/${row.id}`}>{row.name}</Link> : c.show(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="hint">
                No students match &ldquo;{query}&rdquo;.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
