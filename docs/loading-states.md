# Route-specific loading states

The generic loader appeared first because the outer authentication `Suspense`
boundary in the platform layout wrapped every page. A route's `loading.tsx`
only becomes visible inside that wrapper, so adding leaf loaders alone did not
fix initial page refreshes. Feed/profile streaming sections also reused a
generic three-block placeholder.

## Resolution

- The outer shell now reserves the real header/content space and chooses a
  layout using the current pathname. It does not render any private data.
- Each authenticated page has a matching `loading.tsx`, including nested edit
  profile and active conversation routes, not just their parent loader.
- Feed profile, posts, suggested people and collaborations have separate
  placeholders. Profile confirmations, proof of work and posts do too.
- Admin routes have a responsive dashboard-shaped fallback, while post and
  encrypted-message uploads expose their own upload/decryption progress instead
  of substituting an unrelated page skeleton.
- Layout widths/breakpoints follow the actual components. The active-chat
  skeleton reserves room for the mobile bottom navigation.
- Placeholders use existing neutral tokens, no extra dependencies or requests,
  a screen-reader loading status, and reduced-motion-aware animation.
- Authentication, queries, actual page styling and user actions are unchanged.

## Verification

- Typecheck, lint, production build and the current automated suite pass,
  including regression tests for route coverage, nested layouts, admin loading,
  streaming sections and upload/decryption feedback.
- Browser-checked first-render layout markers across Feed, Profile, Edit
  Profile, Discover, Collaboration, Messages, Notifications, Connections,
  Report Problem and Create Post; none used the generic placeholder.
- Checked the distinct inbox/active-chat visuals and narrow-screen layouts.
- Signed-out navigation follows the existing login redirect with no private
  content exposed; the route-coverage tests also verify the authenticated
  boundary and component-specific fallback wiring.

When adding a platform route, add its loader and update
`app/lib/loading-layout.ts`; the route-coverage test catches omissions.
