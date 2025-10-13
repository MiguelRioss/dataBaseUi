/**
 * -------------------------------
 * ORDER & ADDRESS UTILITY HELPERS
 * -------------------------------
 * Common reusable functions for:
 *  - Deep object updates
 *  - Currency conversion
 *  - Phone normalization
 *  - Item and order total calculations
 *  - Address normalization
 */

/* ------------------ GENERAL HELPERS ------------------ */

/**
 * Deeply sets a nested value in an object based on a dot-notation path.
 * Creates intermediate arrays or objects if missing.
 * @param {object} obj - Target object.
 * @param {string|string[]} path - Dot-notation or array path (e.g. "status.in_transit.date").
 * @param {*} value - Value to assign.
 * @returns {object} A new object with the updated value.
 */
export function setNestedValue(obj, path, value) {
  const SEGMENT_IS_INDEX = /^\d+$/;
  const segments = Array.isArray(path) ? path : String(path).split(".");

  const apply = (current, idx) => {
    const segment = segments[idx];
    const key = SEGMENT_IS_INDEX.test(segment) ? Number(segment) : segment;
    const isArrayKey = typeof key === "number";
    const container =
      current == null
        ? isArrayKey
          ? []
          : {}
        : Array.isArray(current)
        ? [...current]
        : { ...current };

    if (idx === segments.length - 1) {
      container[key] = value;
      return container;
    }

    const nextCurrent =
      current != null && typeof current === "object" ? current[key] : undefined;
    container[key] = apply(nextCurrent, idx + 1);
    return container;
  };

  return apply(obj, 0);
}

/* ------------------ CURRENCY HELPERS ------------------ */

/**
 * Converts a euro string (e.g. "12.34") into integer cents (1234).
 */
export const euroStringToCents = (value) =>
  Math.round((Number(value) || 0) * 100);

/**
 * Converts integer cents into a string suitable for numeric inputs.
 */
export const centsToEuroInput = (cents) => {
  if (!cents) return "0";
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
};

/**
 * Formats integer cents into a localized Euro currency string.
 */
const EUR_FORMATTER = new Intl.NumberFormat("en-PT", {
  style: "currency",
  currency: "EUR",
});
export const formatCents = (cents) =>
  EUR_FORMATTER.format((Number(cents) || 0) / 100);

/**
 * Sanitizes user input for money fields, ensuring valid positive numeric format.
 */
export const sanitizeMoneyInput = (value) => {
  if (value === "" || value == null) return "0";
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "0";
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

/* ------------------ ORDER CALCULATIONS ------------------ */

/**
 * Calculates total cost (in cents) for a list of line items.
 */
export const calculateItemsTotalCents = (items = []) =>
  items.reduce(
    (sum, item) =>
      sum +
      (Number(item?.quantity) || 0) * euroStringToCents(item?.unit_amount),
    0
  );

/**
 * Calculates full order total (items + shipping) in cents.
 */
export const calculateOrderTotalCents = (items = [], shippingCost = "0") =>
  calculateItemsTotalCents(items) + euroStringToCents(shippingCost);

/* ------------------ PHONE & ADDRESS HELPERS ------------------ */

export const DEFAULT_DIAL_CODE = "+351";

/**
 * Creates a blank address object.
 */
export const createEmptyAddress = () => ({
  name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "",
  phone: "",
  phone_prefix: DEFAULT_DIAL_CODE,
  phone_number: "",
});

/**
 * Creates a blank item object.
 */
export const createEmptyItem = () => ({
  id: "",
  name: "",
  quantity: 1,
  unit_amount: "0",
});

/**
 * Splits a phone number string into dial code and local number parts.
 */
const PHONE_SPLIT_REGEX = /^(\+\d{1,4})(?:\s*)(.*)$/;
export const splitPhoneValue = (phone = "") => {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return { prefix: "", number: "" };
  const match = trimmed.match(PHONE_SPLIT_REGEX);
  if (match) {
    return {
      prefix: match[1] ?? "",
      number: (match[2] ?? "").trim(),
    };
  }
  return { prefix: "", number: trimmed };
};

/**
 * Resolves dial code and phone number parts from a raw address object.
 */
export const resolveAddressPhoneParts = (address = {}) => {
  if (!address || typeof address !== "object") {
    return { dialCode: DEFAULT_DIAL_CODE, number: "" };
  }

  const rawPrefix =
    typeof address.phone_prefix === "string"
      ? address.phone_prefix.trim()
      : "";
  const rawNumber =
    typeof address.phone_number === "string"
      ? address.phone_number.trim()
      : "";

  if (rawPrefix && rawNumber) {
    return { dialCode: rawPrefix, number: rawNumber };
  }

  const parsed = splitPhoneValue(address.phone);
  return {
    dialCode: rawPrefix || parsed.prefix || DEFAULT_DIAL_CODE,
    number: rawNumber || parsed.number || "",
  };
};

/**
 * Normalizes an address' phone fields into consistent format:
 * - Ensures phone_prefix / phone_number are separated
 * - Builds combined `phone` string
 */
export const normalizeAddressPhone = (address = {}) => {
  const base =
    address && typeof address === "object" ? { ...address } : {};
  const { dialCode, number } = resolveAddressPhoneParts(base);
  const trimmedDial = dialCode || DEFAULT_DIAL_CODE;
  const trimmedNumber = (number || "").trim();
  const existingPhone = (base.phone || "").trim();
  const phoneValue = trimmedNumber
    ? `${trimmedDial} ${trimmedNumber}`.trim()
    : existingPhone;

  return {
    ...base,
    phone_prefix: trimmedDial,
    phone_number: trimmedNumber,
    phone: phoneValue,
  };
};

/* ------------------ FORM HELPERS ------------------ */

/**
 * Creates an empty order form template with basic defaults.
 */
export const createInitialForm = () => ({
  name: "",
  email: "",
  phone: "",
  phonePrefix: DEFAULT_DIAL_CODE,
  phoneNumber: "",
  amount_total: "0",
  currency: "EUR",
  payment_provider: "revolut",
  payment_id: "",
  shipping_cost: "0",
  shipping_address: createEmptyAddress(),
  billing_address: createEmptyAddress(),
  items: [createEmptyItem()],
});
