import React from "react";
import { resolveApiBase } from "../services/apiBase";

const DEFAULT_FORM = {
  name: "",
  code: "",
  type: "percentage",
  value: 10,
};

const VIEW_MODES = {
  LIST: "list",
  CREATE: "create",
};

export default function PromotionCodes() {
  const [form, setForm] = React.useState(() => ({ ...DEFAULT_FORM }));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [viewMode, setViewMode] = React.useState(VIEW_MODES.LIST);
  const [codes, setCodes] = React.useState([]);
  const [codesLoading, setCodesLoading] = React.useState(true);
  const [codesError, setCodesError] = React.useState("");
  const apiBase = React.useMemo(() => resolveApiBase(), []);

  const fetchCodes = React.useCallback(async () => {
    setCodesLoading(true);
    setCodesError("");
    try {
      const res = await fetch(`${apiBase}/api/promoCodes`);
      if (!res.ok) {
        throw new Error(`Failed to load promotion codes (status ${res.status})`);
      }
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
        name: form.name.trim(),
        code: form.code.trim(),
        type: form.type,
        value: form.value,
      };

      if (!payload.name) {
        throw new Error("Promotion name is required.");
      }
      if (!payload.code) {
        throw new Error("Promotion code is required.");
      }
      if (payload.value <= 0) {
        throw new Error("Percentage must be greater than zero.");
      }

      const res = await fetch(`${apiBase}/api/promoCodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => null);
        const message =
          details?.error ||
          details?.message ||
          `Request failed with status ${res.status}`;
        throw new Error(message);
      }

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

  function asDisplayValue(item, keys, fallback = "-") {
    for (const key of keys) {
      const value = item?.[key];
      if (value === 0 || value === false) return value;
      if (value) return value;
    }
    return fallback;
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
              No promotion codes yet. Click <strong>Create Code</strong> to add one.
            </div>
          ) : (
            <div className="promo-table-wrapper">
              <table className="promo-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Percentage</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((item) => {
                    const key =
                      item?.id ??
                      item?.code ??
                      item?.name ??
                      item?.title ??
                      Math.random().toString(36).slice(2);
                    const name = asDisplayValue(item, ["name", "title", "label"]);
                    const code = asDisplayValue(item, ["code", "slug"]);
                    const percentage = asDisplayValue(item, ["value", "percentage", "amount"], "-");
                    const created = formatDate(
                      asDisplayValue(item, ["createdAt", "created_at", "created"])
                    );
                    const statusRaw = asDisplayValue(
                      item,
                      ["active", "enabled", "status"],
                      "-"
                    );
                    const status =
                      typeof statusRaw === "boolean"
                        ? statusRaw
                          ? "Active"
                          : "Disabled"
                        : statusRaw || "-";
                    return (
                      <tr key={key}>
                        <td>{name}</td>
                        <td>
                          <code>{code}</code>
                        </td>
                        <td>{percentage !== "-" ? `${percentage}%` : "-"}</td>
                        <td>{created}</td>
                        <td>{status}</td>
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

          <label className="promo-field">
            <span>Code</span>
            <input
              type="text"
              value={form.code}
              onChange={(event) => updateField("code", event.target.value)}
              placeholder="e.g. SUMMER25"
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
    </div>
  );
}
