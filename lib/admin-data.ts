import { NextResponse } from "next/server";
import { isAdminPhone } from "@/lib/admin";
import { getGuestSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export type AdminRsvp = {
  family: string;
  guest: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  invite: string;
  brunchAttending: string;
  brunchKids: string;
  barAttending: string;
  dietary: string;
  song: string;
  artist: string;
  spotifyUrl: string;
  submitted: string;
  updated: string;
};

export type AdminAttendee = {
  family: string;
  guest: string;
  phone: string;
  email: string;
  invite: string;
};

type RsvpRow = {
  guest_id: string | null;
  guest_phone: string | null;
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
  created_at: string | null;
  updated_at: string | null;
};

type GuestRow = {
  id: string;
  addressee: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  tier: string | null;
  invite_label?: string | null;
  invited_brunch?: boolean | null;
  invited_bar?: boolean | null;
};

function inviteLabel(guest: GuestRow | undefined): string {
  if (!guest) return "";
  if (guest.invite_label) return guest.invite_label;
  if (guest.tier === "brunch") return "Brunch only";
  if (guest.tier === "night") return "Bar only";
  if (guest.tier === "both") return "Every event";
  return guest.tier || "";
}

function guestLabel(guest: GuestRow): string {
  const named = (guest.name || "").trim();
  if (named && named !== "Guest") return named;
  const person = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
  return person || guest.addressee || "";
}

export async function adminDenied(): Promise<NextResponse | null> {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in with the admin phone number first." },
      { status: 401 }
    );
  }
  if (!isAdminPhone(session.phone)) {
    return NextResponse.json(
      { error: "This phone cannot view admin data." },
      { status: 403 }
    );
  }
  return null;
}

export async function loadAdminRecords(): Promise<{
  rsvps: AdminRsvp[];
  attendees: AdminAttendee[];
}> {
  const admin = getSupabaseAdmin();
  const { data: rsvpRows, error: rsvpError } = await admin
    .from("rsvps")
    .select(
      "guest_id, guest_phone, guest_first_name, guest_last_name, guest_names, brunch_attending, brunch_kids, bar_attending, dietary, jukebox_track, jukebox_artist, spotify_url, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (rsvpError) throw new Error(rsvpError.message);

  const fullGuestSelect =
    "id, addressee, name, first_name, last_name, phone, email, tier, invite_label, invited_brunch, invited_bar";
  let guestResult = await admin.from("guests").select(fullGuestSelect);
  if (
    guestResult.error &&
    /invite_label|invited_brunch|invited_bar/i.test(guestResult.error.message)
  ) {
    guestResult = await admin
      .from("guests")
      .select("id, addressee, name, first_name, last_name, phone, email, tier");
  }
  if (guestResult.error) throw new Error(guestResult.error.message);

  const guests = (guestResult.data || []) as GuestRow[];
  const byId = new Map(guests.map((guest) => [guest.id, guest]));
  const byPhone = new Map(
    guests
      .filter((guest) => guest.phone)
      .map((guest) => [String(guest.phone), guest])
  );

  const rsvps: AdminRsvp[] = ((rsvpRows || []) as RsvpRow[]).map((row) => {
    const guest =
      (row.guest_id ? byId.get(row.guest_id) : undefined) ||
      (row.guest_phone ? byPhone.get(row.guest_phone) : undefined);
    return {
      family: guest?.addressee || "",
      guest: row.guest_names || (guest ? guestLabel(guest) : ""),
      firstName: row.guest_first_name || "",
      lastName: row.guest_last_name || "",
      phone: row.guest_phone || guest?.phone || "",
      email: guest?.email || "",
      invite: inviteLabel(guest),
      brunchAttending: row.brunch_attending || "",
      brunchKids: row.brunch_kids || "",
      barAttending: row.bar_attending || "",
      dietary: row.dietary || "",
      song: row.jukebox_track || "",
      artist: row.jukebox_artist || "",
      spotifyUrl: row.spotify_url || "",
      submitted: row.created_at || "",
      updated: row.updated_at || "",
    };
  });

  const attendees: AdminAttendee[] = guests
    .map((guest) => ({
      family: guest.addressee || "",
      guest: guestLabel(guest),
      phone: guest.phone || "",
      email: guest.email || "",
      invite: inviteLabel(guest),
    }))
    .sort((a, b) => {
      const family = a.family.localeCompare(b.family, undefined, {
        sensitivity: "base",
      });
      if (family !== 0) return family;
      return a.guest.localeCompare(b.guest, undefined, { sensitivity: "base" });
    });

  return { rsvps, attendees };
}
