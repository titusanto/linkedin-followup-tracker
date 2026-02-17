import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (for use in Client Components and hooks).
 * Safe to use in the browser — uses the anon key only.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
