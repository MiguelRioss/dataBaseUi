import { SHIPMENT_STATUS_KEYS, SHIPMENT_STATUS_LABELS } from "./Status/shipmentStatus.js";

/**
 * Build the next status object after patch
 */
export function buildNextStatusSteps(updatedStatus) {
  return SHIPMENT_STATUS_KEYS.map((key) => ({
    key,
    label: SHIPMENT_STATUS_LABELS[key],
    ...updatedStatus[key],
  }));
}

/**
 * Create patch object to toggle all shipment status steps at once
 */
export function buildDeliveredPatch(nextVal) {
  return SHIPMENT_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = nextVal;
    return acc;
  }, {});
}

/**
 * Mapping of sort keys to extractors
 */
export const SORT_KEYS = {
  id: (r) => r.id,
  date: (r) => (r.date instanceof Date ? r.date.getTime() : 0),
  customer: (r) => (r.name || "").toLowerCase(),
  email: (r) => (r.email || "").toLowerCase(),
  payment: (r) => String(r.payment_id || "").toLowerCase(),
  payment_status: (r) => (r.payment_status ? 1 : 0),
  price: (r) => (Number.isFinite(r.amount) ? r.amount : 0),
  status: (r) => {
    const deliveredRank = r?.status?.delivered?.status ? 0 : 1;
    const label = (r?.status?.label || r?.status?.state || "").toLowerCase();
    return `${deliveredRank}::${label}`;
  },
  completed: (r) => (r?.status?.delivered?.status ? 1 : 0),
};

/**
 * Filter rows by query term
 */
export function filterRows(rows, searchTerm) {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => {
    const idMatch = String(row.id ?? "").toLowerCase().includes(query);
    const paymentMatch = String(row.payment_id ?? "").toLowerCase().includes(query);
    const nameMatch = String(row.name ?? "").toLowerCase().includes(query);
    const emailMatch = String(row.email ?? "").toLowerCase().includes(query);
    const paymentStatusLabel = row.payment_status ? "paid" : "unpaid";
    const paymentStatusMatch =
      paymentStatusLabel.includes(query) ||
      String(row.payment_status ?? "").toLowerCase().includes(query);
    return idMatch || paymentMatch || nameMatch || emailMatch || paymentStatusMatch;
  });
}

/**
 * Sort rows by key and direction
 */
export function sortRows(rows, sort) {
  const getter = SORT_KEYS[sort.key];
  if (!getter) return rows;
  const mul = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return 0;
  });
}

/**
 * Toggle sort direction or switch to new key
 */
export function toggleSort(prev, key) {
  if (prev.key === key)
    return { key, dir: prev.dir === "asc" ? "desc" : "asc" };

  const defaultDir = ["date", "price", "completed", "payment_status"].includes(key)
    ? "desc"
    : "asc";
  return { key, dir: defaultDir };
}

export const TRACKING_PREFIXES = ["RT", "RU", "LA", "LL", "RL"];

export function hasAllowedTrackingCode(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return false;
  const prefixes = TRACKING_PREFIXES.join("|");
  const pattern = new RegExp(`(?:^|[^A-Z0-9])(?:${prefixes})(?=$|\\d|[^A-Z0-9])`);
  return pattern.test(normalized);
}
