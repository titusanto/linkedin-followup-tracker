import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, UpdateContactPayload } from "@/lib/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Extension-Api-Secret",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body: UpdateContactPayload = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { error: "Contact ID is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Build update payload — only include defined fields
    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      // Auto-set timestamps when status changes
      const now = new Date().toISOString();
      if (updates.status === "Connected" && !updates.connected_at) {
        updateData.connected_at = now;
      }
      if (updates.status === "Messaged" && !updates.last_messaged_at) {
        updateData.last_messaged_at = now;
        // Auto-schedule follow-up 2 days from now if not set
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + 2);
        updateData.next_followup = followupDate.toISOString().split("T")[0];
      }
      if (updates.status === "Replied" && !updates.last_replied_at) {
        updateData.last_replied_at = now;
      }
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.next_followup !== undefined) updateData.next_followup = updates.next_followup;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.connected_at !== undefined) updateData.connected_at = updates.connected_at;
    if (updates.last_messaged_at !== undefined) updateData.last_messaged_at = updates.last_messaged_at;
    if (updates.last_replied_at !== undefined) updateData.last_replied_at = updates.last_replied_at;
    if (updates.viewed_profile_at !== undefined) updateData.viewed_profile_at = updates.viewed_profile_at;
    if (updates.auto_followup_days !== undefined) updateData.auto_followup_days = updates.auto_followup_days;

    const { data, error } = await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json<ApiResponse>(
      { data },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("contact update unhandled:", err);
    return NextResponse.json<ApiResponse>(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
