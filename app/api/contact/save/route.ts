import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SaveContactPayload, ApiResponse, Contact } from "@/lib/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Extension-Api-Secret",
};

// Status ordering — never downgrade to a lower status
const STATUS_ORDER = [
  "Pending", "Connected", "Messaged", "Replied",
  "Meeting Booked", "Closed", "Lost",
] as const;

function statusRank(s: string): number {
  const idx = STATUS_ORDER.indexOf(s as typeof STATUS_ORDER[number]);
  return idx === -1 ? -1 : idx;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/contact/save
 *
 * Upserts a contact for a given user_id + linkedin_url.
 * - Extension sends Extension-Api-Secret + user_id in payload.
 * - Dashboard uses session cookie.
 *
 * Key behaviours:
 * 1. Never downgrades status (Messaged → Pending is ignored).
 * 2. Same LinkedIn account dedup: if a contact with the same linkedin_url
 *    already exists for this user_id, it loads and merges rather than creating
 *    a duplicate.
 * 3. Auto-schedules next_followup 2 days after Messaged.
 * 4. Only updates timestamps if the new value is set; never clears existing ones.
 */
export async function POST(request: Request) {
  try {
    const secret = request.headers.get("Extension-Api-Secret");
    const isExtension = !!secret;

    if (isExtension && secret !== process.env.EXTENSION_API_SECRET) {
      return NextResponse.json<ApiResponse>(
        { error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const payload = body as SaveContactPayload & { user_id?: string };

    let userId: string | null = null;

    if (isExtension) {
      userId = payload.user_id ?? null;
      if (!userId) {
        return NextResponse.json<ApiResponse>(
          { error: "user_id is required" },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    } else {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json<ApiResponse>(
          { error: "Unauthorized" },
          { status: 401, headers: CORS_HEADERS }
        );
      }
      userId = user.id;
    }

    // Use admin client for extension (bypasses RLS), server client for dashboard
    const db = isExtension
      ? createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : await createClient();

    if (!payload.name || !payload.linkedin_url) {
      return NextResponse.json<ApiResponse>(
        { error: "name and linkedin_url are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const now = new Date().toISOString();
    const incomingStatus = payload.status ?? "Pending";

    // ── Check if this LinkedIn URL is already owned by a DIFFERENT user ───────
    // Use admin client for cross-user check (bypasses RLS)
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: otherUserContact } = await adminDb
      .from("contacts")
      .select("user_id, name")
      .eq("linkedin_url", payload.linkedin_url)
      .neq("user_id", userId)
      .maybeSingle();

    if (otherUserContact) {
      // This LinkedIn profile is already tracked by someone else — block it
      return NextResponse.json<ApiResponse>(
        { error: "already_claimed" },
        { status: 409, headers: CORS_HEADERS }
      );
    }

    // ── Fetch existing record (same user + same linkedin_url) ────────────────
    const { data: existing } = await db
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("linkedin_url", payload.linkedin_url)
      .maybeSingle();

    // ── Determine final status (never downgrade) ──────────────────────────────
    let finalStatus = incomingStatus;
    if (existing?.status) {
      const existingRank = statusRank(existing.status);
      const incomingRank = statusRank(incomingStatus);
      if (existingRank > incomingRank) {
        finalStatus = existing.status; // keep higher status
      }
    }

    // ── Auto follow-up: 2 days after first message ────────────────────────────
    let autoFollowup: string | null = null;
    if (incomingStatus === "Messaged" && !existing?.next_followup) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      autoFollowup = d.toISOString().split("T")[0];
    }

    // ── Build upsert data — only set timestamps if provided, never clear ──────
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      name: payload.name,
      linkedin_url: payload.linkedin_url,
      // Prefer incoming profile data, fall back to existing
      company:       payload.company       ?? existing?.company       ?? null,
      role:          payload.role          ?? existing?.role          ?? null,
      location:      payload.location      ?? existing?.location      ?? null,
      profile_image: payload.profile_image ?? existing?.profile_image ?? null,
      email:         payload.email         ?? existing?.email         ?? null,
      phone:         payload.phone         ?? existing?.phone         ?? null,
      status: finalStatus,
      updated_at: now,
    };

    // Timestamps: only set if payload provides them; never overwrite with null
    if (payload.connection_sent_at) {
      upsertData.connection_sent_at = payload.connection_sent_at;
    } else if (existing?.connection_sent_at) {
      upsertData.connection_sent_at = existing.connection_sent_at;
    }

    if (payload.last_messaged_at) {
      upsertData.last_messaged_at = payload.last_messaged_at;
    } else if (existing?.last_messaged_at) {
      upsertData.last_messaged_at = existing.last_messaged_at;
    }

    if (payload.last_replied_at) {
      upsertData.last_replied_at = payload.last_replied_at;
    } else if (existing?.last_replied_at) {
      upsertData.last_replied_at = existing.last_replied_at;
    }

    // Auto followup only if newly needed
    if (autoFollowup) {
      upsertData.next_followup = autoFollowup;
    } else if (existing?.next_followup) {
      upsertData.next_followup = existing.next_followup;
    }

    const { data, error } = await db
      .from("contacts")
      .upsert(upsertData, { onConflict: "user_id,linkedin_url", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      console.error("contact/save error:", error);
      return NextResponse.json<ApiResponse>(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json<ApiResponse<Contact>>(
      { data },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("contact/save unhandled:", err);
    return NextResponse.json<ApiResponse>(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
