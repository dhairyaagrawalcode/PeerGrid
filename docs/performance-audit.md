# PeerGrid performance audit — 2026-09-02

## Diagnosis, before optimization

Source baseline: `performance-fix` HEAD before this pass. User-reported page times
(feed/profile ~3.1 s, messages ~1.9–2.2 s) are not independent measurements.

1. The proxy waits for remote `getUser`, then platform access. Server rendering
   repeats both operations before fetching profile/approval. React `cache` already
   deduplicates layout/page auth within a render, but not across the proxy boundary.
2. The protected layout waits for four header queries, including notifications for
   a closed dropdown. Its same-segment loading boundary cannot cover the layout.
3. Feed rendering waits for posts, recommendations, a second current-profile query,
   follower counts, collaboration recommendations and then mutual relationships.
   Independent sidebars prevent otherwise-ready content from streaming.
4. Post authors are already joined in one query and engagement is batched: no author
   N+1 was found. Engagement and batched storage signing nevertheless run serially.
   Initial post pages contain 20 posts plus a pagination sentinel.
5. Own/other profiles wait for posts, proofs and pending confirmations before showing
   identity. Proofs currently have no pagination.
6. Messages eagerly download up to 100 student profiles with four tag joins for
   closed group dialogs. Active conversations also wait for the conversation list
   before starting messages/member queries. Send/realtime/read events can trigger
   repeated conversation-list fetches.
7. Post images use unresized originals; avatars already use Next Image. Videos use
   metadata preload. No full-resolution image delivery budget is enforced.
8. Crypto bootstrap statically imports the sodium dependency on all authenticated
   pages. It is needed for key registration, not for their initial visual render.
9. Feed ranking evaluates correlated author-interaction and engagement lookups over
   eligible posts before limiting. Review indexes/plans before changing semantics.
10. Existing message/comment/feed/search/conversation pagination and realtime cleanup
    are present. They should be retained, not replaced wholesale.

No application source reference to `startTime` was found. This alone does not prove
the reported error comes from an extension; browser/runtime checks remain necessary.

## Measurement protocol

Use identical opt-in browser instrumentation and production builds for baseline and
optimized snapshots, the same browser/session/viewport and multiple navigations.
Record TTFB separately from full document/DCL/LCP: streaming a skeleton is not the
same as delivering usable content. Browser Resource Timing reports zero sizes for
cross-origin resources without Timing-Allow-Origin; disclose that limitation.
Never export cookies, tokens, message text, encryption keys or signed URL parameters.

## Changes implemented

- Request-scoped authentication is reused across the layout and page. Profile,
  approval and platform-access reads run concurrently after authoritative user
  validation. The proxy performs local JWT-claim validation/refresh and leaves
  authorization-sensitive checks to server pages/actions plus RLS.
- Header badge/notification reads moved out of the blocking server layout. They
  reconcile after hydration, realtime events, reconnects and visibility changes;
  subscriptions and delayed work are cleaned up on unmount.
- Feed identity, posts and both recommendation areas stream independently. The
  initial post page is limited to 12 plus a sentinel; author data remains joined,
  engagement remains one batched RPC, duplicate media paths are removed and URL
  signing runs alongside engagement rather than after it.
- Profile identity streams ahead of paged posts, proof-of-work and mutual-follow
  context. Own profile and edit/onboarding now reuse the authenticated profile.
- Message pages no longer load 100 rich profiles for closed dialogs. The compact
  bounded group candidate query runs only while a picker is open. Conversation
  list refreshes are debounced and ignore stale completions. The active conversation
  starts its recent-message, membership and list reads concurrently; existing
  50-message pagination and E2EE are unchanged.
- JPEG uploads receive best-effort client resizing/compression. Existing private
  JPEG/PNG/WebP post media is served through an authenticated same-origin endpoint
  as responsive 480/800/1280 WebP thumbnails, with the original signed object as a
  fallback. The endpoint checks post RLS, MIME/format, byte/pixel/animation limits,
  uses private browser caching and never accepts an arbitrary storage path.
- Crypto device bootstrap is deferred from initial visual render. Route-shaped,
  reduced-motion-safe skeletons now cover Feed, Profile, Discover, Collaboration,
  Messages, Create Post and the generic protected route; secondary streamed areas
  retain small neutral skeletons.

## Production measurements

Measured in the same signed-in in-app browser and viewport against two local
production builds, twice per route (cold/warm effects therefore remain visible).
Values below are two-run means in milliseconds. `Document` is the complete streamed
response; early TTFB can be a skeleton and is not presented as usable content.

