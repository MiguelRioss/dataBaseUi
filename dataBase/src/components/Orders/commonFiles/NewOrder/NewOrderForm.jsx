import { allCountries } from "country-telephone-data";

const PHONE_DIAL_OPTIONS = allCountries.map((country) => ({
  value: `${country.iso2}|+${country.dialCode}`, // ✅ unique
  dial: `+${country.dialCode}`,
  label: `${country.name} (+${country.dialCode})`,
  iso2: country.iso2,
}));

PHONE_DIAL_OPTIONS.sort((a, b) => a.label.localeCompare(b.label));

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
      : (address = {}) => {
          const source = address && typeof address === "object" ? address : {};
          const rawPrefix =
            typeof source.phone_prefix === "string"
              ? source.phone_prefix.trim()
              : "";
          const rawNumber =
            typeof source.phone_number === "string"
              ? source.phone_number.trim()
              : "";

          if (rawPrefix || rawNumber) {
            return {
              dialCode: rawPrefix || defaultDialCode,
              number: rawNumber,
            };
          }

          const combined =
            typeof source.phone === "string" ? source.phone.trim() : "";
          if (!combined) {
            return { dialCode: defaultDialCode, number: "" };
          }

          if (combined.startsWith("+")) {
            const [maybePrefix, ...rest] = combined.split(/\s+/);
            return {
              dialCode: maybePrefix || defaultDialCode,
              number: rest.join(" ").trim(),
            };
          }

          return { dialCode: defaultDialCode, number: combined };
        };

  const safeDialCode = form.phonePrefix || defaultDialCode;
  const safePhoneNumber = form.phoneNumber || "";

  // live totals preview (EUR in UI)
  const num = (v) => (v == null || v === "" ? 0 : Number(v));
  const itemsGross = (Array.isArray(form.items) ? form.items : []).reduce(
    (s, it) => s + num(it.unit_amount) * num(it.quantity),
    0
  );
  const shipping = num(form.shipping_cost);
  const rawDiscount = num(form.discount_value);
  const discountCalc =
    form.discount_type === "percent"
      ? itemsGross * (rawDiscount / 100)
      : rawDiscount;
  const discountClamped = Math.min(Math.max(discountCalc, 0), itemsGross);
  const net = Math.max(0, itemsGross + shipping - discountClamped);
  const selectedPhoneKey =
    form.phonePrefixKey ||
    `$
                  {form.phoneIso2 || "GB"}|$
                  {form.phonePrefix || defaultDialCode}`;
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
                    value={selectedPhoneKey}
                    onChange={(e) => {
                      const [iso2, dial] = e.target.value.split("|");
                      onFieldChange?.("phoneIso2", iso2);
                      onFieldChange?.("phonePrefixKey", e.target.value); // store the unique key
                      onCustomerPhonePrefixChange?.(dial); // keep your existing handler
                    }}
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

              {/* Discount block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 new-order-field new-order-field--full">
                <label className="block">
                  <span className="new-order-label">Discount code</span>
                  <input
                    type="text"
                    className="new-order-input w-full"
                    value={form.discount_code}
                    onChange={(e) =>
                      onFieldChange(
                        "discount_code",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="WELCOME10"
                  />
                </label>
                <label className="block">
                  <span className="new-order-label">Discount type</span>
                  <select
                    className="new-order-input w-full"
                    value={form.discount_type}
                    onChange={(e) =>
                      onFieldChange("discount_type", e.target.value)
                    }
                  >
                    <option value="percent">% off</option>
                    <option value="fixed">€ off</option>
                  </select>
                </label>
                <label className="block">
                  <span className="new-order-label">
                    {form.discount_type === "percent"
                      ? "Percent (%)"
                      : "Amount (€)"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="new-order-input w-full"
                    value={form.discount_value}
                    onChange={(e) =>
                      onFieldChange("discount_value", e.target.value)
                    }
                  />
                </label>
              </div>

              {/* Payment */}
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

              {/* Computed totals preview */}
              <div className="new-order-field new-order-field--full">
                <div className="rounded-lg border border-[var(--line)] bg-white/10 p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Items gross</span>
                    <span>€{itemsGross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>€{shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount</span>
                    <span>−€{discountClamped.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-1 border-t border-[var(--line)]">
                    <span>Net total</span>
                    <span>€{net.toFixed(2)}</span>
                  </div>
                </div>
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
                            return `Stock: ${
                              product.stockValue ?? 0
                            } | Price: ${
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
                      onFieldChange(
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
                  {ADDRESS_FIELD_CONFIG.map(
                    ({ key, label, type, optional }) => {
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
                    }
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
  const dialKey =
    PHONE_DIAL_OPTIONS.find((o) => o.dial === dialCode)?.value ||
    PHONE_DIAL_OPTIONS[0]?.value ||
    "";
  const safeNumber = number || "";
  return (
    <label className="new-order-field">
      <span className="new-order-label">{label}</span>
      <div className="flex items-center gap-2">
        <select
          className="new-order-input w-24"
          value={dialKey}
          onChange={(e) => {
            const [, dial] = e.target.value.split("|");
            onDialCodeChange?.(dial);
          }}
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
