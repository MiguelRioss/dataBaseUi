// src/components/Orders/utils.js

// Simple EUR helper (delegates to the generic formatter for consistency)
export function centsToEUR(cents) {
  return formatCents(cents, "eur");
}

export function formatCents(cents = 0, currency = "eur") {
  if (cents == null) return "—";
  const amt = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase(),
  }).format(amt);
}

export function buildAddress(a = {}) {
  return [a.line1, a.postal_code, a.city, a.country].filter(Boolean).join(", ");
}

export function buildCttUrl(code = "") {
  const c = encodeURIComponent(String(code || "").trim());
  return `https://appserver.ctt.pt/CustomerArea/PublicArea_Detail?ObjectCodeInput=${c}&SearchInput=${c}&IsFromPublicArea=true`;
}

export function mapDbToRows(valObj = {}) {
  return Object.entries(valObj).map(([id, v]) => {
    const metaAddr = v?.metadata
      ? {
          line1:       v.metadata.addr_line1 ?? "",
          city:        v.metadata.addr_city  ?? "",
          postal_code: v.metadata.addr_zip   ?? "",
          country:     v.metadata.addr_ctry  ?? "",
        }
      : {};

    const address =
      v?.address && Object.keys(v.address).length ? v.address : metaAddr;

    // --- Structured status (new model) ---
    const statusObj =
      v && v.status && typeof v.status === "object" && !Array.isArray(v.status)
        ? v.status
        : {};

    const step = (key) => {
      const s = statusObj[key];
      if (!s || typeof s !== "object") {
        return { status: false, date: null, time: null };
      }
      return {
        status: !!s.status,
        date: s.date ?? null,
        time: s.time ?? null,
      };
    };

    const deliveredStep = step("delivered");
    const acceptedInCtt = step("acceptedInCtt");
    const acceptedStep  = step("accepted");
    const inTransitStep = step("in_transit");                    // canonical
    const waitingStep   = step("wating_to_Be_Delivered");        // spelling per backend

    // --- Legacy fallbacks (older docs) ---
    const legacyAccepted   = v?.accepted;
    const legacyInTransit  = v?.in_transit ?? v?.in_traffic;     // read both
    const legacyDelivered  = v?.delivered;
    const legacyStatusStr  = typeof v?.status === "string" ? v.status : null;

    const acceptedFlag =
      typeof acceptedStep.status === "boolean"
        ? acceptedStep.status
        : typeof legacyAccepted === "boolean"
          ? legacyAccepted
          : legacyStatusStr === "accepted";

    const inTransitFlag =
      typeof inTransitStep.status === "boolean"
        ? inTransitStep.status
        : typeof legacyInTransit === "boolean"
          ? legacyInTransit
          : legacyStatusStr === "in_transit" || legacyStatusStr === "in_traffic";

    const deliveredFlag =
      typeof deliveredStep.status === "boolean"
        ? deliveredStep.status
        : typeof legacyDelivered === "boolean"
          ? legacyDelivered
          : legacyStatusStr === "delivered";

    return {
      id,
      date: v?.written_at ? new Date(v.written_at) : null,
      name: v?.name || v?.metadata?.full_name || v?.metadata?.fullName || "—",
      email: v?.email ?? "—",
      amount: v?.amount_total ?? null,
      currency: v?.currency ?? "eur",

      address,                // normalized for UI
      metadata: v?.metadata ?? {},
      track_url: v?.track_url ?? "",
      items: Array.isArray(v?.items) ? v.items : [],

      // existing booleans the UI already uses
      fulfilled: !!v?.fulfilled,
      email_sent: !!(v?.email_sent ?? v?.email_sended),

      // legacy-compatibility fields (booleans)
      accepted:   !!acceptedFlag,
      in_transit: !!inTransitFlag,   // canonical name in UI
      delivered:  !!deliveredFlag,

      // expose the full structured status for richer UI (new model)
      status: {
        delivered: deliveredStep,
        acceptedInCtt: acceptedInCtt,
        accepted: acceptedStep,
        in_transit: inTransitStep,
        wating_to_Be_Delivered: waitingStep,
      },

      // Helpful ordered list for timelines/progress bars
      status_steps: [
        { key: "acceptedInCtt",          ...acceptedInCtt,        label: "Accepted in CTT" },
        { key: "accepted",               ...acceptedStep,         label: "Accepted" },
        { key: "in_transit",             ...inTransitStep,        label: "In Transit" },
        { key: "wating_to_Be_Delivered", ...waitingStep,          label: "Waiting to be Delivered" },
        { key: "delivered",              ...deliveredStep,        label: "Delivered" },
      ],
    };
  });
}
