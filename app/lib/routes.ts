const protectedRoots = [
  "/feed",
  "/profile",
  "/students",
  "/messages",
  "/post",
  "/discover",
  "/collaborate",
  "/collaboration",
  "/connections",
  "/notifications",
  "/admin",
  "/report-problem",
  "/onboarding",
  "/pending-approval",
];

export function isProtectedPath(pathname: string) {
  if (pathname === "/admin/login") return false;
  return protectedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
