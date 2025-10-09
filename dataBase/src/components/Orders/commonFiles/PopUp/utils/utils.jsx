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
    const meta = v?.metadata ?? {};

    // --- Extract metadata-level addresses ---
    const shipping_address = { ...(meta.shipping_address ?? {}) };
    const billing_address = { ...(meta.billing_address ?? {}) };

    // --- Auto-fill missing name and phone/email fields ---
    const fullName = v.name;
    const phone = meta.phone;

    const email = v.email;
    const shippingCost = meta.shipping_cost_cents;
    const rawPaymentId =
      meta.payment_id ??
      meta.paymentId ??
      (typeof v?.payment_id === "string" ? v.payment_id : "");
    const paymentId =
      rawPaymentId != null && rawPaymentId !== ""
        ? String(rawPaymentId).trim()
        : "";
    if (!shipping_address.full_name) shipping_address.full_name = fullName;
    if (!shipping_address.phone) shipping_address.phone = phone;
    if (!shipping_address.email) shipping_address.email = email;

    if (!billing_address.full_name) billing_address.full_name = fullName;
    if (!billing_address.phone) billing_address.phone = phone;
    if (!billing_address.email) billing_address.email = email;

    // --- Fallback address shape if no structured one exists ---


    // --- Structured status (unchanged) ---
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

    const stepWithFallback = (...keys) => {
      for (const key of keys) {
        if (key in statusObj) return step(key);
      }
      return { status: false, date: null, time: null };
    };

    const deliveredStep = step("delivered");
    const acceptedInCtt = step("acceptedInCtt");
    const acceptedStep = step("accepted");
    const inTransitStep = step("in_transit");
    const waitingStep = stepWithFallback(
      "waiting_to_be_delivered",
      "wating_to_Be_Delivered"
    );

    // --- Final mapped object ---
    return {
      id: v.id,
      date: v?.written_at ? new Date(v.written_at) : null,
      name: fullName,
      email,
      amount: v?.amount_total ?? null,
      currency: v?.currency ?? "eur",
      shippingCost,
      shipping_address,
      billing_address,
      track_url: v?.track_url ?? "",
      payment_id: paymentId,
      items: Array.isArray(v?.items) ? v.items : [],
      fulfilled: !!v?.fulfilled,
      email_sent: !!(v?.email_sent ?? v?.email_sended),
      metadata: meta,

      status: {
        delivered: deliveredStep,
        acceptedInCtt,
        accepted: acceptedStep,
        in_transit: inTransitStep,
        waiting_to_be_delivered: waitingStep,
      },

      status_steps: [
        { key: "acceptedInCtt", ...acceptedInCtt, label: "Accepted in CTT" },
        { key: "accepted", ...acceptedStep, label: "Accepted" },
        { key: "in_transit", ...inTransitStep, label: "In Transit" },
        {
          key: "waiting_to_be_delivered",
          ...waitingStep,
          label: "Waiting to be Delivered",
        },
        { key: "delivered", ...deliveredStep, label: "Delivered" },
      ],
    };
  });
}
