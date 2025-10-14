// hooks/useOrderForm.js
import { useState, useCallback } from "react";
import {
  calculateOrderTotalCents,
  centsToEuroInput,
  sanitizeMoneyInput,
  createEmptyItem,
  setNestedValue,
  createInitialForm,
} from "../utils/NewOrderUtils.jsx";

export function useOrderForm({ sameAsShipping, products }) {
  const [form, setForm] = useState(() => createInitialForm());

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

  const handleSelectProduct = useCallback(
    (index, productId) => {
      setForm((prev) => {
        if (!prev.items[index]) return prev;

        const product =
          products?.find?.((candidate) => candidate.id === String(productId)) ??
          null;

        const nextItems = prev.items.map((item, idx) => {
          if (idx !== index) return item;

          const nextItem = {
            ...item,
            id: String(productId ?? ""),
            name: product?.name ?? "",
          };

          if (!productId) {
            nextItem.unit_amount = sanitizeMoneyInput(nextItem.unit_amount);
            return nextItem;
          }

          if (product?.priceInCents != null) {
            nextItem.unit_amount = centsToEuroInput(product.priceInCents);
          }

          if (!nextItem.quantity || Number(nextItem.quantity) <= 0) {
            nextItem.quantity = "1";
          }

          return nextItem;
        });

        const totalCents = calculateOrderTotalCents(
          nextItems,
          prev.shipping_cost
        );
        return {
          ...prev,
          items: nextItems,
          amount_total: centsToEuroInput(totalCents),
        };
      });
    },
    [products]
  );

  const handleShippingCostChange = useCallback((value) => {
    setForm((prev) => {
      const sanitized = sanitizeMoneyInput(value);
      const totalCents = calculateOrderTotalCents(prev.items, sanitized);
      return {
        ...prev,
        shipping_cost: sanitized,
        amount_total: centsToEuroInput(totalCents),
      };
    });
  }, []);

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

  return {
    form,
    setForm,
    handleChange,
    handleSelectProduct,
    handleShippingCostChange,
    handleAddItem,
    handleRemoveItem,
  };
}
