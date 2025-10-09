import React, { useState, useCallback, useEffect } from "react";
import ModalPortal from "./ModalPortal";
import fetchStock from "../../../services/StockAPI";
import { createOrderServices } from "../../../services/orderServices.mjs";

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
  name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "",
  phone: "",
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
  payment_provider: "revolut",
  payment_id: "",
  shipping_cost: "0",
  shipping_address: createEmptyAddress(),
  billing_address: createEmptyAddress(),
  items: [createEmptyItem()],
});

const PAYMENT_OPTIONS = [
  { label: "Revolut", value: "revolut", Icon: RevolutIcon },
  { label: "Wise", value: "wise", Icon: WiseIcon },
  { label: "Bank Transfer", value: "bank_transfer", Icon: BankTransferIcon },
];

const ADDRESS_FIELD_CONFIG = [
  { key: "name", label: "Contact Name" },
  { key: "line1", label: "Address Line 1" },
  { key: "line2", label: "Address Line 2", optional: true },
  { key: "city", label: "City" },
  { key: "postal_code", label: "Postal Code" },
  { key: "country", label: "Country" },
  { key: "phone", label: "Phone", type: "tel" },
];

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
      payment_id: form.payment_id,
      items: cleanedItems,
      status: {
        accepted: { status: false },
        in_transit: { status: false },
        delivered: { status: false },
        acceptedInCtt: { status: false },
        waiting_to_be_delivered: { status: false },
      },
      metadata: {
        payment_provider: form.payment_provider,
        billing_same_as_shipping: sameAsShipping,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        shipping_cost_cents: shippingCostCents,
      },
      track_url: "",
    };

    console.log("Submitting new order:", payload);
    setSubmitError("");
    setSaving(true);
    try {
      const createdOrder = await createOrderServices(payload);
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
                <div className="new-order-field new-order-field--full">
                  <span className="new-order-label">Payment Method</span>
                  <div className="flex flex-wrap gap-3">
                    {PAYMENT_OPTIONS.map(({ label, value, Icon }) => (
                      <PaymentOptionButton
                        key={value}
                        label={label}
                        selected={form.payment_provider === value}
                        onSelect={() => handleChange("payment_provider", value)}
                        Icon={Icon}
                      />
                    ))}
                  </div>

                  <label className="new-order-field mt-4 block">
                    <span className="new-order-label">Payment ID</span>
                    <input
                      type="text"
                      className="new-order-input"
                      placeholder="Enter payment reference"
                      value={form.payment_id}
                      onChange={(e) =>
                        handleChange("payment_id", e.target.value)
                      }
                    />
                  </label>
                </div>
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
                {ADDRESS_FIELD_CONFIG.map(({ key, label, type, optional }) => (
                  <Input
                    key={key}
                    label={optional ? `${label} (optional)` : label}
                    type={type}
                    value={form.shipping_address[key]}
                    onChange={(e) =>
                      handleChange(`shipping_address.${key}`, e.target.value)
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
                    {ADDRESS_FIELD_CONFIG.map(
                      ({ key, label, type, optional }) => (
                        <Input
                          key={key}
                          label={optional ? `${label} (optional)` : label}
                          type={type}
                          value={form.billing_address[key]}
                          onChange={(e) =>
                            handleChange(
                              `billing_address.${key}`,
                              e.target.value
                            )
                          }
                        />
                      )
                    )}
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

function PaymentOptionButton({ label, selected, onSelect, Icon }) {
  const handleClick = () => {
    if (!selected) onSelect?.();
  };

  const classes = `btn btn--ghost new-order-payment-option${
    selected ? " is-selected" : ""
  }`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={classes}
    >
      {Icon ? <Icon className="new-order-payment-option__icon" /> : null}
      <span className="new-order-payment-option__label">{label}</span>
    </button>
  );
}

function RevolutIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#001AEE"
        d="M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z"
      />
    </svg>
  );
}

function WiseIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#00B9FF"
        d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"
      />
    </svg>
  );
}

function BankTransferIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#38BDF8"
        d="M12 2 2 6.5v2h20v-2L12 2zm-8 9v7h2v-7H4zm4 0v7h2v-7H8zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2zM3 20v2h18v-2H3z"
      />
    </svg>
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
