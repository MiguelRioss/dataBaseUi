import React from "react";

const PHONE_DIAL_OPTIONS = [
  { value: "+351", label: "PT (+351)" },
  { value: "+44", label: "UK (+44)" },
  { value: "+33", label: "FR (+33)" },
  { value: "+34", label: "ES (+34)" },
  { value: "+1", label: "US (+1)" },
  { value: "+39", label: "IT (+39)" },
  { value: "+49", label: "DE (+49)" },
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

const PAYMENT_OPTIONS = [
  { label: "Revolut", value: "revolut", Icon: RevolutIcon },
  { label: "Wise", value: "wise", Icon: WiseIcon },
  { label: "Bank Transfer", value: "bank_transfer", Icon: BankTransferIcon },
];

export default function NewOrderForm({
  form,
  sameAsShipping,
  products,
  productsLoading,
  productsError,
  saving,
  submitError,
  defaultDialCode,
  resolveAddressPhoneParts,
  formatPrice = (value) => String(value ?? ""),
  onFieldChange,
  onShippingCostChange,
  onSelectProduct,
  onRemoveItem,
  onAddItem,
  onToggleSameAs,
  onSubmit,
  onCustomerPhonePrefixChange,
  onCustomerPhoneNumberChange,
  submitLabel = "Save Order",
  submitSavingLabel = "Saving...",
}) {
  const safeResolvePhone =
    typeof resolveAddressPhoneParts === "function"
      ? resolveAddressPhoneParts
      : () => ({ dialCode: defaultDialCode, number: "" });

  const safeDialCode = form.phonePrefix || defaultDialCode;
  const safePhoneNumber = form.phoneNumber || "";

  return (
    <>
      <div className="new-order-layout text-sm grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="new-order-col">
          <Section title="Customer Info">
            <div className="new-order-grid">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
              <Input
                label="Email"
                value={form.email}
                onChange={(e) => onFieldChange("email", e.target.value)}
              />

              <div className="flex flex-col">
                <span className="new-order-label mb-1">Phone</span>
                <div className="flex items-center gap-2">
                  <select
                    className="new-order-input w-24"
                    value={safeDialCode}
                    onChange={(e) =>
                      onCustomerPhonePrefixChange?.(e.target.value)
                    }
                  >
                    {PHONE_DIAL_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    className="new-order-input flex-1"
                    placeholder="Enter phone number"
                    value={safePhoneNumber}
                    onChange={(e) =>
                      onCustomerPhoneNumberChange?.(e.target.value)
                    }
                  />
                </div>
              </div>

              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => onFieldChange("currency", e.target.value)}
              />
              <label className="new-order-field new-order-field--full">
                <span className="new-order-label">Shipment (EUR)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="new-order-input"
                  value={form.shipping_cost}
                  onChange={(e) => onShippingCostChange(e.target.value)}
                />
              </label>
              <Input
                label="Total (EUR)"
                type="number"
                min="0"
                step="0.01"
                value={form.amount_total}
                onChange={(e) =>
                  onFieldChange("amount_total", e.target.value)
                }
              />
              <div className="new-order-field new-order-field--full">
                <span className="new-order-label">Payment Method</span>
                <div className="flex flex-wrap gap-3">
                  {PAYMENT_OPTIONS.map(({ label, value, Icon }) => (
                    <PaymentOptionButton
                      key={value}
                      label={label}
                      selected={form.payment_provider === value}
                      onSelect={() => onFieldChange("payment_provider", value)}
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
                      onFieldChange("payment_id", e.target.value)
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
                      onChange={(e) => onSelectProduct(index, e.target.value)}
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
                            return `Stock: ${product.stockValue ?? 0} | Price: ${
                              product.priceInCents != null
                                ? formatPrice(product.priceInCents)
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
                      onFieldChange(`items.${index}.quantity`, e.target.value)
                    }
                  />
                  <Input
                    label="Unit Amount (EUR)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_amount}
                    onChange={(e) =>
                      onFieldChange(`items.${index}.unit_amount`, e.target.value)
                    }
                  />
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    className="btn btn--ghost new-order-action"
                    onClick={() => onRemoveItem(index)}
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
              onClick={onAddItem}
            >
              + Add Item
            </button>
          </Section>
        </div>

        <div className="new-order-col space-y-8">
          <Section title="Shipping Address">
            <div className="new-order-grid">
              {ADDRESS_FIELD_CONFIG.map(({ key, label, type, optional }) => {
                if (key === "phone") {
                  const { dialCode, number } = safeResolvePhone(
                    form.shipping_address
                  );
                  return (
                    <AddressPhoneField
                      key="shipping-phone"
                      label={optional ? `${label} (optional)` : label}
                      dialCode={dialCode}
                      number={number}
                      onDialCodeChange={(prefix) => {
                        const parts = safeResolvePhone(form.shipping_address);
                        onFieldChange("shipping_address.phone_prefix", prefix);
                        onFieldChange(
                          "shipping_address.phone_number",
                          parts.number
                        );
                        onFieldChange(
                          "shipping_address.phone",
                          `${prefix} ${parts.number}`.trim()
                        );
                      }}
                      onNumberChange={(nextNumber) => {
                        const { dialCode: prefix } = safeResolvePhone(
                          form.shipping_address
                        );
                        onFieldChange("shipping_address.phone_prefix", prefix);
                        onFieldChange(
                          "shipping_address.phone_number",
                          nextNumber
                        );
                        onFieldChange(
                          "shipping_address.phone",
                          `${prefix} ${nextNumber}`.trim()
                        );
                      }}
                    />
                  );
                }
                return (
                  <Input
                    key={key}
                    label={optional ? `${label} (optional)` : label}
                    type={type}
                    value={form.shipping_address[key]}
                    onChange={(e) =>
                      onFieldChange(`shipping_address.${key}`, e.target.value)
                    }
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Billing Address">
            <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
              <label className="flex items-center gap-3 text-gray-200 text-sm">
                <input
                  id="sameAsShipping"
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => onToggleSameAs(e.target.checked)}
                  className="h-4 w-4 accent-green-500"
                />
                Use same as shipping address
              </label>

              {!sameAsShipping && (
                <div className="new-order-grid">
                  {ADDRESS_FIELD_CONFIG.map(({ key, label, type, optional }) => {
                    if (key === "phone") {
                      const { dialCode, number } = safeResolvePhone(
                        form.billing_address
                      );
                      return (
                        <AddressPhoneField
                          key="billing-phone"
                          label={optional ? `${label} (optional)` : label}
                          dialCode={dialCode}
                          number={number}
                          onDialCodeChange={(prefix) => {
                            const parts = safeResolvePhone(
                              form.billing_address
                            );
                            onFieldChange(
                              "billing_address.phone_prefix",
                              prefix
                            );
                            onFieldChange(
                              "billing_address.phone_number",
                              parts.number
                            );
                            onFieldChange(
                              "billing_address.phone",
                              `${prefix} ${parts.number}`.trim()
                            );
                          }}
                          onNumberChange={(nextNumber) => {
                            const { dialCode: prefix } = safeResolvePhone(
                              form.billing_address
                            );
                            onFieldChange(
                              "billing_address.phone_prefix",
                              prefix
                            );
                            onFieldChange(
                              "billing_address.phone_number",
                              nextNumber
                            );
                            onFieldChange(
                              "billing_address.phone",
                              `${prefix} ${nextNumber}`.trim()
                            );
                          }}
                        />
                      );
                    }
                    return (
                      <Input
                        key={key}
                        label={optional ? `${label} (optional)` : label}
                        type={type}
                        value={form.billing_address[key]}
                        onChange={(e) =>
                          onFieldChange(
                            `billing_address.${key}`,
                            e.target.value
                          )
                        }
                      />
                    );
                  })}
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
          onClick={onSubmit}
        >
          {saving ? submitSavingLabel : submitLabel}
        </button>
      </div>
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

function AddressPhoneField({
  label,
  dialCode,
  number,
  onDialCodeChange,
  onNumberChange,
}) {
  const safeDial = dialCode || PHONE_DIAL_OPTIONS[0]?.value || "";
  const safeNumber = number || "";
  return (
    <label className="new-order-field">
      <span className="new-order-label">{label}</span>
      <div className="flex items-center gap-2">
        <select
          className="new-order-input w-24"
          value={safeDial}
          onChange={(e) => onDialCodeChange?.(e.target.value)}
        >
          {PHONE_DIAL_OPTIONS.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
        <input
          type="tel"
          className="new-order-input flex-1"
          value={safeNumber}
          placeholder="Enter phone number"
          onChange={(e) => onNumberChange?.(e.target.value)}
        />
      </div>
    </label>
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
