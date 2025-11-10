import ObjectPopup from "./ObjectPopup";
import ItemsList from "./utils/ItemsList";
import { formatCents } from "./utils/utils";

/**
 * ProductsPopup
 * Props:
 *  - items: Array<{
 *      name: string,
 *      quantity: number,
 *      unit_amount?: number,      // cents
 *      amount_total?: number,     // cents
 *      currency?: string,
 *      images?: string[]
 *    }>
 *  - shippingCost?: number        // cents
 *  - discount?: number | { amount_cents?: number, code?: string, percent?: number }
 *  - currency?: string            // fallback if not present on items
 *  - buttonText?: string
 *  - title?: string
 *
 * Usage:
 *   <ProductsPopup
 *     items={row.items}
 *     shippingCost={row.metadata?.shipping_cost_cents}
 *     discount={row.metadata?.discount} // or discount={row.discount_cents}
 *     currency={row.currency}
 *   />
 */
export default function ProductsPopup({
  shippingCost = 0,
  discount = 0,
  items = [],
  currency = "eur",
  buttonText = "View products",
  title = "Products",
}) {
  const cur = (items[0]?.currency || currency || "eur").toLowerCase();

  // compute safe subtotal (items only, in cents)
  const totalItems = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const subtotalCents = items.reduce((sum, it) => {
    if (it?.amount_total != null) return sum + (Number(it.amount_total) || 0);
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unit_amount) || 0;
    return sum + qty * unit;
  }, 0);

  const shipCents = Number(shippingCost) || 0;

  // normalize discount
  let discountCents = 0;
  let discountCode = null;
  let discountPercent = null;

  if (typeof discount === "number") {
    discountCents = discount;
  } else if (discount && typeof discount === "object") {
    discountCents = Number(
      discount.amount_cents ?? discount.discount_cents ?? 0
    );
    if (typeof discount.code === "string") discountCode = discount.code;
    const maybePct = Number(discount.percent);
    if (Number.isFinite(maybePct)) discountPercent = maybePct;
  }

  if (!Number.isFinite(discountCents)) discountCents = 0;
  // clamp to subtotal so we never show negative items total
  discountCents = Math.max(0, Math.min(discountCents, subtotalCents));

  const netCents = Math.max(0, subtotalCents + shipCents - discountCents);

  const data = {
    items, // custom-rendered below
    total_items: totalItems,
    subtotal: formatCents(subtotalCents, cur),
    shipping: shipCents, // formatted in render()
    discount_cents: discountCents,
    discount_code: discountCode,
    discount_percent: discountPercent,
    net_total: formatCents(netCents, cur),
    currency: cur.toUpperCase(),
  };

  // Build fields, conditionally inserting Discount and always showing Net total
  const fields = [
    {
      key: "items",
      label: "Products",
      render: () => <ItemsList items={items} currency={cur} />,
    },
    { key: "total_items", label: "Total items" },
    {
      key: "shipping",
      label: "Shipping",
      render: (val) => formatCents(val, cur),
    },
    { key: "subtotal", label: "Subtotal" },
  ];

  if (discountCents > 0) {
    fields.splice(
      3,
      0,
      {
        key: "discount_cents",
        label: discountCode ? `Discount (${discountCode})` : "Discount",
        render: (val) => `−${formatCents(val, cur)}`,
      },
    );
  }

  fields.push({ key: "net_total", label: "Total With Discount" });

  return (
    <ObjectPopup
      title={title}
      buttonText={buttonText}
      data={data}
      fields={fields}
    />
  );
}
