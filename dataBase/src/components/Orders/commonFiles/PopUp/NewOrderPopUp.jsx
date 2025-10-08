import React, { useState, useCallback, useEffect } from "react";
import ModalPortal from "./ModalPortal";
import fetchStock from "../../../services/StockAPI";
import { createOrder as createOrderService } from "../../../services/orderServices.mjs";

const SEGMENT_IS_INDEX = /^\d+$/;
const EUR_FORMATTER = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

function setNestedValue(obj, path, value) {
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

const euroStringToCents = (value) => Math.round((Number(value) || 0) * 100);
const centsToEuroInput = (cents) => {
  if (!cents) return "0";
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
};
const formatCents = (cents) => EUR_FORMATTER.format((Number(cents) || 0) / 100);
const sanitizeMoneyInput = (value) => {
  if (value === "" || value == null) return "0";
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "0";
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const calculateItemsTotalCents = (items = []) =>
  items.reduce(
    (sum, item) =>
      sum +
      (Number(item?.quantity) || 0) * euroStringToCents(item?.unit_amount),
    0
  );

const calculateOrderTotalCents = (items = [], shippingCost = "0") =>
  calculateItemsTotalCents(items) + euroStringToCents(shippingCost);

const createEmptyAddress = () => ({
  line1: "",
  city: "",
  postal_code: "",
  country: "",
});

const createEmptyItem = () => ({
  id: "",
  name: "",
  quantity: 1,
  unit_amount: "0",
});

const createInitialForm = () => ({
  name: "",
  email: "",
  phone: "",
  phonePrefix: "+351",
  phoneNumber: "",
  amount_total: "0",
  currency: "EUR",
  shipping_cost: "0",
  shipping_address: createEmptyAddress(),
  billing_address: createEmptyAddress(),
  items: [createEmptyItem()],
});

export default function NewOrderPopup({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [form, setForm] = useState(createInitialForm);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) setSubmitError("");
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
        if (!cancelled) setProductsError(err?.message || String(err));
      } finally {
        if (!cancelled) setProductsLoading(false);
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

  const handleRemoveItem = (index) =>
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

  const handleSelectProduct = useCallback(
    (index, productId) => {
      setForm((prev) => {
        const nextItems = prev.items.map((item, idx) => {
          if (idx !== index) return item;
          if (!productId)
            return { ...item, id: "", name: "", unit_amount: "0" };

          const product = products.find((p) => p.id === productId);
          const safeQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
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

  const handleToggleSameAs = (checked) => {
    setSameAsShipping(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        billing_address: { ...prev.shipping_address },
      }));
    }
  };

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

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setSubmitError(
        "Please fill in all customer fields (name, email, phone)."
      );
      return;
    }

    const shippingAddress = { ...form.shipping_address };
    const billingAddress = sameAsShipping
      ? { ...form.shipping_address }
      : { ...form.billing_address };

    const cleanedItems = form.items.map((item) => ({
      ...item,
      id: Number(item.id),
      quantity: Number(item.quantity),
      unit_amount: euroStringToCents(item.unit_amount),
    }));

    const shippingCostCents = euroStringToCents(form.shipping_cost);
    const totalCents = calculateOrderTotalCents(form.items, form.shipping_cost);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      amount_total: totalCents,
      currency: form.currency,
      items: cleanedItems,
      status: {
        accepted: { status: false },
        in_transit: { status: false },
        delivered: { status: false },
        acceptedInCtt: { status: false },
        wating_to_Be_Delivered: { status: false },
      },
      metadata: {
        phone: form.phone,

        full_name: form.name,
        email: form.email,
        billing_same_as_shipping: sameAsShipping,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        shipping_cost_cents: shippingCostCents,
        notes: "",
      },
      fulfilled: false,
      email_sent: false,
      track_url: "",
    };

    console.log("Submitting new order:", payload);
    setSubmitError("");
    setSaving(true);
    try {
      const createdOrder = await createOrderService(payload);
      if (!createdOrder?.id)
        throw new Error("Order API did not return an order id.");
      onCreate?.(createdOrder);
      setForm(createInitialForm());
      setSameAsShipping(true);
      setOpen(false);
    } catch (err) {
      setSubmitError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--xl btn--ghost w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        Create Manual Order
      </button>

      <ModalPortal
        title="Create New Order"
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="new-order-layout text-sm grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/*──────────────────────────────*/}
          {/* LEFT COLUMN – CUSTOMER INFO  */}
          {/*──────────────────────────────*/}
          <div className="new-order-col">
            <Section title="Customer Info">
              <div className="new-order-grid">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />

                {/* ✅ Phone inline row */}
                <div className="flex flex-col">
                  <span className="new-order-label mb-1">Phone</span>
                  <div className="flex items-center gap-2">
                    <select
                      className="new-order-input w-24"
                      value={form.phonePrefix || "+351"}
                      onChange={(e) => {
                        const prefix = e.target.value;
                        const number = form.phoneNumber || "";
                        handleChange("phone", `${prefix} ${number}`.trim());
                        setForm((prev) => ({
                          ...prev,
                          phonePrefix: prefix,
                          phoneNumber: number,
                        }));
                      }}
                    >
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+49">🇩🇪 +49</option>
                    </select>
                    <input
                      type="tel"
                      className="new-order-input flex-1"
                      placeholder="Enter phone number"
                      value={form.phoneNumber || ""}
                      onChange={(e) => {
                        const number = e.target.value;
                        const prefix = form.phonePrefix || "+351";
                        handleChange("phone", `${prefix} ${number}`.trim());
                        setForm((prev) => ({
                          ...prev,
                          phoneNumber: number,
                          phonePrefix: prefix,
                        }));
                      }}
                    />
                  </div>
                </div>

                <Input
                  label="Currency"
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                />
                <label className="new-order-field new-order-field--full">
                  <span className="new-order-label">Shipment (EUR)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="new-order-input"
                    value={form.shipping_cost}
                    onChange={(e) => handleShippingCostChange(e.target.value)}
                  />
                </label>
                <Input
                  label="Total (EUR)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount_total}
                  onChange={(e) => handleChange("amount_total", e.target.value)}
                />
              </div>
            </Section>
            <Section title="Items">
              {productsLoading && (
                <div className="new-order-hint">Loading products...</div>
              )}
              {productsError && (
                <div className="new-order-hint new-order-hint--error">
                  {productsError}
                </div>
              )}

              {form.items.map((item, index) => (
                <div
                  key={`${index}-${item.id || "item"}`}
                  className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 shadow-inner"
                >
                  <div className="new-order-grid">
                    <label className="new-order-field new-order-field--full">
                      <span className="new-order-label">Product</span>
                      <select
                        className="new-order-input"
                        value={item.id}
                        onChange={(e) =>
                          handleSelectProduct(index, e.target.value)
                        }
                        disabled={productsLoading}
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <span className="new-order-hint">
                        {item.id
                          ? (() => {
                              const product = products.find(
                                (p) => p.id === item.id
                              );
                              if (!product) return "Product not found";
                              return `Stock: ${
                                product.stockValue ?? 0
                              } | Price: ${
                                product.priceInCents != null
                                  ? formatCents(product.priceInCents)
                                  : "N/A"
                              }`;
                            })()
                          : "Choose a product"}
                      </span>
                    </label>
                    <Input
                      label="Quantity"
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleChange(`items.${index}.quantity`, e.target.value)
                      }
                    />
                    <Input
                      label="Unit Amount (EUR)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_amount}
                      onChange={(e) =>
                        handleChange(
                          `items.${index}.unit_amount`,
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      className="btn btn--ghost new-order-action"
                      onClick={() => handleRemoveItem(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove Item
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn--ghost new-order-action"
                onClick={handleAddItem}
              >
                + Add Item
              </button>
            </Section>
          </div>

          {/*──────────────────────────────*/}
          {/* RIGHT COLUMN – ORDER DETAILS */}
          {/*──────────────────────────────*/}
          <div className="new-order-col space-y-8">
            {/*────────────────────────────*/}
            {/* ITEMS SECTION */}
            {/*────────────────────────────*/}

            {/*────────────────────────────*/}
            {/* SHIPPING ADDRESS */}
            {/*────────────────────────────*/}
            <Section title="Shipping Address">
              <div className="new-order-grid">
                {["line1", "city", "postal_code", "country"].map((f) => (
                  <Input
                    key={f}
                    label={f.replace("_", " ").toUpperCase()}
                    value={form.shipping_address[f]}
                    onChange={(e) =>
                      handleChange(`shipping_address.${f}`, e.target.value)
                    }
                  />
                ))}
              </div>
            </Section>

            {/*────────────────────────────*/}
            {/* BILLING ADDRESS */}
            {/*────────────────────────────*/}
            <Section title="Billing Address">
              <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <label className="flex items-center gap-3 text-gray-200 text-sm">
                  <input
                    id="sameAsShipping"
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => handleToggleSameAs(e.target.checked)}
                    className="h-4 w-4 accent-green-500"
                  />
                  Use same as shipping address
                </label>

                {!sameAsShipping && (
                  <div className="new-order-grid">
                    {["line1", "city", "postal_code", "country"].map((f) => (
                      <Input
                        key={f}
                        label={f.replace("_", " ").toUpperCase()}
                        value={form.billing_address[f]}
                        onChange={(e) =>
                          handleChange(`billing_address.${f}`, e.target.value)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 mt-8">
          {submitError && (
            <div className="new-order-hint new-order-hint--error text-right">
              {submitError}
            </div>
          )}
          <button
            type="button"
            className="btn btn--xl btn--primary px-8"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      </ModalPortal>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-white border-b border-gray-700 pb-1">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", disabled, ...rest }) {
  return (
    <label className="new-order-field">
      <span className="new-order-label">{label}</span>
      <input
        type={type}
        className={`new-order-input${disabled ? " is-disabled" : ""}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
    </label>
  );
}
