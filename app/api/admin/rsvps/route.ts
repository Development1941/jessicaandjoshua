import { NextResponse } from "next/server";
import { isAdminPhone } from "@/lib/admin";
import { getGuestSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

type RsvpRow = {
  guest_id: string | null;
  guest_phone: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_names: string | null;
  brunch_attending: string | null;
  brunch_kids: string | null;
  bar_attending: string | null;
  dietary: string | null;
  jukebox_track: string | null;
  jukebox_artist: string | null;
  spotify_url: string | null;
  created_at: string;
  updated_at: string;
};

type GuestRow = {
  id: string;
  addressee: string | null;
  email: string | null;
  tier: string | null;
  invite_label?: string | null;
};

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

function inviteLabel(guest: GuestRow | undefined): string {
  if (!guest) return "";
  if (guest.invite_label) return guest.invite_label;
  if (guest.tier === "brunch") return "Brunch only";
  if (guest.tier === "night") return "Bar only";
  if (guest.tier === "both") return "Every event";
  return guest.tier || "";
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export async function GET() {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in with the admin phone number first." },
      { status: 401 }
    );
  }
  if (!isAdminPhone(session.phone)) {
    return NextResponse.json(
      { error: "This phone cannot download RSVP responses." },
      { status: 403 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: rsvps, error } = await admin
      .from("rsvps")
      .select(
        "guest_id, guest_phone, guest_first_name, guest_last_name, guest_names, brunch_attending, brunch_kids, bar_attending, dietary, jukebox_track, jukebox_artist, spotify_url, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let guestResult = await admin
      .from("guests")
      .select("id, addressee, email, tier, invite_label");
    if (guestResult.error && /invite_label/i.test(guestResult.error.message)) {
      guestResult = await admin.from("guests").select("id, addressee, email, tier");
    }
    if (guestResult.error) {
      return NextResponse.json({ error: guestResult.error.message }, { status: 500 });
    }

    const guests = new Map<string, GuestRow>();
    for (const guest of (guestResult.data || []) as GuestRow[]) {
      guests.set(guest.id, guest);
    }

    const lines = [csvRow(COLUMNS)];
    for (const row of (rsvps || []) as RsvpRow[]) {
      const guest = row.guest_id ? guests.get(row.guest_id) : undefined;
      lines.push(
        csvRow([
          guest?.addressee || "",
          row.guest_names || "",
          row.guest_first_name || "",
          row.guest_last_name || "",
          row.guest_phone || "",
          guest?.email || "",
          inviteLabel(guest),
          row.brunch_attending || "",
          row.brunch_kids || "",
          row.bar_attending || "",
          row.dietary || "",
          row.jukebox_track || "",
          row.jukebox_artist || "",
          row.spotify_url || "",
          row.created_at || "",
          row.updated_at || "",
        ])
      );
    }

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
