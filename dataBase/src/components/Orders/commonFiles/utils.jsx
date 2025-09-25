// src/components/Orders/utils.js
export function centsToEUR(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" })
    .format((Number(cents) || 0) / 100);
}

export function buildAddress(a = {}) {
  return [a.line1, a.postal_code, a.city, a.country].filter(Boolean).join(", ");
}

// src/components/Orders/utils.js
export function mapDbToRows(valObj) {
  return Object.entries(valObj).map(([id, v]) => {
    const metaAddr = v?.metadata ? {
      line1:       v.metadata.addr_line1 ?? "",
      city:        v.metadata.addr_city  ?? "",
      postal_code: v.metadata.addr_zip   ?? "",
      country:     v.metadata.addr_ctry  ?? "",
    } : {};

    const address = (v.address && Object.keys(v.address).length) ? v.address : metaAddr;

    return {
      id,
      date: v.written_at ? new Date(v.written_at) : null,
      name: v.name || v.metadata?.full_name || v.metadata?.fullName || "—",
      email: v.email ?? "—",
      amount: v.amount_total ?? null,
      currency: v.currency ?? "eur",
      address,                 // ← normalized for UI
      metadata: v.metadata ?? {},
      track_url: v.track_url ?? "",

      items: Array.isArray(v.items) ? v.items : [],

      fulfilled: !!v.fulfilled,
      email_sent: !!(v.email_sent ?? v.email_sended),
      accepted:   v.accepted,
      in_transit: v.in_transit,
      delivered:  v.delivered,
      ...(typeof v.status === "string" ? {
        accepted:   v.accepted   ?? (v.status === "accepted"),
        in_transit: v.in_transit ?? (v.status === "in_transit"),
        delivered:  v.delivered  ?? (v.status === "delivered"),
      } : {}),
    };
  });
}


export function formatCents(cents = 0, currency = "eur") {
  const amt = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format(amt);
}


export  function buildCttUrl(code = "") {
  const c = encodeURIComponent(code.trim());
  return `https://appserver.ctt.pt/CustomerArea/PublicArea_Detail?ObjectCodeInput=${c}&SearchInput=${c}&IsFromPublicArea=true`;
}
