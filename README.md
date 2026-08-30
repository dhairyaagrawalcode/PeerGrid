# PeerGrid

PeerGrid is a mobile-first, verified student network for Newton School of Technology students in Bangalore, Pune, Delhi NCR, and Hyderabad.

The V1 is intentionally focused on four jobs:

- create a useful verified student profile;
- discover students by campus, skills, interests, and goals;
- manage two-way connections;
- publish and browse lightweight collaboration calls.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Supabase Auth, Postgres, Row Level Security, and Storage
- `@supabase/ssr` for cookie-backed browser/server sessions

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
3. Link the Supabase CLI project and apply `supabase/migrations/20260830000000_peergrid_v1.sql` (or run `supabase db push`).
4. For the initial manual-approval phase, leave `public.allowed_email_domains` empty. Signup remains open, but no confirmed user can enter the network until an administrator approves them.
5. Later, when the real NST domain is confirmed, add it to `public.allowed_email_domains`:

   ```sql
   insert into public.allowed_email_domains (domain)
   values ('the-confirmed-student-domain.edu');
   ```

6. In hosted Supabase Auth Hooks, enable the **Before User Created** Postgres hook and select `public.hook_restrict_signup_by_email_domain`. The included `supabase/config.toml` enables it automatically for local Supabase.
7. Keep email confirmation enabled and add `/auth/callback` to the allowed redirect URLs.
8. Start the app with `npm run dev`.

No email domain is hardcoded or seeded. With no active domain rows, email-confirmed accounts enter the manual review queue.

## Manual student approval

New accounts follow this flow:

```text
sign up → confirm email → pending approval → profile onboarding → PeerGrid
```

To approve a student in the Supabase Dashboard:

1. Open **Table Editor → student_approvals**.
2. Confirm the email belongs to an NST student.
3. Change `status` from `pending` to `approved` and save. The database fills `reviewed_at` automatically.

To reject an account, set `status` to `rejected` and optionally add a short `review_note`.

The equivalent SQL is:

```sql
update public.student_approvals
set status = 'approved'
where email = 'student@example.edu';
```

Later automation only needs to update this same approval row; application authorization does not need to change.

## Application structure

- `app/(platform)` contains the protected V1 routes and shared application shell.
- `app/auth` contains login, signup, email verification, and PKCE callback routes.
- `app/actions` contains authenticated server mutations.
- `app/lib/supabase` contains separate browser, server, and session-refresh clients.
- `supabase/migrations` is the source of truth for tables, indexes, constraints, hooks, grants, RLS, and avatar storage policies.

The public client uses only the Supabase publishable key. Never add a service-role key to a `NEXT_PUBLIC_` environment variable or browser code.

## Data and security model

- Campus values are normalized and seeded as four rows.
- Profiles use the Auth user ID as their primary key and do not expose student emails.
- Skills and interests use normalized many-to-many tables.
- A unique unordered-pair index prevents duplicate or reversed connection requests.
- Collaboration posts are chronological, campus-scoped or NST-wide, and owned by their authors.
- RLS limits networking data to email-confirmed, manually approved profiles; mutations are restricted to owners or request participants.
- Avatar uploads are limited to authenticated users' own folders, supported image types, and 3 MB.

Messaging was not present in the original prototype and is intentionally outside the V1 UI. The prioritized profile → discovery → connections → collaboration flow is complete without introducing an unused chat surface.

## Validation

```bash
npm run lint
npm run build
```
