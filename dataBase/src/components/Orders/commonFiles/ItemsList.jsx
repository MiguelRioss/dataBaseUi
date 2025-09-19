import {formatCents} from "./utils"


export default function ItemsList({ items = [], currency = "eur" }) {
  if (!items.length) return <span className="muted">—</span>;
  return (
    <div className="prod-list">
      {items.map((it, i) => {
        const qty  = Number(it.quantity) || 0;
        const unit = Number(it.unit_amount) || null;        // cents
        const line = it.amount_total != null
          ? Number(it.amount_total)
          : unit != null ? qty * unit : null;

        return (
          <div key={i} className="prod-card">
            <div className="prod-card__head">
              <div className="prod-card__title">{it.name || "Item"}</div>
            </div>

            <div className="prod-card__meta">
              <div className="prod-card__row">
                <span className="muted">Qty</span>
                <span>{qty}</span>
              </div>
              <div className="prod-card__row">
                <span className="muted">Unit</span>
                <span>{unit != null ? formatCents(unit, currency) : "—"}</span>
              </div>
            </div>

            <div className="prod-card__total">
              {line != null ? formatCents(line, currency) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
