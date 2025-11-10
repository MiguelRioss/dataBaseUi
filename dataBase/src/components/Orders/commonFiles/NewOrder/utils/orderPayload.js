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
  "name",
  "line1",
  "line2",
  "city",
  "postal_code",
  "country",
  "phone",
  "phone_prefix",
  "phone_number",
];

export function normalizeAddressForPayload(address = {}) {
  const normalized = normalizeAddressPhone(address ?? {});
  const result = {};
  ADDRESS_KEYS.forEach((key) => {
    const value = normalized[key];
    result[key] = typeof value === "string" ? value.trim() : value ?? "";
  });
  return result;
}

export function buildComparableFromOrder(order = {}) {
  if (!order || typeof order !== "object") return null;

  const metadata = order.metadata ?? {};
  const shippingAddress = normalizeAddressForPayload(
    metadata.shipping_address ?? createEmptyAddress()
  );
  const billingAddress = normalizeAddressForPayload(
    metadata.billing_address ?? createEmptyAddress()
  );

  // Normalize discount for compare shape
  const rawDiscount = metadata.discount ?? {};
  const percentNum = Number(rawDiscount.percent);
  const normalizedDiscount = {
    code: rawDiscount.code ?? null,
    amount_cents: Number(rawDiscount.amount_cents ?? 0),
    ...(Number.isFinite(percentNum) ? { percent: percentNum } : {}),
  };

  return {
    name: order.name ?? "",
    email: order.email ?? "",
    phone: order.phone ?? "",

    amount_total: Number(order.amount_total ?? 0), // cents
    currency: order.currency ?? "EUR",
    payment_id: order.payment_id ?? metadata.payment_id ?? "",

    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: String(item?.id ?? item?.product_id ?? ""),
          name: item?.name ?? "",
          quantity: Number(item?.quantity ?? 0),
          // stored orders typically have cents already
          unit_amount: Number(
            item?.unit_amount ?? item?.unit_amount_cents ?? 0
          ),
        }))
      : [],

    metadata: {
      ...metadata,
      payment_provider: metadata.payment_provider ?? "revolut",
      billing_same_as_shipping: !!metadata.billing_same_as_shipping,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      shipping_cost_cents: Number(metadata.shipping_cost_cents ?? 0),
      discount: normalizedDiscount,
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
    metadata.shipping_address
      ? { ...metadata.shipping_address }
      : createEmptyAddress()
  );
  const billingAddress = normalizeAddressForPayload(
    metadata.billing_address
      ? { ...metadata.billing_address }
      : createEmptyAddress()
  );

  const sameAsShippingRaw =
    metadata.billing_same_as_shipping ?? metadata.billingSameAsShipping;
  const sameAsShipping =
    sameAsShippingRaw == null
      ? true
      : typeof sameAsShippingRaw === "string"
      ? sameAsShippingRaw === "true"
      : !!sameAsShippingRaw;

  // Phone
  const phoneParts = splitPhoneValue(order.phone ?? "");
  const phonePrefix = phoneParts.prefix || baseForm.phonePrefix;
  const phoneNumber = phoneParts.number || baseForm.phoneNumber;
  const combinedPhone =
    (order.phone ?? "").trim() ||
    (phoneNumber ? `${phonePrefix} ${phoneNumber}`.trim() : baseForm.phone);

  // Items → UI (EUR strings)
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
  const items = baseItems.map((it) => ensureItem(it));

  // Shipping & Discount
  const shippingCostCents = Number(metadata.shipping_cost_cents ?? 0);
  const shippingCost = centsToEuroInput(shippingCostCents);

  const discountMeta = metadata.discount ?? {};
  const percentNum = Number(discountMeta.percent);
  let discountCents = Number(discountMeta.amount_cents);
  // If amount_cents missing but percent present, recompute from items
  if (!Number.isFinite(discountCents)) {
    if (Number.isFinite(percentNum)) {
      const itemsGrossCents = items.reduce(
        (s, it) =>
          s + euroStringToCents(it.unit_amount) * (Number(it.quantity) || 0),
        0
      );
      discountCents = Math.round(itemsGrossCents * (percentNum / 100));
    } else {
      discountCents = 0;
    }
  }

  // Amount total (net) in cents
  const itemsGrossCents = items.reduce(
    (s, it) =>
      s + euroStringToCents(it.unit_amount) * (Number(it.quantity) || 0),
    0
  );
  const clampedDiscount = Math.min(Math.max(discountCents, 0), itemsGrossCents);
  const computedTotalCents = Math.max(
    0,
    itemsGrossCents + shippingCostCents - clampedDiscount
  );
  const amountTotalCents =
    order.amount_total != null
      ? Number(order.amount_total)
      : computedTotalCents;

  // Derive discount UI fields
  const discount_code = (discountMeta.code || "").toString().toUpperCase();
  const discount_type = Number.isFinite(percentNum) ? "percent" : "fixed";
  const discount_value = Number.isFinite(percentNum)
    ? String(percentNum)
    : centsToEuroInput(discountCents);

  return {
    form: {
      ...baseForm,
      name: order.name ?? baseForm.name,
      email: order.email ?? baseForm.email,
      phone: combinedPhone,
      phonePrefix,
      phoneNumber,

      amount_total: centsToEuroInput(amountTotalCents), // UI preview (net, EUR)
      currency: order.currency ?? baseForm.currency,
      payment_provider: metadata.payment_provider ?? baseForm.payment_provider,
      payment_id:
        order.payment_id ?? metadata.payment_id ?? baseForm.payment_id,

      shipping_cost: shippingCost,
      shipping_address: shippingAddress,
      billing_address: sameAsShipping ? { ...shippingAddress } : billingAddress,

      items,

      // Discount UI fields
      discount_code,
      discount_type,
      discount_value,
    },
    sameAsShipping,
  };
}

