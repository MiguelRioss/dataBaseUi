// small pure helpers used across orders components

export function centsToEUR(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format((Number(cents) || 0) / 100);
}

export function buildAddress(address = {}) {
  return [
    address.line1,
    address.postal_code,
    address.city,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Map the raw RTDB orders object to a rows array used by the UI
 */
export function mapDbToRows(dbObj = {}) {
  return Object.entries(dbObj).map(([id, v]) => ({
    id,
    date: v.written_at ? new Date(v.written_at) : null,
    name: v.name || (v.metadata && v.metadata.fullName) || "—",
    email: v.email ?? "—",
    amount: v.amount_total ?? null,
    currency: v.currency ?? "eur",
    address: v.address || {},
    track_url: v.track_url ?? "",
    fulfilled: v.fulfilled ?? false,
    email_sent: v.email_sent ?? false,
  }));
}
