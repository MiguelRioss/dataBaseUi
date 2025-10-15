// src/constants/shipmentStatus.js

export const SHIPMENT_STATUS_KEYS = [
  "awaiting_ctt",
  "accepted",
  "in_transit",
  "in_delivery",
  "delivered",
];

export const SHIPMENT_STATUS_LABELS = {
  awaiting_ctt: "Awaiting CTT",
  accepted: "Accepted",
  in_transit: "In Transit",
  in_delivery: "In Delivery",
  delivered: "Delivered",
};

// Canonical steps in order for UI tables or progress displays
export const SHIPMENT_STATUS_STEPS = SHIPMENT_STATUS_KEYS.map((key) => ({
  key,
  label: SHIPMENT_STATUS_LABELS[key],
}));

export function normalizeShipmentStatus(rawStatus = {}) {
  return SHIPMENT_STATUS_KEYS.reduce((acc, key) => {
    const step = rawStatus?.[key];
    if (step && typeof step === "object" && !Array.isArray(step)) {
      acc[key] = {
        status: !!step.status,
        date: step.date ?? null,
        time: step.time ?? null,
      };
    } else {
      acc[key] = { status: !!step, date: null, time: null };
    }
    return acc;
  }, {});
}

// Optional: default blank structure (useful for initializing)
export const EMPTY_SHIPMENT_STATUS = SHIPMENT_STATUS_KEYS.reduce(
  (acc, key) => ({
    ...acc,
    [key]: { status: false, date: null, time: null },
  }),
  {}
);
