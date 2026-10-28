/** Joshua's lookup number. This account can download every RSVP. */
export const ADMIN_PHONE = "8327978346";

export function isAdminPhone(phone: string | null | undefined): boolean {
  const digits = (phone || "").replace(/\D/g, "");
  return digits === ADMIN_PHONE || digits === `1${ADMIN_PHONE}`;
}
