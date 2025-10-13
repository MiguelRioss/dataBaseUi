// hooks/useOrderForm.js
import { useState, useCallback } from "react";
import {
  calculateOrderTotalCents,
  centsToEuroInput,
  sanitizeMoneyInput,
  createEmptyItem,
  DEFAULT_DIAL_CODE,
  setNestedValue,
  normalizeAddressPhone,
} from "../utils/NewOrderUtils.jsx";

export function useOrderForm({ sameAsShipping, products }) {
  const [form, setForm] = useState();

  const handleChange = useCallback(
    (path, value) => {
      setForm((prev) => {
        let next = setNestedValue(prev, path, value);
        if (sameAsShipping && path.startsWith("shipping_address.")) {
          const field = path.replace("shipping_address.", "");
          next = setNestedValue(next, `billing_address.${field}`, value);
        }
        if (path.startsWith("items.") && (path.includes(".quantity") || path.includes(".unit_amount"))) {
          const totalCents = calculateOrderTotalCents(next.items, next.shipping_cost);
          next = { ...next, amount_total: centsToEuroInput(totalCents) };
        }
        return next;
      });
    },
    [sameAsShipping]
  );

  const handleAddItem = useCallback(() => {
    setForm((prev) => {
      const nextItems = [...prev.items, createEmptyItem()];
      const total = calculateOrderTotalCents(nextItems, prev.shipping_cost);
      return { ...prev, items: nextItems, amount_total: centsToEuroInput(total) };
    });
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      const nextItems = prev.items.filter((_, i) => i !== index);
      const total = calculateOrderTotalCents(nextItems, prev.shipping_cost);
      return { ...prev, items: nextItems, amount_total: centsToEuroInput(total) };
    });
  }, []);

  return { form, setForm, handleChange, handleAddItem, handleRemoveItem };
}
