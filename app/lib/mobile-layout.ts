/** Shared by the authenticated shell and its streaming fallback. */
export function mobilePage(path: string) {
  if (/^\/messages\/[^/]+$/.test(path)) return { title: "Conversation", back: "/messages", immersive: true };
  if (/^\/students\/[^/]+$/.test(path)) return { title: "Profile", back: "/discover", immersive: false };
  if (path === "/feed") return { title: "Home", back: null, immersive: false };
  const routes: Record<string, [string, string]> = {
    "/discover": ["Discover", "/feed"],
    "/post": ["New post", "/feed"],
    "/collaborate": ["Collaborations", "/feed"],
    "/collaborate/new": ["New collaboration", "/collaborate"],
    "/profile": ["Profile", "/feed"],
    "/profile/edit": ["Edit profile", "/profile"],
    "/messages": ["Messages", "/profile"],
    "/notifications": ["Notifications", "/feed"],
    "/connections": ["Your network", "/profile"],
    "/report-problem": ["Report a problem", "/profile"],
    "/collaboration": ["Collaborations", "/feed"],
  };
  const [title, back] = routes[path] ?? ["Student profile", "/discover"];
  return { title, back, immersive: false };
}
