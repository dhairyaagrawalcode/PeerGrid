# PeerGrid

PeerGrid is a mobile-first, verified student network for Newton School of Technology students in Bangalore, Pune, Delhi NCR, and Hyderabad.

The current product is focused on five jobs:

- create a useful verified student profile;
- discover students by campus, skills, interests, and goals;
- follow students and track followers;
- publish, like, and comment on text, image, video, and document posts;
- publish and browse lightweight collaboration calls.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Supabase Auth, Postgres, Row Level Security, and Storage
- `@supabase/ssr` for cookie-backed browser/server sessions

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
3. Link the Supabase CLI project and run `supabase db push` to apply every migration. If you use the SQL Editor instead, run the files in `supabase/migrations` in filename order, including `20260831000000_production_readiness.sql`.
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
- Follows are immediate, directional, cannot target the same user, and use a composite primary key to prevent duplicates. Existing accepted connections are migrated to mutual follows.
- Social posts are chronological and support one private image, video, or document attachment up to 25 MB. Feed links use short-lived signed URLs; indexed likes and comments provide accurate engagement counts.
- Direct messages use one unique conversation per student pair, indexed message history, participant-only RLS, read state, and Supabase Realtime delivery.
- Collaboration posts are chronological, campus-scoped or NST-wide, and owned by their authors.
- RLS limits networking data to email-confirmed, manually approved profiles; likes, comments, follows, posts, and uploads are restricted to the authenticated owner where appropriate.
- Avatar and post uploads are limited to authenticated users' own folders and explicit file types. Avatars allow 3 MB; post attachments allow 25 MB.

## Development load testing

The optional seed script can create 10–1,000 users plus posts, follows, collaborations, conversations, and messages. It requires a server-only service-role key and an explicit confirmation flag, refuses `NODE_ENV=production`, and refuses remote projects unless separately confirmed.

```bash
PEERGRID_SEED_CONFIRM=yes \
PEERGRID_SEED_USERS=250 \
PEERGRID_SEED_EMAIL_DOMAIN=your-allowed-development-domain.test \
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key \
npm run seed:dev
```

Use a disposable local or staging Supabase project. For a remote staging project, also set `PEERGRID_ALLOW_REMOTE_SEED=yes`. Never expose the service-role key through a `NEXT_PUBLIC_` variable.

## Production notes

- Set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` across all production instances.
- Keep the service-role key out of the Next.js client and normal web runtime.
- Apply all migrations before deploying the matching application build.
- Configure Supabase Auth redirect URLs for the production origin and `/auth/callback`.
- The app bounds feed, profile, collaboration, discovery, conversation, comment, follower, and message reads; messages load the latest page first and fetch older history on demand.

## Validation

```bash
npm run lint
npm run build
```
