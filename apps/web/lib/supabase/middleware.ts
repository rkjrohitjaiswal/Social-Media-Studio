import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const hasDevBypassParam = request.nextUrl.searchParams.get("dev_bypass") === "true";
  const hasDevBypassCookie = request.cookies.get("dev_bypass")?.value === "true";
  const isDevBypass = process.env.NODE_ENV === "development" && (hasDevBypassCookie || hasDevBypassParam);

  if (hasDevBypassParam && process.env.NODE_ENV === "development") {
    supabaseResponse.cookies.set("dev_bypass", "true", { path: "/", maxAge: 86400 });
  }

  const isProtectedPath = [
    "/dashboard",
    "/create",
    "/goals",
    "/tools",
    "/templates",
    "/saved",
    "/campaigns",
    "/approvals",
    "/calendar",
    "/published",
    "/analytics",
    "/brand",
    "/settings",
  ].some((path) => request.nextUrl.pathname.startsWith(path));

  const isAuthPath = ["/login", "/signup", "/forgot-password"].includes(
    request.nextUrl.pathname
  );

  // If user is NOT authenticated and attempting to access protected route -> redirect to /login
  if (!user && !isDevBypass && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user IS authenticated and trying to access auth pages -> redirect to /dashboard
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