export function buildPayloadFromForm(
  form,
  sameAsShipping,
  { baseMetadata } = {}
) {
  // Addresses
  const shippingAddress = normalizeAddressForPayload(
    form.shipping_address ?? {}
  );
  const billingAddress = sameAsShipping
    ? normalizeAddressForPayload(form.shipping_address ?? {})
    : normalizeAddressForPayload(form.billing_address ?? {});

  // Items (unit_amount in cents)
  const items = (form.items || []).map((item) => ({
    id: item?.id ? String(item.id).trim() : "",
    name: item?.name ?? "",
    quantity: Number(item?.quantity ?? 0) || 0,
    unit_amount: euroStringToCents(item?.unit_amount),
  }));

  // Shipping & Discount (cents)
  const shippingCents = euroStringToCents(form.shipping_cost);

  const discountType = (form.discount_type || "percent").toLowerCase();
  const discountVal = form.discount_value ?? "";
  const percentNum = Number(discountVal);
  const fixedCents = euroStringToCents(discountVal);

  const itemsGrossCents = items.reduce(
    (s, it) => s + (Number(it.unit_amount) || 0) * (Number(it.quantity) || 0),
    0
  );

  let discountCents =
    discountType === "percent"
      ? Math.round(
          itemsGrossCents * (Math.max(0, Math.min(100, percentNum)) / 100)
        )
      : fixedCents;

  discountCents = Math.min(Math.max(discountCents, 0), itemsGrossCents);

  // Net total in cents
  const amount_total = Math.max(
    0,
    itemsGrossCents + shippingCents - discountCents
  );

  // Metadata
  const metadata = {
    ...(baseMetadata ?? {}),
    payment_provider: form.payment_provider || "revolut",
    billing_same_as_shipping: sameAsShipping,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    shipping_cost_cents: shippingCents,
    discount: {
      code: (form.discount_code || "").trim() || null,
      amount_cents: discountCents,
      ...(discountType === "percent" && Number.isFinite(percentNum)
        ? { percent: percentNum }
        : {}),
    },
  };

  // Payload
  return {
    name: (form.name || "").trim(),
    email: (form.email || "").trim(),
    phone: (form.phone || "").trim(),
    amount_total, // cents (net)
    currency: form.currency || "EUR",
    payment_id: form.payment_id,
    items,
    metadata,
  };
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
