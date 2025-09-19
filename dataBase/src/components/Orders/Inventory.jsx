import React from "react";

/**
 * Inventory (no delete, no quick presets)
 * - Edit quantities only (number input + +/- buttons)
 * - Add row via header "+"
 */
export default function Inventory({
  initial = { TOTAL_EXTRACT: 10, ROOT_BARK: 10, TANIA: 10, Lucia: 10, clara: 10 },
  onChange,
  step = 1,
  min = 0,
  max = 9999,
}) {
  const [rows, setRows] = React.useState(() => normalize(initial));

  React.useEffect(() => {
    onChange?.(toObject(rows));
  }, [rows, onChange]);

  function addRow() {
    setRows((r) => [...r, { key: suggestKey(r), qty: 0 }]);
  }

  function setQty(i, val) {
    const n = clamp(Number(val), min, max);
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, qty: n } : row)));
  }

  function bump(i, delta) {
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, qty: clamp((Number(row.qty) || 0) + delta, min, max) } : row
      )
    );
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      {/* Header */}
      <div className="inv-head">
        <span className="inv-title">stock</span>
        <div className="inv-actions">
          <button className="btn" title="Add row" onClick={addRow}>+</button>
        </div>
      </div>

      {/* Rows */}
      <div className="inv-list">
        {rows.map((row, i) => (
          <div className="inv-row inv-row--compact" key={`${row.key}-${i}`}>
            {/* SKU label (read-only) */}
            <div className="inv-key--label" title={row.key}>{row.key}</div>

            {/* quantity control: - [input] + */}
            <div className="inv-ctrl">
              <button
                type="button"
                className="btn inv-btn"
                onClick={() => bump(i, -step)}
                disabled={row.qty <= min}
                aria-label="Decrease"
              >
                –
              </button>

              <input
                className="inv-qty"
                type="number"
                inputMode="numeric"
                value={row.qty}
                min={min}
                max={max}
                onChange={(e) => setQty(i, e.target.value)}
              />

              <button
                type="button"
                className="btn inv-btn"
                onClick={() => bump(i, step)}
                disabled={row.qty >= max}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="muted" style={{ padding: 8, fontSize: 13 }}>
            No stock rows yet. Click <strong>+</strong> to add.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function normalize(initial) {
  if (Array.isArray(initial)) {
    return initial.map((x) => ({ key: String(x.key ?? ""), qty: Number(x.qty ?? 0) }));
  }
  if (initial && typeof initial === "object") {
    return Object.entries(initial).map(([k, v]) => ({ key: String(k), qty: Number(v || 0) }));
  }
  return [];
}

function toObject(rows) {
  return rows.reduce((acc, r) => {
    const k = (r.key || "").trim();
    if (k) acc[k] = Number(r.qty) || 0;
    return acc;
  }, {});
}

function suggestKey(rows) {
  const base = "SKU";
  let n = rows.length + 1;
  let candidate = `${base}_${n}`;
  const set = new Set(rows.map((r) => r.key));
  while (set.has(candidate)) { n += 1; candidate = `${base}_${n}`; }
  return candidate;
}

function clamp(n, lo, hi) {
  n = Number.isFinite(n) ? n : 0;
  if (lo != null) n = Math.max(lo, n);
  if (hi != null) n = Math.min(hi, n);
  return n;
}
