import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  let hasSupabaseSession = false;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      hasSupabaseSession = true;
    }
  } catch {
    // Fallback if Supabase not configured
  }

  const hasDemoCookie =
    request.cookies.get("caca_demo_session")?.value === "true";
  const isAuthenticated = hasSupabaseSession || hasDemoCookie;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedRoute =
    pathname.startsWith("/feed") ||
    pathname.startsWith("/discover") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/teams") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/onboarding");

  // If user is already authenticated and visits login/signup, redirect to feed
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // If unauthenticated user attempts to access protected routes, redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