| Route | TTFB before → after | Document before → after | LCP before → after |
| --- | ---: | ---: | ---: |
| `/` | 369 → 320 | 370 → 320 | 448 → 392 |
| `/feed` | 1,618 → 344 | 3,435 → 2,539 | 4,104 → 2,686 |
| `/profile` | 1,445 → 12 | 2,001 → 1,253 | 2,176 → 864 |
| `/discover` | 1,733 → 12 | 1,996 → 1,060 | 2,130 → 1,100 |
| `/collaborate` | 1,425 → 14 | 1,609 → 1,186 | 1,798 → 1,228 |
| `/messages` | 1,520 → 14 | 1,545 → 948 | 1,736 → 1,076 |
| active DM | 1,466 → 10 | 1,655 → 812 | 1,826 → 956 |
| another profile | 1,427 → 9 | 2,169 → 2,342 | 2,340 → 1,488 |

The optimized feed's two LCP samples were 3,924 ms cold and 1,448 ms warm; it does
not consistently meet 2.5 seconds cold yet. Another profile shows useful identity
earlier (LCP improved), but its complete streamed response remains 2.1–2.6 seconds
and did not improve. Request counts rose because formerly blocking header reads are
now visible client requests; this is an intentional latency tradeoff, not a request
count improvement.

Browser Resource Timing cannot report cross-origin Supabase byte sizes without
`Timing-Allow-Origin`, so authenticated byte totals are observable lower bounds and
must not be compared as total transfer. The public landing page's observable encoded
payload fell from 487,489 to 298,961 bytes after deferring the crypto bundle. The
measured 2,121,613-byte post image was delivered as a 68,294-byte WebP (96.8% smaller):
1,159 ms on the first transform and 0 ms from the private browser cache.

Raw sanitized measurements are in `performance-baseline.json` and
`performance-after.json`. Queries in those artifacts contain no URL query strings,
message content, encryption keys or browser credentials.

## Database review

No migration/index was added: current migrations already cover the observed access
patterns (`social_posts` author/time, follows, conversation/time, visible
notifications, collaboration status/time and trigram student search). Adding
duplicates would increase write cost without evidence of benefit.

A disposable PGlite database applying all 20 migrations, populated with 1,000
verified profiles, 5,000 posts, 15,000 likes and 1,000 comments produced:

- ranked feed, 12 rows: 21–25 ms
- profile posts: 0–1 ms
- search, 31 rows: 24–25 ms
- people recommendations, 4 rows: 28–29 ms
- notifications, 8 rows: 0–1 ms

This validates query shape and index use, but is not a substitute for hosted
Supabase latency, concurrency or production data-distribution load testing. The full
sanitized plans are in `performance-query-plans.json`.

## Verification and remaining risk

- Passed: Next.js 16.3.3 Turbopack production build, TypeScript, ESLint, 30 unit
  tests, 20 isolated migration/RLS/admin scenarios and `npm audit` (0 known issues at
  install time). E2EE round-trip, signed metadata/ciphertext tamper rejection and
  missing-key behavior have explicit regression tests.
- Browser-smoked without writes: authenticated/protected Feed, own and other
  profiles, Discover filtering, Collaboration management, notification dropdown,
  Create Post form, Messages/active DM, lazy group picker and modal reset. New route
  skeletons were observed immediately and resolved to content. The private image
  endpoint returned 401 without a session. Browser warnings/errors were empty.
- Not represented as verified: two-account realtime messaging, live create/like/
  comment/follow flows, live media publication, Connect-for-this and logout were not
  mutated during this audit to avoid changing existing users' data. These need a
  dedicated disposable test account pair.
- Existing E2EE limitation: a newly added/replaced device has no envelope for older
  messages, so history can show a missing-key state. Account recovery and group
  membership/key rotation remain architectural follow-up work.
- Remaining performance risks: cold feed/media transformation, another profile's
  secondary streamed data, Supabase round trips, and on-demand Sharp CPU under high
  concurrency. For beta, pre-generated thumbnails/object variants and hosted load
  testing should be the next performance work—not more speculative indexes.

## Readiness

Reasonably ready for a controlled 100-user beta after the disposable two-account
flow matrix passes. It is not yet justified as ready for 1,000 simultaneously active
users: run hosted load tests, define latency/error budgets, monitor Supabase pool and
Sharp CPU, and close the E2EE recovery/rotation limitations first.

Authenticated data stays request-scoped, RLS remains enforced, and no live database
migration is applied as part of the source-only optimization without coordination.
