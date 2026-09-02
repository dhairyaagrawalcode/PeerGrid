import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/app/lib/routes";
import { accessDestination } from "@/app/lib/platform-access";

export async function updateSession(request: NextRequest) {
  // Admin has a separate password session. Its protected route-group layout and every
  // admin action validate that session server-side; student Auth is not an admin gate.
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    return NextResponse.next({ request });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  function redirectTo(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  if (!user && isProtectedPath(pathname)) return redirectTo(pathname.startsWith("/admin") ? "/auth/login" : "/");

  // Auth endpoints must stay reachable, including sign-in for the administrator.
  const accessPage = ["/maintenance", "/account-restricted", "/service-unavailable"].includes(pathname);
  if (!pathname.startsWith("/auth/") && !accessPage && (pathname === "/" || isProtectedPath(pathname))) {
    const { data: access, error } = await supabase.rpc("get_platform_access");
    const destination = accessDestination(error ? null : access, !!user);
    if (destination) return redirectTo(destination);
  }
  return response;
}
