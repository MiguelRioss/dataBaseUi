// src/components/Orders/utils.js
export function centsToEUR(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" })
    .format((Number(cents) || 0) / 100);
}

export function buildAddress(a = {}) {
  return [a.line1, a.postal_code, a.city, a.country].filter(Boolean).join(", ");
}

/**
 * Map raw RTDB object to UI rows, preserving read-only status booleans.
 * Also remains backward-compatible if some records used a single `status` string.
 */
export function mapDbToRows(valObj) {
  return Object.entries(valObj).map(([id, v]) => ({
    id,
    date: v.written_at ? new Date(v.written_at) : null,
    name: v.name || v.metadata?.fullName || "—",
    email: v.email ?? "—",
    amount: v.amount_total ?? null,
    currency: v.currency ?? "eur",
    address: v.address || {},
    track_url: v.track_url ?? "",
    fulfilled: !!v.fulfilled,
    email_sent: !!(v.email_sent ?? v.email_sended),

    // Read-only status booleans, taken exactly from DB if present:
    accepted:   v.accepted,
    in_transit: v.in_transit,
    delivered:  v.delivered,

    // Back-compat: if an older record used a single string `status`,
    // mirror it into the boolean view without writing to DB.
    ...(typeof v.status === "string"
      ? {
          accepted:   v.accepted   ?? (v.status === "accepted"),
          in_transit: v.in_transit ?? (v.status === "in_transit"),
          delivered:  v.delivered  ?? (v.status === "delivered"),
        }
      : {}),
  }));
}
