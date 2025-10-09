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
 *  - currency?: string (fallback if not present on items)
 *  - buttonText?: string
 *  - title?: string
 */
export default function ProductsPopup({
  shippingCost,
  items = [],
  currency = "eur",
  buttonText = "View products",
  title = "Products",
}) {
  const cur = (items[0]?.currency || currency || "eur").toLowerCase();
  // compute totals safely
  const totalItems = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const subtotalCents = items.reduce((sum, it) => {
    if (it?.amount_total != null) return sum + Number(it.amount_total) || 0;
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unit_amount) || 0;
    return sum + qty * unit;
  }, 0);

  const data = {
    items, // custom-rendered below
    total_items: totalItems,
    subtotal: formatCents(subtotalCents, cur),
    shipping: shippingCost,
    currency: cur.toUpperCase(),
  };

  return (
    <ObjectPopup
      title={title}
      buttonText={buttonText}
      data={data}
      fields={[
        {
          key: "items",
          label: "Products",
          render: (val /* = items */) => (
            <ItemsList items={items} currency={cur} />
          ),
        },
        { key: "total_items", label: "Total items" },
        {
          key: "shipping",
          label: "Shipping Cost",
          render: (val) => formatCents(val, cur),
        },
        { key: "subtotal", label: "Subtotal" },
      ]}
    />
  );
}
