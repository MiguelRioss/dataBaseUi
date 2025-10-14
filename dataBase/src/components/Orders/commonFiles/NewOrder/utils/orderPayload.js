// utils/orderPayload.js
import {
  euroStringToCents,
  calculateOrderTotalCents,
  createEmptyAddress,
  normalizeAddressPhone,
  createInitialForm,
  createEmptyItem,
  centsToEuroInput,
  splitPhoneValue,
} from "./NewOrderUtils.jsx";
import { deepEqual } from "./compareUtils.js";

const ADDRESS_KEYS = [
  "name", "line1", "line2", "city",
  "postal_code", "country", "phone",
  "phone_prefix", "phone_number"
];

export function normalizeAddressForPayload(address = {}) {
  const normalized = normalizeAddressPhone(address ?? {});
  const result = {};
  ADDRESS_KEYS.forEach((key) => {
    const value = normalized[key];
    result[key] = typeof value === "string" ? value.trim() : (value ?? "");
  });
  return result;
}

export function buildComparableFromOrder(order = {}) {
  if (!order || typeof order !== "object") return null;
  const metadata = order.metadata ?? {};
  const shippingAddress = normalizeAddressForPayload(metadata.shipping_address ?? createEmptyAddress());
  const billingAddress = normalizeAddressForPayload(metadata.billing_address ?? createEmptyAddress());

  return {
    name: order.name ?? "",
    email: order.email ?? "",
    phone: order.phone ?? "",
    amount_total: Number(order.amount_total ?? 0),
    currency: order.currency ?? "EUR",
    payment_id: order.payment_id ?? metadata.payment_id ?? "",
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: String(item?.id ?? item?.product_id ?? ""),
          name: item?.name ?? "",
          quantity: Number(item?.quantity ?? 0),
          unit_amount: Number(item?.unit_amount ?? item?.unit_amount_cents ?? 0),
        }))
      : [],
    metadata: {
      ...metadata,
      payment_provider: metadata.payment_provider ?? "revolut",
      billing_same_as_shipping: !!metadata.billing_same_as_shipping,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      shipping_cost_cents: Number(metadata.shipping_cost_cents ?? 0),
    },
  };
}

export function buildFormStateFromOrder(order = {}) {
  const baseForm = createInitialForm();
  if (!order || typeof order !== "object") {
    return { form: baseForm, sameAsShipping: true };
  }

  const metadata = order.metadata ?? {};
  const shippingAddress = normalizeAddressForPayload(
    metadata.shipping_address ? { ...metadata.shipping_address } : createEmptyAddress()
  );
  const billingAddress = normalizeAddressForPayload(
    metadata.billing_address ? { ...metadata.billing_address } : createEmptyAddress()
  );

  const sameAsShippingRaw =
    metadata.billing_same_as_shipping ?? metadata.billingSameAsShipping;
  const sameAsShipping =
    sameAsShippingRaw == null
      ? true
      : typeof sameAsShippingRaw === "string"
      ? sameAsShippingRaw === "true"
      : !!sameAsShippingRaw;

  const phoneParts = splitPhoneValue(order.phone ?? "");
  const phonePrefix = phoneParts.prefix || baseForm.phonePrefix;
  const phoneNumber = phoneParts.number || baseForm.phoneNumber;
  const combinedPhone =
    (order.phone ?? "").trim() ||
    (phoneNumber ? `${phonePrefix} ${phoneNumber}`.trim() : baseForm.phone);

  const ensureItem = (item) => {
    const rawQuantity = Number(item?.quantity ?? 0);
    const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
    const rawUnitAmount =
      item?.unit_amount_cents != null
        ? Number(item.unit_amount_cents)
        : item?.unit_amount != null
        ? Number(item.unit_amount)
        : 0;
    const id =
      item?.id != null
        ? String(item.id).trim()
        : item?.product_id != null
        ? String(item.product_id).trim()
        : "";

    return {
      id,
      name: item?.name ?? "",
      quantity: quantity.toString(),
      unit_amount: centsToEuroInput(rawUnitAmount),
    };
  };

  const baseItems =
    Array.isArray(order.items) && order.items.length
      ? order.items
      : [createEmptyItem()];
  const items = baseItems.map((item) => ensureItem(item));

  const shippingCostCents = Number(metadata.shipping_cost_cents ?? 0);
  const shippingCost = centsToEuroInput(shippingCostCents);
  const amountTotalCents =
    order.amount_total != null
      ? Number(order.amount_total)
      : calculateOrderTotalCents(items, shippingCost);

  return {
    form: {
      ...baseForm,
      name: order.name ?? baseForm.name,
      email: order.email ?? baseForm.email,
      phone: combinedPhone,
      phonePrefix,
      phoneNumber,
      amount_total: centsToEuroInput(amountTotalCents),
      currency: order.currency ?? baseForm.currency,
      payment_provider: metadata.payment_provider ?? baseForm.payment_provider,
      payment_id: order.payment_id ?? metadata.payment_id ?? baseForm.payment_id,
      shipping_cost: shippingCost,
      shipping_address: shippingAddress,
      billing_address: sameAsShipping ? { ...shippingAddress } : billingAddress,
      items,
    },
    sameAsShipping,
  };
}

export function buildPayloadFromForm(form, sameAsShipping, { includeStatusDefaults = false, baseMetadata } = {}) {
  const shippingAddress = normalizeAddressForPayload(form.shipping_address ?? {});
  const billingAddress = sameAsShipping
    ? normalizeAddressForPayload(form.shipping_address ?? {})
    : normalizeAddressForPayload(form.billing_address ?? {});
  const metadata = {
    ...(baseMetadata ?? {}),
    payment_provider: form.payment_provider || "revolut",
    billing_same_as_shipping: sameAsShipping,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    shipping_cost_cents: euroStringToCents(form.shipping_cost),
  };
  const items = (form.items || []).map((item) => ({
    id: item?.id ? String(item.id).trim() : "",
    name: item?.name ?? "",
    quantity: Number(item?.quantity ?? 0) || 0,
    unit_amount: euroStringToCents(item?.unit_amount),
  }));

  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    amount_total: calculateOrderTotalCents(form.items, form.shipping_cost),
    currency: form.currency,
    payment_id: form.payment_id,
    items,
    metadata,
  };

  if (includeStatusDefaults) {
    payload.status = {
      accepted: { status: false },
      in_transit: { status: false },
      delivered: { status: false },
      acceptedInCtt: { status: false },
      waiting_to_be_delivered: { status: false },
    };
    payload.track_url = "";
  }
  return payload;
}

export function computeChanges(original, next) {
  if (!original) return next;
  const changes = {};
  const compare = (key, transform = (v) => v) => {
    const prevVal = transform(original[key]);
    const nextVal = transform(next[key]);
    if (!deepEqual(prevVal, nextVal)) changes[key] = nextVal;
  };
  compare("name", (v) => (v ?? "").trim());
  compare("email", (v) => (v ?? "").trim());
  compare("phone", (v) => (v ?? "").trim());
  compare("amount_total", (v) => Number(v ?? 0));
  compare("currency", (v) => (v ?? "").trim());
  compare("payment_id", (v) => (v ?? "").trim());
  compare("items");
  compare("metadata");
  return changes;
}
