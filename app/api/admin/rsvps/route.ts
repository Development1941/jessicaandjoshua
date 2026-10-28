import { NextResponse } from "next/server";
import { adminDenied, loadAdminRecords, type AdminRsvp } from "@/lib/admin-data";

const COLUMNS = [
  "Family",
  "Guest",
  "First name",
  "Last name",
  "Phone",
  "Email",
  "Invite",
  "Brunch attending",
  "Brunch kids",
  "Bar attending",
  "Dietary",
  "Song",
  "Artist",
  "Spotify URL",
  "Submitted",
  "Updated",
];

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

function rsvpValues(row: AdminRsvp): string[] {
  return [
    row.family,
    row.guest,
    row.firstName,
    row.lastName,
    row.phone,
    row.email,
    row.invite,
    row.brunchAttending,
    row.brunchKids,
    row.barAttending,
    row.dietary,
    row.song,
    row.artist,
    row.spotifyUrl,
    row.submitted,
    row.updated,
  ];
}

export async function GET() {
  const denied = await adminDenied();
  if (denied) return denied;

  try {
    const { rsvps } = await loadAdminRecords();
    const lines = [csvRow(COLUMNS), ...rsvps.map((row) => csvRow(rsvpValues(row)))];
    const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wedding-rsvps-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export RSVPs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
