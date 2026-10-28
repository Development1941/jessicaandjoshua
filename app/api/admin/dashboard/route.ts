import { NextResponse } from "next/server";
import { adminDenied, loadAdminRecords } from "@/lib/admin-data";

export async function GET() {
  const denied = await adminDenied();
  if (denied) return denied;

  try {
    const records = await loadAdminRecords();
    return NextResponse.json(records, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
