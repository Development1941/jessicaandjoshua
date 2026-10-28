import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizePhone(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function normalizeEmail(value: string): string {
  return (value || "").trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

/** Digit forms that should match a guest row stored as a national number. */
export function phoneLookupKeys(value: string): string[] {
  const clean = normalizePhone(value);
  const keys = new Set<string>();
  const add = (key: string) => {
    if (key.length >= 10) keys.add(key);
  };
  if (!clean) return [];

  add(clean);
  if (clean.startsWith("0")) add(clean.replace(/^0+/, ""));
  if (clean.length === 11 && clean.startsWith("1")) add(clean.slice(1));
  if (clean.startsWith("44") && clean.length >= 12) {
    add(clean.slice(2).replace(/^0+/, ""));
  }
  if (clean.startsWith("52") && clean.length >= 12) {
    const national = clean.slice(2);
    add(national);
    if (national.startsWith("1") && national.length === 11) add(national.slice(1));
  }
  if (clean.length > 10) add(clean.slice(-10));
  return [...keys];
}

export function guestDisplayName(guest: {
  addressee?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}): string {
  const addressee = (guest.addressee || "").trim();
  if (addressee) return addressee;
  const full = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
  if (full) return full;
  return (guest.name || "").trim() || "Guest";
}

export function guestPersonalName(guest: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}): string {
  const full = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
  if (full) return full;
  return (guest.name || "").trim() || "Guest";
}

function mapGuestRow(row: Record<string, unknown> | null): GuestRecord | null {
  if (!row) return null;
  const firstName = String(row.first_name || "");
  const lastName = String(row.last_name || "");
  const addressee = String(row.addressee || "");
  const legacyName = String(row.name || "");
  const personal =
    `${firstName} ${lastName}`.trim() || legacyName || "Guest";

  return {
    id: String(row.id),
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    first_name: firstName,
    last_name: lastName,
    addressee,
    name: personal,
    tier: row.tier as GuestTier,
    country_code: row.country_code ? String(row.country_code) : null,
  };
}

const GUEST_SELECT =
  "id, phone, email, first_name, last_name, addressee, name, tier, country_code";
const GUEST_SELECT_NO_COUNTRY =
  "id, phone, email, first_name, last_name, addressee, name, tier";
const GUEST_SELECT_FALLBACK = "id, phone, email, name, tier";

async function selectGuests(
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>
) {
  let primary = await run(GUEST_SELECT);
  if (primary.error && /country_code/i.test(primary.error.message)) {
    primary = await run(GUEST_SELECT_NO_COUNTRY);
  }
  if (!primary.error) return primary;

  if (/first_name|last_name|addressee|email|country_code/i.test(primary.error.message)) {
    const fallback = await run(GUEST_SELECT_FALLBACK);
    if (fallback.error) {
      const legacy = await run("id, phone, name, tier");
      if (legacy.error) return legacy;
      const rows = Array.isArray(legacy.data)
        ? legacy.data
        : legacy.data
          ? [legacy.data]
          : [];
      return {
        data: rows.map((row) => ({
          ...(row as object),
          email: null,
          first_name: "",
          last_name: "",
          addressee: "",
        })),
        error: null,
      };
    }
    const rows = Array.isArray(fallback.data)
      ? fallback.data
      : fallback.data
        ? [fallback.data]
        : [];
    return {
      data: rows.map((row) => ({
        ...(row as object),
        first_name: "",
        last_name: "",
        addressee: "",
      })),
      error: null,
    };
  }

  return primary;
}

export async function findGuestByPhone(phone: string, countryCode?: string | null) {
  const keys = phoneLookupKeys(phone);
  if (!keys.length) {
    return { guest: null as GuestRecord | null, error: null as string | null };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await selectGuests((columns) =>
    admin.from("guests").select(columns).in("phone", keys)
  );

  if (error) return { guest: null, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[]).map((row) =>
    mapGuestRow(row)
  ).filter(Boolean) as GuestRecord[];
  const selected = normalizePhone(countryCode || "");
  const matching = selected
    ? rows.filter((row) => (row.country_code || "") === selected)
    : rows;
  const preferred = keys.find((key) => key.length === 10);
  const guest =
    matching.find((row) => row.phone === preferred) || matching[0] || null;
  return { guest, error: null };
}

export async function findGuestByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !isEmail(normalized)) {
    return { guest: null as GuestRecord | null, error: null as string | null };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await selectGuests((columns) =>
    admin.from("guests").select(columns).ilike("email", normalized).maybeSingle()
  );

  if (error) {
    if (/email/i.test(error.message)) {
      return {
        guest: null,
        error:
          "Email login needs the guests.email column. Run supabase/migration_guest_fields.sql in the Supabase SQL editor.",
      };
    }
    return { guest: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    guest: mapGuestRow((row as Record<string, unknown>) || null),
    error: null,
  };
}

/** Country codes that appear on the guest list. */
export const LOGIN_COUNTRY_CODES = ["1", "44"] as const;

export function loginCountryCode(value: string | null | undefined): string {
  const digits = normalizePhone(value || "");
  return (LOGIN_COUNTRY_CODES as readonly string[]).includes(digits) ? digits : "1";
}

export async function findGuestByLogin(query: string, countryCode?: string | null) {
  const raw = (query || "").trim();
  if (!raw) {
    return { guest: null as GuestRecord | null, error: null as string | null };
  }

  if (isEmail(raw)) return findGuestByEmail(raw);
  return findGuestByPhone(raw, countryCode);
}

export function toE164(digits: string, countryCode = "1"): string {
  const clean = normalizePhone(digits);
  const cc = normalizePhone(countryCode || "1") || "1";
  if (!clean) return "";
  if (clean.startsWith(cc) && clean.length >= cc.length + 10) return `+${clean}`;
  if (digits.trim().startsWith("+") && clean.length > 10) return `+${clean}`;
  const national = clean.replace(/^0+/, "");
  return `+${cc}${national}`;
}

export type GuestTier = "both" | "brunch" | "night";

export type GuestRecord = {
  id: string;
  phone: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  addressee: string;
  name: string;
  tier: GuestTier;
  country_code: string | null;
};
