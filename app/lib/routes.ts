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
];

export function isProtectedPath(pathname: string) {
  return protectedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
