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

  // Validate/refresh the signed JWT here. Server pages/actions still use getUser
  // and fresh platform access checks; claims alone never authorize private data.
  let signedIn = false;
  let staleSession = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && !!data?.claims?.sub;
    staleSession = error?.code === "refresh_token_not_found";
  } catch (caught) {
    const authError = caught as { code?: unknown; message?: unknown };
    staleSession = authError.code === "refresh_token_not_found"
      || (typeof authError.message === "string" && authError.message.includes("Refresh Token Not Found"));
  }
  const pathname = request.nextUrl.pathname;
  function clearStaleAuthCookies(target: NextResponse) {
    if (!staleSession) return;
    request.cookies.getAll().forEach((cookie) => {
      if (/^sb-[^-]+-auth-token(?:\.\d+)?$/.test(cookie.name)) {
        target.cookies.set(cookie.name, "", { expires: new Date(0), httpOnly: true, path: "/", sameSite: "lax" });
      }
    });
  }
  function redirectTo(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    clearStaleAuthCookies(redirectResponse);
    return redirectResponse;
  }
  if (!signedIn && isProtectedPath(pathname)) return redirectTo("/");

  // Auth endpoints must stay reachable, including sign-in for the administrator.
  // Protected pages/actions enforce this in getAuthContext (and database RLS/API
  // hooks). Only the public landing page needs the additional proxy check.
  if (pathname === "/") {
    const { data: access, error } = await supabase.rpc("get_platform_access");
    const destination = accessDestination(error ? null : access, signedIn);
    if (destination) return redirectTo(destination);
  }
  clearStaleAuthCookies(response);
  return response;
}
