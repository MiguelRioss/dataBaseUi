import React, { useState, useCallback, useEffect } from "react";
import ModalPortal from "./ModalPortal";
import NewOrderForm from "./NewOrderForm";
import fetchStock from "../../../services/StockAPI";
import {
  createOrderServices,
  getOrderById,
  updateOrder,
} from "../../../services/orderServices.mjs";
import {
  setNestedValue,
  euroStringToCents,
  centsToEuroInput,
  calculateOrderTotalCents,
  sanitizeMoneyInput,
  createEmptyItem,
  createEmptyAddress,
  createInitialForm,
  DEFAULT_DIAL_CODE,
  normalizeAddressPhone,
  resolveAddressPhoneParts,
  splitPhoneValue,
  formatCents,
} from "./utils/NewOrderUtils.jsx";

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

const normalizeItemIdForPayload = (value) => {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed);
  return !Number.isNaN(numeric) && trimmed === String(numeric)
    ? numeric
    : trimmed;
};

const normalizeItemIdForComparison = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

function normalizeAddressForPayload(address = {}) {
  const normalized = normalizeAddressPhone(address ?? {});
  const result = {};
  ADDRESS_KEYS.forEach((key) => {
    const value = normalized[key];
    if (value == null) {
      result[key] = "";
    } else if (typeof value === "string") {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  });
  return result;
}

const stableSerialize = (value) => {
  if (value === null) return "null";
  if (typeof value !== "object") {
    return JSON.stringify(
      typeof value === "string" ? value.trim ? value.trim() : value : value
    );
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
};

const deepEqual = (a, b) => stableSerialize(a) === stableSerialize(b);

function buildComparableFromOrder(order = {}) {
  if (!order || typeof order !== "object") return null;
  const metadata = order.metadata ?? {};
  const shippingAddress = normalizeAddressForPayload(
    metadata.shipping_address ?? createEmptyAddress()
  );
  const billingAddress = normalizeAddressForPayload(
    metadata.billing_address ?? createEmptyAddress()
  );

  return {
    name: order.name ?? "",
    email: order.email ?? "",
    phone: order.phone ?? "",
    amount_total: Number(order.amount_total ?? 0),
    currency: order.currency ?? "EUR",
    payment_id:
      order.payment_id ??
      metadata.payment_id ??
      "",
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: normalizeItemIdForComparison(
            item?.id ?? item?.product_id ?? ""
          ),
          name: item?.name ?? "",
          quantity: Number(item?.quantity ?? 0),
          unit_amount: Number(
            item?.unit_amount != null
              ? item.unit_amount
              : item?.unit_amount_cents ?? 0
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
    },
  };
}

function buildPayloadFromForm(
  form,
  sameAsShipping,
  { includeStatusDefaults = false, baseMetadata } = {}
) {
  const shippingAddress = normalizeAddressForPayload(
    form.shipping_address ?? {}
  );
  const billingAddress = sameAsShipping
    ? normalizeAddressForPayload(form.shipping_address ?? {})
    : normalizeAddressForPayload(form.billing_address ?? {});

  const metadataBase =
    baseMetadata && typeof baseMetadata === "object" ? { ...baseMetadata } : {};

  const metadata = {
    ...metadataBase,
    payment_provider:
      form.payment_provider ||
      metadataBase.payment_provider ||
      "revolut",
    billing_same_as_shipping: sameAsShipping,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    shipping_cost_cents: euroStringToCents(form.shipping_cost),
  };

  const items = (form.items || []).map((item) => ({
    id: normalizeItemIdForPayload(item?.id ?? ""),
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

function computeChanges(original, next) {
  if (!original) return next;
  const changes = {};

  const compare = (key, transform = (val) => val) => {
    const prevVal = transform(original[key]);
    const nextVal = transform(next[key]);
    if (!deepEqual(prevVal, nextVal)) {
      changes[key] = nextVal;
    }
  };

  compare("name", (val) => (val ?? "").trim());
  compare("email", (val) => (val ?? "").trim());
  compare("phone", (val) => (val ?? "").trim());
  compare("amount_total", (val) => Number(val ?? 0));
  compare("currency", (val) => (val ?? "").trim());
  compare("payment_id", (val) => (val ?? "").trim());
  compare("items");
  compare("metadata");

  return changes;
}

function buildFormStateFromOrder(order) {
  const comparable = buildComparableFromOrder(order);
  if (!comparable) {
    return {
      form: createInitialForm(),
      sameAsShipping: true,
      comparable: null,
    };
  }

  const { prefix, number } = splitPhoneValue(comparable.phone);
  const phonePrefix = prefix || DEFAULT_DIAL_CODE;
  const phoneNumber = number || "";

  const metadata = comparable.metadata ?? {};
  const shippingAddress = normalizeAddressForPayload(
    metadata.shipping_address ?? createEmptyAddress()
  );
  const billingAddressRaw = normalizeAddressForPayload(
    metadata.billing_address ?? createEmptyAddress()
  );

  const sameAsShipping =
    metadata.billing_same_as_shipping !== undefined
      ? !!metadata.billing_same_as_shipping
      : deepEqual(shippingAddress, billingAddressRaw);

  const items =
    comparable.items && comparable.items.length
      ? comparable.items.map((item) => ({
          id:
            item.id != null && item.id !== ""
              ? String(item.id)
              : "",
          name: item.name ?? "",
          quantity:
            Number(item.quantity ?? 0) > 0
              ? Number(item.quantity)
              : 1,
          unit_amount: centsToEuroInput(item.unit_amount ?? 0),
        }))
      : [createEmptyItem()];

  const form = {
    name: comparable.name ?? "",
    email: comparable.email ?? "",
    phone:
      comparable.phone ||
      `${phonePrefix} ${phoneNumber}`.trim(),
    phonePrefix,
    phoneNumber,
    amount_total: centsToEuroInput(comparable.amount_total ?? 0),
    currency: comparable.currency ?? "EUR",
    payment_provider: metadata.payment_provider ?? "revolut",
    payment_id: comparable.payment_id ?? "",
    shipping_cost: centsToEuroInput(metadata.shipping_cost_cents ?? 0),
    shipping_address: { ...shippingAddress },
    billing_address: sameAsShipping
      ? { ...shippingAddress }
      : { ...billingAddressRaw },
    items,
  };

  return { form, sameAsShipping, comparable };
}

export default function NewOrderPopup({ onCreate }) {
  const [form, setForm] = useState(createInitialForm);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrderInput, setEditOrderInput] = useState("");
  const [editModalError, setEditModalError] = useState("");
  const [editModalSaving, setEditModalSaving] = useState(false);

  const [editingOrderId, setEditingOrderId] = useState(null);
  const [originalOrderComparable, setOriginalOrderComparable] = useState(null);
  const [originalOrderMetadata, setOriginalOrderMetadata] = useState(null);

  useEffect(() => {
    if (open) {
      setSubmitError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || products.length) return;
    let cancelled = false;

    (async () => {
      setProductsLoading(true);
      setProductsError("");
      try {
        const result = await fetchStock();
        const list = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result)
          ? result
          : result?.items && typeof result.items === "object"
          ? Object.values(result.items)
          : [];
        if (!cancelled) {
          setProducts(
            list
              .map((item) => ({
                id: String(item?.id ?? ""),
                name: item?.name ?? "",
                stockValue: Number(item?.stockValue ?? 0),
                priceInCents:
                  item?.priceInCents != null
                    ? Number(item.priceInCents)
                    : item?.priceInEuros != null
                    ? Math.round(Number(item.priceInEuros) * 100)
                    : null,
              }))
              .filter((p) => p.id && p.name)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setProductsError(err?.message || String(err));
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, products.length]);

  const handleChange = useCallback(
    (path, value) => {
      setForm((prev) => {
        let next = setNestedValue(prev, path, value);
        if (sameAsShipping && path.startsWith("shipping_address.")) {
          const field = path.replace("shipping_address.", "");
          next = setNestedValue(next, `billing_address.${field}`, value);
        }
        if (
          path.startsWith("items.") &&
          (path.includes(".quantity") || path.includes(".unit_amount"))
        ) {
          const totalCents = calculateOrderTotalCents(
            next.items,
            next.shipping_cost
          );
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
      const nextTotal = calculateOrderTotalCents(nextItems, prev.shipping_cost);
      return {
        ...prev,
        items: nextItems,
        amount_total: centsToEuroInput(nextTotal),
      };
    });
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      const nextItems = prev.items.filter((_, i) => i !== index);
      const nextTotal = calculateOrderTotalCents(nextItems, prev.shipping_cost);
      return {
        ...prev,
        items: nextItems,
        amount_total: centsToEuroInput(nextTotal),
      };
    });
  }, []);

  const handleSelectProduct = useCallback(
    (index, productId) => {
      setForm((prev) => {
        const nextItems = prev.items.map((item, idx) => {
          if (idx !== index) return item;
          if (!productId) {
            return { ...item, id: "", name: "", unit_amount: "0" };
          }

          const product = products.find((p) => p.id === productId);
          const safeQty =
            Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const priceCents = product?.priceInCents ?? null;
          return {
            ...item,
            id: productId,
            name: product?.name ?? "",
            quantity: safeQty,
            unit_amount:
              priceCents != null
                ? centsToEuroInput(priceCents)
                : item.unit_amount,
          };
        });

        const nextTotal = calculateOrderTotalCents(
          nextItems,
          prev.shipping_cost
        );
        return {
          ...prev,
          items: nextItems,
          amount_total: centsToEuroInput(nextTotal),
        };
      });
    },
    [products]
  );

  const updateCustomerPhone = useCallback((nextPrefix, nextNumber) => {
    setForm((prev) => {
      const prefix =
        nextPrefix != null && nextPrefix !== ""
          ? nextPrefix
          : prev.phonePrefix || DEFAULT_DIAL_CODE;
      const number =
        nextNumber != null ? nextNumber : prev.phoneNumber || "";
      const phone = `${prefix} ${number}`.trim();
      const withPhone = setNestedValue(prev, "phone", phone);
      return {
        ...withPhone,
        phonePrefix: prefix,
        phoneNumber: number,
      };
    });
  }, []);

  const handleCustomerPhonePrefixChange = useCallback(
    (prefix) => {
      updateCustomerPhone(prefix, undefined);
    },
    [updateCustomerPhone]
  );

  const handleCustomerPhoneNumberChange = useCallback(
    (number) => {
      updateCustomerPhone(undefined, number);
    },
    [updateCustomerPhone]
  );

  const handleToggleSameAs = useCallback((checked) => {
    setSameAsShipping(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        billing_address: normalizeAddressPhone(prev.shipping_address),
      }));
    }
  }, []);

  const handleShippingCostChange = useCallback((value) => {
    setForm((prev) => {
      const shipping = sanitizeMoneyInput(value);
      const totalCents = calculateOrderTotalCents(prev.items, shipping);
      return {
        ...prev,
        shipping_cost: shipping,
        amount_total: centsToEuroInput(totalCents),
      };
    });
  }, []);

  const resetFormState = useCallback(() => {
    setForm(createInitialForm());
    setSameAsShipping(true);
    setEditingOrderId(null);
    setOriginalOrderComparable(null);
    setOriginalOrderMetadata(null);
    setSubmitError("");
  }, []);

  const handleCloseForm = useCallback(() => {
    setOpen(false);
    setMode("create");
    resetFormState();
  }, [resetFormState]);

  const handleOpenCreate = useCallback(() => {
    setMode("create");
    resetFormState();
    setOpen(true);
  }, [resetFormState]);

  const handleOpenEditModal = useCallback(() => {
    setEditModalError("");
    setEditModalSaving(false);
    setEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditModalSaving(false);
    setEditModalError("");
  }, []);

  const handleEditSubmit = useCallback(async () => {
    const trimmed = String(editOrderInput ?? "").trim();
    if (!trimmed) {
      setEditModalError("Please enter an order ID.");
      return;
    }

    try {
      setEditModalSaving(true);
      setEditModalError("");
      const order = await getOrderById(trimmed);
      if (!order) {
        setEditModalError(`Order ${trimmed} not found.`);
        return;
      }

      const { form: hydratedForm, sameAsShipping: sameFlag, comparable } =
        buildFormStateFromOrder(order);

      setMode("edit");
      setEditingOrderId(order.id);
      setOriginalOrderComparable(comparable);
      setOriginalOrderMetadata(order.metadata ?? {});
      setForm(hydratedForm);
      setSameAsShipping(sameFlag);
      setSubmitError("");

      setEditModalOpen(false);
      setOpen(true);
    } catch (err) {
      setEditModalError(err?.message || String(err));
    } finally {
      setEditModalSaving(false);
    }
  }, [editOrderInput]);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setSubmitError("Please fill in all customer fields (name, email, phone).");
      return;
    }

    const includeStatusDefaults = mode === "create";
    const payload = buildPayloadFromForm(form, sameAsShipping, {
      includeStatusDefaults,
      baseMetadata: mode === "edit" ? originalOrderMetadata : undefined,
    });

    setSubmitError("");
    setSaving(true);
    try {
      if (mode === "create") {
        const createdOrder = await createOrderServices(payload);
        if (!createdOrder?.id)
          throw new Error("Order API did not return an order id.");
        onCreate?.(createdOrder);
        handleCloseForm();
      } else {
        if (!editingOrderId) {
          throw new Error("No order selected for editing.");
        }
        const changes = computeChanges(originalOrderComparable, payload);
        if (!changes || Object.keys(changes).length === 0) {
          setSubmitError("No changes detected.");
          setSaving(false);
          return;
        }

        const response = await updateOrder(editingOrderId, changes);
        let updatedOrder = response?.order ?? response;
        if (!updatedOrder || !updatedOrder.id) {
          updatedOrder = await getOrderById(editingOrderId);
        }
        if (updatedOrder?.id) {
          onCreate?.(updatedOrder);
        }
        handleCloseForm();
      }
    } catch (err) {
      setSubmitError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    form,
    sameAsShipping,
    mode,
    originalOrderMetadata,
    originalOrderComparable,
    editingOrderId,
    onCreate,
    handleCloseForm,
  ]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          type="button"
          className="btn btn--xl btn--ghost w-full sm:w-auto"
          onClick={handleOpenEditModal}
        >
          Edit Order
        </button>
        <button
          type="button"
          className="btn btn--xl btn--ghost w-full sm:w-auto"
          onClick={handleOpenCreate}
        >
          Create Manual Order
        </button>
      </div>

      <ModalPortal
        title={mode === "edit" ? `Edit Order ${editingOrderId ?? ""}` : "Create New Order"}
        open={open}
        onClose={handleCloseForm}
      >
        <NewOrderForm
          form={form}
          sameAsShipping={sameAsShipping}
          products={products}
          productsLoading={productsLoading}
          productsError={productsError}
          saving={saving}
          submitError={submitError}
          defaultDialCode={DEFAULT_DIAL_CODE}
          resolveAddressPhoneParts={resolveAddressPhoneParts}
          formatPrice={formatCents}
          onFieldChange={handleChange}
          onShippingCostChange={handleShippingCostChange}
          onSelectProduct={handleSelectProduct}
          onRemoveItem={handleRemoveItem}
          onAddItem={handleAddItem}
          onToggleSameAs={handleToggleSameAs}
          onSubmit={handleSubmit}
          onCustomerPhonePrefixChange={handleCustomerPhonePrefixChange}
          onCustomerPhoneNumberChange={handleCustomerPhoneNumberChange}
          submitLabel={mode === "edit" ? "Save Changes" : "Save Order"}
          submitSavingLabel={mode === "edit" ? "Saving..." : "Saving..."}
        />
      </ModalPortal>

      <ModalPortal
        title="Edit Order"
        open={editModalOpen}
        onClose={handleCloseEditModal}
      >
        <div className="space-y-4">
          <label className="new-order-field new-order-field--full">
            <span className="new-order-label">Order ID</span>
            <input
              type="text"
              className="new-order-input"
              placeholder="Enter order ID"
              value={editOrderInput}
              onChange={(e) => setEditOrderInput(e.target.value)}
              disabled={editModalSaving}
            />
          </label>
          {editModalError ? (
            <div className="new-order-hint new-order-hint--error">
              {editModalError}
            </div>
          ) : (
            <div className="new-order-hint">
              Provide the order ID to load and edit.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCloseEditModal}
              disabled={editModalSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleEditSubmit}
              disabled={editModalSaving}
            >
              {editModalSaving ? "Loading..." : "Confirm"}
            </button>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

