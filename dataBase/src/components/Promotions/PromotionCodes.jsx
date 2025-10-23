import React from "react";
import { resolveApiBase } from "../services/apiBase";

const DEFAULT_FORM = {
  name: "",
  type: "percentage",
  value: 10,
  daysValid: 7, // default to one week
  usageType: "single", // default option
};

const VIEW_MODES = {
  LIST: "list",
  CREATE: "create",
};

function resolvePromoId(item) {
  if (!item || typeof item !== "object") return null;
  return item.id ?? item.code ?? item.slug ?? item.name ?? null;
}

function isPromoActive(item) {
  if (!item || typeof item !== "object") return false;
  if (typeof item.status === "boolean") return item.status;
  if (typeof item.active === "boolean") return item.active;
  if (typeof item.enabled === "boolean") return item.enabled;
  if (typeof item.status === "string") {
    const lowered = item.status.toLowerCase();
    return lowered === "active" || lowered === "enabled";
  }
  return Boolean(item.active ?? item.enabled ?? item.status);
}

export default function PromotionCodes() {
  const [form, setForm] = React.useState(() => ({ ...DEFAULT_FORM }));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [viewMode, setViewMode] = React.useState(VIEW_MODES.LIST);
  const [codes, setCodes] = React.useState([]);
  const [codesLoading, setCodesLoading] = React.useState(true);
  const [codesError, setCodesError] = React.useState("");
  const [updatingId, setUpdatingId] = React.useState(null);
  const apiBase = React.useMemo(() => resolveApiBase(), []);

  const fetchCodes = React.useCallback(async () => {
    setCodesLoading(true);
    setCodesError("");
    try {
      const res = await fetch(`${apiBase}/api/promoCodes`);
      const body = await res.json().catch(() => null);
      const collection =
        Array.isArray(body?.data) && body.data.length
          ? body.data
          : Array.isArray(body?.items) && body.items.length
          ? body.items
          : Array.isArray(body)
          ? body
          : [];
      setCodes(collection);
    } catch (e) {
      setCodes([]);
      setCodesError(e.message || String(e));
    } finally {
      setCodesLoading(false);
    }
  }, [apiBase]);

  React.useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  function updateField(key, rawValue) {
    setSuccess("");
    setError("");
    setForm((prev) => {
      const next = { ...prev };
      if (key === "value") {
        const numeric = Number(rawValue);
        next[key] = Number.isFinite(numeric) ? numeric : prev[key];
      } else {
        next[key] = rawValue;
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        promocode: {
          name: form.name.trim(),
          type: form.type,
          value: form.value,
          daysValid: form.daysValid,
          usageType: form.usageType,
        },
      };

      const res = await fetch(`${apiBase}/api/promoCodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok)
        throw new Error(`Failed to create promo code (${res.status})`);

      setSuccess("Promotion code created successfully.");
      setForm(() => ({ ...DEFAULT_FORM }));
      setViewMode(VIEW_MODES.LIST);
      fetchCodes();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item) {
    const id = resolvePromoId(item);
    if (!id) {
      setError("Unable to toggle this code: missing identifier.");
      return;
    }

    const nextActive = !isPromoActive(item);
    setUpdatingId(id);
    setError("");
    setSuccess("");

    setCodes((prev) =>
      prev.map((entry) => {
        const entryId = resolvePromoId(entry);
        if (entryId !== id) return entry;

        const nextEntry = { ...entry };
        if ("active" in entry) nextEntry.active = nextActive;
        if ("enabled" in entry) nextEntry.enabled = nextActive;
        if ("status" in entry) {
          if (typeof entry.status === "boolean") {
            nextEntry.status = nextActive;
          } else {
            nextEntry.status = nextActive ? "Active" : "Inactive";
          }
        } else {
          nextEntry.status = nextActive;
        }
        return nextEntry;
      })
    );

    try {
      const res = await fetch(
        `${apiBase}/api/promoCodes/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changes: {
              status: nextActive,
            },
          }),
        }
      );

      if (!res.ok)
        throw new Error(`Failed to update promo code (${res.status})`);

      // Refresh to reflect backend truth in case it transforms data
      fetchCodes();
    } catch (e) {
      setError(e.message || String(e));
      fetchCodes();
    } finally {
      setUpdatingId(null);
    }
  }

  function handleModeChange(mode) {
    if (mode === viewMode) return;
    setSuccess("");
    setError("");
    setViewMode(mode);
    if (mode === VIEW_MODES.CREATE) {
      setForm(() => ({ ...DEFAULT_FORM }));
    } else if (mode === VIEW_MODES.LIST && !codesLoading && !codes.length) {
      fetchCodes();
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    const date =
      typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div className="promo-card card">
      <header className="promo-header">
        <div className="promo-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" role="img">
            <path
              d="M5.5 3h6.38c.35 0 .68.14.92.38l5.82 5.82a1.3 1.3 0 0 1 0 1.84l-6.36 6.36a1.3 1.3 0 0 1-1.84 0L4.62 11.6A1.3 1.3 0 0 1 4.25 10.7L4 5.5A2.5 2.5 0 0 1 5.5 3Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="8.7"
              cy="7.3"
              r="1.2"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="m14.2 9.4-4.8 4.9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h3 className="promo-title">Promotion Codes</h3>
          <p className="promo-subtitle muted">
            Manage existing discount codes or create a new one for campaigns.
          </p>
        </div>
      </header>

      <div className="promo-actions">
        <button
          type="button"
          className={`btn ${
            viewMode === VIEW_MODES.LIST ? "btn--primary" : "btn--ghost"
          }`}
          onClick={() => handleModeChange(VIEW_MODES.LIST)}
        >
          View Codes
        </button>
        <button
          type="button"
          className={`btn ${
            viewMode === VIEW_MODES.CREATE ? "btn--primary" : "btn--ghost"
          }`}
          onClick={() => handleModeChange(VIEW_MODES.CREATE)}
        >
          Create Code
        </button>
      </div>

      {viewMode === VIEW_MODES.LIST ? (
        <section className="promo-list">
          {codesLoading ? (
            <div className="promo-empty muted">Loading codes...</div>
          ) : codesError ? (
            <div className="promo-alert promo-alert--error">{codesError}</div>
          ) : !codes.length ? (
            <div className="promo-empty muted">
              No promotion codes yet. Click <strong>Create Code</strong> to add
              one.
            </div>
          ) : (
            <div className="promo-table-wrapper">
              <table className="promo-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Value (%)</th>
                    <th>Created</th>
                    <th>Expired</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((item, idx) => {
                    const rowId = resolvePromoId(item);
                    const isActive = isPromoActive(item);
                    const isUpdating = updatingId === rowId;
                    const statusLabel = isUpdating
                      ? "Updating..."
                      : isActive
                      ? "Active"
                      : "Inactive";
                    return (
                      <tr key={rowId || `promo-${idx}`}>
                        <td>{item.id || "-"}</td>
                        <td>{item.code || "-"}</td>
                        <td>{item.name || "-"}</td>
                        <td>{item.usageType || "-"}</td>
                        <td>{item.value ? `${item.value}%` : "-"}</td>
                        <td>{formatDate(item.created)}</td>
                        <td>{formatDate(item.expiryDate)}</td>

                        <td>
                          <button
                            type="button"
                            className={`badge order-row__payment ${
                              isActive ? "badge--ok" : "badge--no"
                            }`}
                            onClick={() => handleToggleStatus(item)}
                            disabled={isUpdating}
                          >
                            {statusLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <form className="promo-form" onSubmit={handleSubmit}>
          <label className="promo-field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Promo name (e.g. Summer Sale)"
              disabled={loading}
            />
          </label>

          <div className="promo-field promo-field--row">
            <label>
              <span>Percentage (%)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.value}
                onChange={(event) => updateField("value", event.target.value)}
                disabled={loading}
              />
            </label>

            <div className="promo-field promo-field--row">
              <label>
                <span>Valid for (days)</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={form.daysValid}
                  onChange={(event) =>
                    updateField("daysValid", event.target.value)
                  }
                  disabled={loading}
                />
              </label>

              <label>
                <span>Usage Type</span>
                <select
                  value={form.usageType}
                  onChange={(event) =>
                    updateField("usageType", event.target.value)
                  }
                  disabled={loading}
                >
                  <option value="single">Single Use</option>
                  <option value="multiple">Multiple Use</option>
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <div className="promo-alert promo-alert--error">{error}</div>
          ) : null}
          {success ? (
            <div className="promo-alert promo-alert--success">{success}</div>
          ) : null}

          <button
            className="btn btn--primary promo-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Code"}
          </button>
        </form>
      )}

      {/* Uncomment below line to debug API response */}
      {/* <pre style={{ background: "#fafafa", padding: "1em" }}>{JSON.stringify(codes, null, 2)}</pre> */}
    </div>
  );
}
