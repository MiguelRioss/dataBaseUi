// src/components/Orders/utils.js
import {
  SHIPMENT_STATUS_KEYS,
  SHIPMENT_STATUS_LABELS,
  normalizeShipmentStatus,
} from "../../Status/shipmentStatus.js";

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
    const shipping_address = { ...(meta.shipping_address ?? {}) };
    const billing_address = { ...(meta.billing_address ?? {}) };

    const fullName = v.name ?? "";
    const phone = meta.phone ?? "";
    const email = v.email ?? "";
    const shippingCost = meta.shipping_cost_cents ?? 0;
    const sentShippingEmail = v.sentShippingEmail;
    const paymentStatusRaw =
      v?.payment_status ??
      meta?.payment_status ??
      meta?.paymentStatus ??
      v?.metadata?.payment_status ??
      v?.metadata?.paymentStatus;
    const payment_status =
      typeof paymentStatusRaw === "boolean"
        ? paymentStatusRaw
        : typeof paymentStatusRaw === "string"
          ? paymentStatusRaw.trim().toLowerCase() === "true"
          : Boolean(paymentStatusRaw);
    const rawPaymentId =
      meta.payment_id ??
      meta.paymentId ??
      (typeof v?.payment_id === "string" ? v.payment_id : "");
    const paymentId =
      rawPaymentId != null && rawPaymentId !== ""
        ? String(rawPaymentId).trim()
        : "";

    // Fill missing name/contact fields
    for (const addr of [shipping_address, billing_address]) {
      if (!addr.full_name) addr.full_name = fullName;
      if (!addr.phone) addr.phone = phone;
      if (!addr.email) addr.email = email;
    }

    // Normalize structured status
    const status = normalizeShipmentStatus(v?.status);

    // Build status steps for UI (table, badges, etc.)
    const status_steps = SHIPMENT_STATUS_KEYS.map((key) => ({
      key,
      label: SHIPMENT_STATUS_LABELS[key],
      ...status[key],
    }));
    console.log("This is status:" ,status)
    console.log("This is status steps :" ,status_steps)

    // Final mapped order row
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
      sentShippingEmail,
      payment_status,
      status,
      status_steps
    };
  });
}
