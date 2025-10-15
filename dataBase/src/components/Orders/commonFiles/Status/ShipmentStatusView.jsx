import Badge from "../Badge";
import {
  SHIPMENT_STATUS_STEPS,
  SHIPMENT_STATUS_KEYS,
  normalizeShipmentStatus,
} from "./shipmentStatus";

export default function ShipmentStatusView({ status }) {
  // Log raw database status for inspection
  console.groupCollapsed("📦 Raw DB Status");
  console.table(status);
  console.groupEnd();

  // Normalize status to only canonical keys
  const norm = normalizeShipmentStatus(status);

  // Compare raw keys to canonical keys
  const rawKeys = Object.keys(status );
  const extraKeys = rawKeys.filter((k) => !SHIPMENT_STATUS_KEYS.includes(k));
  const missingKeys = SHIPMENT_STATUS_KEYS.filter((k) => !rawKeys.includes(k));

  // Optionally display mismatches inline for debugging
  const renderDiagnostics = () => {
    if (!extraKeys.length && !missingKeys.length) return null;
    return (
      <div className="mt-2 text-xs text-yellow-300">
        {extraKeys.length > 0 && (
          <div>
            ⚠️ Extra non-canonical keys in DB:{" "}
            <code>{extraKeys.join(", ")}</code>
          </div>
        )}
        {missingKeys.length > 0 && (
          <div>
            ⚠️ Missing expected keys: <code>{missingKeys.join(", ")}</code>
          </div>
        )}
      </div>
    );
  };

  const renderWhen = (step) => {
    const date = step.date ? String(step.date).trim() : "";
    const time = step.time ? String(step.time).trim() : "";
    if (!date && !time) return <span className="muted">—</span>;
    return (
      <span>
        {date || "—"}
        {time ? ` · ${time}` : ""}
      </span>
    );
  };

  return (
    <div className="status-table-wrap">
      <table className="status-table">
        <thead>
          <tr>
            <th align="left">Step</th>
            <th align="left">Status</th>
            <th align="left">When</th>
          </tr>
        </thead>
        <tbody>
          {SHIPMENT_STATUS_STEPS.map(({ key, label }) => {
            const step = norm[key];
            const ok = !!step.status;
            return (
              <tr key={key}>
                <td className="muted">{label}</td>
                <td>
                  <Badge ok={ok} trueText="Yes" falseText="No" />
                </td>
                <td>{renderWhen(step)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add diagnostics panel */}
      {renderDiagnostics()}
    </div>
  );
}
