# Tutorly

Tutorly runs the day-to-day of our tutoring centre in Lekki, Lagos: who teaches what, the weekly lesson
calendar, prepaid packages of hours that lessons draw down, cancellations, and the monthly invoice each
parent receives.

Three kinds of people use it:

- **Centre admin** (front desk): books and cancels lessons, sells packages, edits tutors, issues invoices.
- **Tutors**: see their own lessons and mark them as taught.
- **Parents**: see their children's lessons and balances, book and cancel lessons, read their invoices.

## Stack

- Next.js 16 (App Router, React 19, server components, server actions, route handlers), TypeScript
- SQLite through `better-sqlite3` (a single file, created and seeded locally)
- Vitest for unit tests
- Node.js 22

## Getting started

```bash
npm ci
npm run seed        # creates ./data/tutorly.db with demo data (wipes any existing file)
npm run dev         # http://localhost:5117
```

Production-style run (this is what the container does):

```bash
npm run build
npm run seed
npm start           # http://localhost:5117
```

With Docker:

```bash
docker compose up --build    # http://localhost:5117, fresh demo data on every start
```

Configuration lives in environment variables (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `TUTORLY_DB_PATH` | `./data/tutorly.db` | SQLite file |
| `SESSION_SECRET` | a development value | signs the session cookie |

## Demo logins

Every account uses the password `tutorly2026`.

| Who | Email |
| --- | --- |
| Funke Adebayo, centre admin | `admin@tutorly.ng` |
| Emeka Bello, tutor (Mathematics, Further Mathematics) | `emeka@tutorly.ng` |
| Halima Sani, tutor (English Language, Literature) | `halima@tutorly.ng` |
| Kunle Adeyemi, tutor (Physics, Mathematics) | `kunle@tutorly.ng` |
| Grace Udoh, tutor (Chemistry, Biology) | `grace@tutorly.ng` |
| Ngozi Okoro, parent of Chidera and Ebuka | `ngozi.okoro@example.com` |
| Tunde Bakare, parent of Tobi | `tunde.bakare@example.com` |
| Amaka Eze, parent of Ifeoma and Daniel | `amaka.eze@example.com` |
| Yusuf Lawal, parent of Aisha and Musa | `yusuf.lawal@example.com` |
| Folake Johnson, parent of Tomi and Bisola | `folake.johnson@example.com` |

The seed places lessons relative to today, so the calendar always has something in it.

## Tests

```bash
npm test            # vitest run
npm run typecheck
```

Tests use an in-memory SQLite database (`tests/fixtures.ts` builds a tiny centre).

## How the centre works

These rules are what the app implements; please keep this section in step with `src/lib/policy.ts`.

- **Opening hours.** Lessons run Monday to Saturday between 08:00 and 20:00, Lagos time. A lesson must
  finish by 20:00. Lessons are 30, 40, 45, 60, 90 or 120 minutes.
- **Packages.** Parents can prepay 5, 10 or 20 hours (₦35,000, ₦65,000, ₦120,000). A package is valid for
  **90 days from the day it is bought**. Hours still on a package when it expires lapse with it; they are
  not carried over to a new package. Expired packages stay visible on the student's page marked "Expired".
- **Booking.** When a lesson is booked, its length is taken off the student's current package straight
  away. A student without a valid package is "pay as you go" and the lesson goes on the monthly invoice.
  If the package does not have enough hours left, the booking is refused until it is topped up.
- **Cancelling.** Cancelling at least 24 hours before the start returns the hours to the package.
  Parents can only cancel up to that point; inside 24 hours they call the front desk, and the centre
  can still cancel, but the hours are not returned (late cancellation). Cancelled lessons are never charged.
- **Invoices.** Each parent gets one invoice per month listing (1) packages bought in that month at the
  package price and (2) pay-as-you-go lessons in that month that were not cancelled, at the tutor's hourly
  rate. Lessons taken from a package are not charged again. Generating a month again replaces that month's
  invoices with fresh figures.

## Project layout

```
scripts/seed.ts              demo data
src/app/                     routes (App Router)
  (app)/                     signed-in pages: dashboard, calendar, lessons, students, packages, tutors, invoices
  api/                       route handlers used by client components (students search, tutor directory, health)
  login/                     sign in / sign out
src/components/              shared and client components (calendar, booking form, tables)
src/lib/                     db connection, auth, money/time helpers, centre policy
  data/                      queries per table
  services/                  booking and billing rules
tests/                       vitest
```

Money is stored as integer kobo and shown as naira (₦12,500.00). Lesson times are stored in UTC and shown
in Lagos time.
