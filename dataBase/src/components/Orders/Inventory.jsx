import React from "react";
import fetchOrders from "./services/fetchOrders";
import fetchStock from "./services/fetchStock";

/**
 * Inventory (self-fetching)
 * - Fetches from GET  {API_BASE}/api/stock  on mount
 * - Auto-saves via POST {API_BASE}/api/stock { updates: { ... } } (debounced)
 * - Still accepts `initial` as fallback/seed
 */
export default function Inventory({
  initial,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  autoSave = true,
  debounceMs = 500,
  apiBase = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, ""),
}) {
  const API_URL = `${apiBase}/api/stock`;

  const [rows, setRows] = React.useState(() => normalize(initial));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const saveTimer = React.useRef(null);

  // ---------- load from API on mount ----------
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchStock();
        const payload = (data && typeof data === "object")
          ? (
              Array.isArray(data.items)
                ? data.items
                : (data.items && typeof data.items === "object")
                  ? (data.items.stock ?? data.items)
                  : (data.stock ?? data)
            )
          : data;
        if (!payload) throw new Error("Empty stock response");
        if (alive) setRows(normalize(payload));
      } catch (e) {
        // Fall back to `initial` silently, but surface the error
        setError(e.message || String(e));
        setRows(normalize(initial));
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]); // only when base changes


  // ---------- UI handlers ----------
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
        <div className="muted" style={{ fontSize: 12 }}>
          {loading ? "Loading…" : saving ? "Saving…" : dirty ? "Unsaved…" : "Up to date"}
          {error ? <span style={{ color: "#f87171" }}> · {error}</span> : null}
        </div>
        <div className="inv-actions">
          <button className="btn" title="Add row" onClick={addRow} disabled={loading}>+</button>
        </div>
      </div>

      {/* Rows */}
      <div className="inv-list">
        {!loading && rows.map((row, i) => (
          <div className="inv-row inv-row--compact" key={`${row.key}-${i}`}>
            <div className="inv-key--label" title={row.key}>{row.key}</div>

            <div className="inv-ctrl">
              <button
                type="button"
                className="btn inv-btn"
                onClick={() => bump(i, -step)}
                disabled={row.qty <= min || loading}
                aria-label="Decrease"
              >–</button>

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
                disabled={row.qty >= max || loading}
                aria-label="Increase"
              >+</button>
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 && (
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
    return initial.map((x) => {
      // Support various shapes: {key, qty} | {name, stock} | {sku/SKU, quantity}
      const keyRaw = x?.key ?? x?.name ?? x?.sku ?? x?.SKU ?? x?.id ?? "";
      const qtyRaw = x?.qty ?? x?.stock ?? x?.quantity ?? 0;
      return { key: String(keyRaw ?? ""), qty: Number(qtyRaw ?? 0) };
    });
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
