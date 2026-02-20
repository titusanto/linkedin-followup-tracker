import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SaveContactPayload, ApiResponse, Contact } from "@/lib/types";

// Chrome extensions send from a chrome-extension:// origin.
// credentials:"include" requires a non-wildcard Allow-Origin.
const ALLOWED_ORIGINS = [
  "https://linkedin-followup-tracker.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed =
    origin.startsWith("chrome-extension://") ||
    ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Status ordering — never downgrade to a lower status
const STATUS_ORDER = [
  "Pending", "Connected", "Messaged", "Replied",
  "Meeting Booked", "Closed", "Lost",
] as const;

function statusRank(s: string): number {
  const idx = STATUS_ORDER.indexOf(s as typeof STATUS_ORDER[number]);
  return idx === -1 ? -1 : idx;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * POST /api/contact/save
 *
 * Auth: Supabase session cookie only — no API secret, no User ID needed.
 * The extension sends credentials:"include" so the browser forwards the
 * dashboard's session cookie automatically.
 *
 * Behaviours:
 * 1. Never downgrades status (Messaged → Pending is ignored).
 * 2. Same LinkedIn URL dedup per user.
 * 3. Auto-schedules next_followup 2 days after Messaged.
 * 4. Only updates timestamps if provided; never clears existing ones.
 */
export async function POST(request: Request) {
  const hdrs = corsHeaders(request);
  try {
    // Always use session cookie — works for both dashboard and extension
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { error: "not_logged_in" },
        { status: 401, headers: hdrs }
      );
    }

    const userId = user.id;
    const body = await request.json();
    const payload = body as SaveContactPayload;

    if (!payload.name || !payload.linkedin_url) {
      return NextResponse.json<ApiResponse>(
        { error: "name and linkedin_url are required" },
        { status: 400, headers: hdrs }
      );
    }

    const now = new Date().toISOString();
    const incomingStatus = payload.status ?? "Pending";

    // ── Check if this LinkedIn URL is already owned by a DIFFERENT user ───────
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: otherUserContact } = await adminDb
      .from("contacts")
      .select("user_id")
      .eq("linkedin_url", payload.linkedin_url)
      .neq("user_id", userId)
      .maybeSingle();

    if (otherUserContact) {
      return NextResponse.json<ApiResponse>(
        { error: "already_claimed" },
        { status: 409, headers: hdrs }
      );
    }

    // ── Fetch existing record (same user + same linkedin_url) ─────────────────
    // LinkedIn uses two URL formats: encoded IDs (/in/ACoAA...) and readable
    // slugs (/in/john-doe-123/). The messaging page captures encoded IDs while
    // visiting the profile page captures readable slugs. Both may refer to the
    // same person, so we also try a name-based fallback to prevent duplicates.
    let existing: Contact | null = null;
    const { data: byUrl } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("linkedin_url", payload.linkedin_url)
      .maybeSingle();
    existing = byUrl ?? null;

    // Fallback: find by name if URL didn't match (handles encoded ↔ slug mismatch)
    if (!existing && payload.name) {
      const cleanName = payload.name.split(" ").slice(0, 2).join(" "); // first + last
      const { data: byName } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", `${cleanName}%`)
        .maybeSingle();
      if (byName) {
        existing = byName;
        // Keep the existing URL (the one already in the DB) for the upsert
        payload.linkedin_url = byName.linkedin_url;
      }
    }

    // ── Determine final status (never downgrade) ──────────────────────────────
    let finalStatus = incomingStatus;
    if (existing?.status) {
      if (statusRank(existing.status) > statusRank(incomingStatus)) {
        finalStatus = existing.status;
      }
    }

    // ── Auto follow-up: 2 days after first message ────────────────────────────
    let autoFollowup: string | null = null;
    if (incomingStatus === "Messaged" && !existing?.next_followup) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      autoFollowup = d.toISOString().split("T")[0];
    }

    // ── Build upsert — only set timestamps if provided, never clear ───────────
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      name: payload.name,
      linkedin_url: payload.linkedin_url,
      company:       payload.company       ?? existing?.company       ?? null,
      role:          payload.role          ?? existing?.role          ?? null,
      location:      payload.location      ?? existing?.location      ?? null,
      profile_image: payload.profile_image ?? existing?.profile_image ?? null,
      email:         payload.email         ?? existing?.email         ?? null,
      phone:         payload.phone         ?? existing?.phone         ?? null,
      status: finalStatus,
      updated_at: now,
    };

    if (payload.connection_sent_at) upsertData.connection_sent_at = payload.connection_sent_at;
    else if (existing?.connection_sent_at) upsertData.connection_sent_at = existing.connection_sent_at;

    if (payload.last_messaged_at) upsertData.last_messaged_at = payload.last_messaged_at;
    else if (existing?.last_messaged_at) upsertData.last_messaged_at = existing.last_messaged_at;

    if (payload.last_replied_at) upsertData.last_replied_at = payload.last_replied_at;
    else if (existing?.last_replied_at) upsertData.last_replied_at = existing.last_replied_at;

    if (autoFollowup) upsertData.next_followup = autoFollowup;
    else if (existing?.next_followup) upsertData.next_followup = existing.next_followup;

    const { data, error } = await supabase
      .from("contacts")
      .upsert(upsertData, { onConflict: "user_id,linkedin_url", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      console.error("contact/save error:", error);
      return NextResponse.json<ApiResponse>(
        { error: error.message },
        { status: 500, headers: hdrs }
      );
    }

    return NextResponse.json<ApiResponse<Contact>>(
      { data },
      { status: 200, headers: hdrs }
    );
  } catch (err) {
    console.error("contact/save unhandled:", err);
    return NextResponse.json<ApiResponse>(
      { error: "Internal server error" },
      { status: 500, headers: hdrs }
    );
  }
}
