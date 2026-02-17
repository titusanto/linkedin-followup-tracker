import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Contact } from "@/lib/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Extension-Api-Secret",
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/contacts
 * Returns all contacts for the authenticated user.
 * Optional query params:
 *   ?status=Connected   — filter by status
 *   ?search=John        — search by name or company
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,company.ilike.%${search}%,role.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json<ApiResponse>(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json<ApiResponse<Contact[]>>(
      { data: data ?? [] },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("contacts GET unhandled:", err);
    return NextResponse.json<ApiResponse>(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
