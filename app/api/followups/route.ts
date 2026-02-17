import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Contact } from "@/lib/types";
import { format } from "date-fns";

/**
 * GET /api/followups
 * Returns contacts with follow-up dates that are today or overdue.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>({ error: "Unauthorized" }, { status: 401 });
    }

    const today = format(new Date(), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .lte("next_followup", today) // due today or overdue
      .not("next_followup", "is", null)
      .order("next_followup", { ascending: true });

    if (error) {
      return NextResponse.json<ApiResponse>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<Contact[]>>({ data: data ?? [] });
  } catch (err) {
    console.error("followups GET unhandled:", err);
    return NextResponse.json<ApiResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
