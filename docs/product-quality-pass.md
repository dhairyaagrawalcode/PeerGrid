# PeerGrid product-quality pass — 2026-09-08

This pass preserved the existing visual system and architecture. It focused on
the requested shared surfaces, database contracts, E2EE message path and loading
behavior. No live user-content mutation was performed. The schema migration was
applied to the linked Supabase project after local verification.

## Implemented

1. The public landing header and footer link to the configured PeerGrid GitHub repository.
2. Post images, videos and composer previews preserve their source aspect ratio,
   stay centered and have responsive viewport-height caps rather than cropping or
   stretching portrait content.
3. Authenticated routes retain destination-specific skeletons; Admin now has a
   dashboard-shaped loader. Post publication and encrypted-message attachments
   expose operation-specific progress. Secondary feed/profile regions continue to
   stream independently.
4. Collaboration cards retain one role-aware CTA and the existing private
   management dialog. A compact `Post → Connect → Verify` guide now explains the
   lifecycle to a first-time creator without adding controls to public cards.
5. Admin user search now combines profile presence, campus, batch, access state,
   verification, signup/active ranges, activity and sorting in Postgres. Counts
   are aggregated once, results are paginated/capped, and filter options come from
   the database rather than loading all users into the browser.
6. The Admin overview groups account, activity and operational health, links to
   unresolved work and shows a recent audit trail. Its layout stacks cleanly on
   narrow screens.
7. Sent messages use compact accent bubbles on the right; received messages use
   neutral bubbles on the left. Group sender names, timestamps, sending/read state,
   composer sizing and mobile behavior remain compact. On mobile, an open thread
   uses the full viewport without the application header or bottom navigation.
8. DM images, videos and documents are encrypted in the browser with a fresh
   XChaCha20-Poly1305 key/nonce. The key and original metadata live only inside the
   signed E2EE message. Storage receives an opaque `.bin`; authorized devices fetch
   a short-lived private URL and decrypt locally. Off-screen attachments are not
   downloaded until near the viewport.
9. The pass kept explicit Supabase projections, pagination and existing streaming.
   Realtime subscriptions have matching cleanup. A stale/invalid Supabase refresh
   cookie now fails closed and is cleared without logging token details.
10. Authors can delete their own posts (and uploaded post media) after confirmation.
    Message senders can delete their own encrypted messages for everyone; attached
    ciphertext is removed after the database authorizes the sender-only deletion.

## Security and database

Migration `20260905000000_product_quality_pass.sql` adds three nullable attachment
metadata columns, consistency/path constraints, a unique partial index, the private
`message-media` bucket, member-only storage policies, admin filter indexes and
service-role-only admin RPCs. The message sender remains enforced by the existing
message insert RLS; storage upload additionally binds the first path segment to
`auth.uid()` and requires current conversation membership. Download requires a
message reference plus current membership.

Attachment MIME and size are allowlisted client-side and constrained by the bucket
and message metadata. Files are capped at 25 MB, names are normalized before being
placed in encrypted metadata, stored objects use UUID-only paths, and no executable
MIME is accepted. Plaintext, attachment keys and signed URLs are not logged.

The private bucket intentionally cannot inspect the original MIME because it only
receives ciphertext. Therefore client MIME validation is a UX control; the critical
server controls are byte limit, opaque content type, path binding, membership and
authenticated decryption.

Migration `20260908000000_message_deletion.sql` adds a sender-only message DELETE
policy and a security-definer trigger that recomputes conversation last-message
metadata from the remaining encrypted rows. Conversation membership and verified
student checks remain mandatory; recipients and group admins cannot delete messages
on behalf of another sender.

## Verification

- 49 automated tests pass, including E2EE round-trip/tamper checks, loading-route
  coverage, responsive layout contracts and product-quality regressions.
- Five isolated database scenarios pass: migration execution, private bucket and
  policies, attachment constraints/member access, compound admin filters and
  sender-only message deletion with last-message metadata resynchronization.
- TypeScript, ESLint, `git diff --check`, dependency audit (zero known production
  vulnerabilities) and the Next.js production webpack build pass.
- The default Turbopack build was also attempted, but its internal CSS worker could
  not bind a local port in the restricted test host. The webpack production build
  compiled all 21 static pages and every dynamic route successfully.
- The landing page was browser-checked at 360, 390, 430, 768, 1366 and 1920 px with
  no horizontal overflow or console errors. The GitHub link was visible at each
  width. A stale protected session redirected safely without a server overlay.

Detailed sanitized numbers are in `product-quality-performance.json`. The public
landing warm mean was TTFB 340 ms, document 341 ms and LCP 396 ms, versus the prior
optimized 320/320/392 ms. This is effectively flat, so no speedup is claimed. The
authenticated production route matrix could not be repeated because the isolated
browser was signed out; the prior measurements remain in `performance-audit.md`.

## Deployment status and remaining risk

Migration `20260905000000_product_quality_pass.sql` was successfully applied to
the linked Supabase project on 8 September 2026. The linked migration list reports
local and remote version `20260905000000` as aligned. The later
`20260908000000_message_deletion.sql` migration is locally verified but still needs
to be pushed from an authenticated Supabase CLI session before message deletion is
available on the hosted project: `npx supabase db push --linked`.

After restarting the development server, smoke-test one direct and one group
conversation with two disposable users: text, image, video, document, realtime
receive and read state. Also verify Admin filters after unlocking `/admin`.

Known E2EE limitations remain: a new device cannot decrypt older messages unless it
already has an envelope; there is no account key-recovery/key-transparency system;
group membership changes do not re-encrypt history; and a browser crash between
object upload and message insertion can leave an unreferenced encrypted object.
A scheduled orphan cleanup, multi-device recovery and formal crypto review should
precede a broad production claim. Hosted load testing is still required before a
1,000-concurrent-user claim, especially for cold feed queries and image transforms.
