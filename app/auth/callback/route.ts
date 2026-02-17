import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback route — exchanges code for session.
 * New users (?next=/onboarding) land on the install page.
 * Returning users go to /dashboard (or whatever ?next= says).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this is a brand-new user (created_at === last_sign_in_at within 10s)
      const user = data?.user;
      const isNewUser =
        user &&
        user.created_at &&
        user.last_sign_in_at &&
        Math.abs(
          new Date(user.last_sign_in_at).getTime() -
            new Date(user.created_at).getTime()
        ) < 10000;

      const destination = isNewUser ? "/onboarding" : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`);
}
