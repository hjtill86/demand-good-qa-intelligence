import { NextResponse } from "next/server";
import { getDataScope, getSupabaseAdmin } from "../../../../lib/supabase-server";

const resourceTypes = new Set(["metrics", "actions", "suppliers", "regulatory", "licenses", "digest"]);
const typeMap = { metrics: "metric", actions: "action", suppliers: "supplier", regulatory: "regulatory", licenses: "license", digest: "digest" } as const;

export async function GET(_: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!resourceTypes.has(resource)) return NextResponse.json({ error: "Unsupported resource." }, { status: 404 });
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("dgqi_records").select("id,payload,created_at,updated_at").eq("organization_id", scope.organizationId).eq("record_type", typeMap[resource as keyof typeof typeMap]).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!resourceTypes.has(resource)) return NextResponse.json({ error: "Unsupported resource." }, { status: 404 });
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
  const { data, error } = await supabase.from("dgqi_records").insert({ organization_id: scope.organizationId, record_type: typeMap[resource as keyof typeof typeMap], payload, created_by: scope.userId }).select("id,payload,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!resourceTypes.has(resource)) return NextResponse.json({ error: "Unsupported resource." }, { status: 404 });
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  const id = new URL(request.url).searchParams.get("id");
  if (!scope) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const { error } = await supabase.from("dgqi_records").delete().eq("id", id).eq("organization_id", scope.organizationId).eq("record_type", typeMap[resource as keyof typeof typeMap]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
