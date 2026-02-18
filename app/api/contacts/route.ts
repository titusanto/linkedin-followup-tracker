import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Contact } from "@/lib/types";

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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * GET /api/contacts
 * Returns all contacts for the authenticated user.
 * Optional query params:
 *   ?status=Connected   — filter by status
 *   ?search=John        — search by name or company
 */
export async function GET(request: Request) {
  const hdrs = corsHeaders(request);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { error: "Unauthorized" },
        { status: 401, headers: hdrs }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,company.ilike.%${search}%,role.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json<ApiResponse>(
        { error: error.message },
        { status: 500, headers: hdrs }
      );
    }

    return NextResponse.json<ApiResponse<Contact[]>>(
      { data: data ?? [] },
      { headers: hdrs }
    );
  } catch (err) {
    console.error("contacts GET unhandled:", err);
    return NextResponse.json<ApiResponse>(
      { error: "Internal server error" },
      { status: 500, headers: hdrs }
    );
  }
}
