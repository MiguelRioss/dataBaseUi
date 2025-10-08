import Badge from "./Badge";

// Canonical order and labels for display
const STATUS_STEPS = [
  { key: "accepted", label: "Accepted" },
  { key: "in_transit", label: "In Transit" },
  { key: "acceptedInCtt", label: "Accepted IN CTT" },
  { key: "wating_to_Be_Delivered", label: "Waiting to Be Delivered" },
  { key: "delivered", label: "Delivered" },
];

// Normalize odd spellings / legacy keys safely
function normalizeStatus(raw) {
  const safe = (obj) =>
    obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  const s = safe(raw);

  // Accept legacy alias "in_traffic"
  const inTransit = safe(s.in_transit ?? s.in_traffic);

  return {
    accepted: safe(s.accepted),
    in_transit: inTransit,
    acceptedInCtt: safe(s.acceptedInCtt),
    wating_to_Be_Delivered: safe(s.wating_to_Be_Delivered),
    delivered: safe(s.delivered),
  };
}

function whenCell({ date, time }) {
  const hasDate = date != null && String(date).trim() !== "";
  const hasTime = time != null && String(time).trim() !== "";
  if (!hasDate && !hasTime) return <span className="muted">—</span>;
  return (
    <span>
      {hasDate ? String(date) : "—"}
      {hasTime ? ` · ${String(time)}` : ""}
    </span>
  );
}

export default function ShipmentStatusView({ status }) {
  const norm = normalizeStatus(status);

  return (
    <div className="status-table-wrap">
      <table className="status-table">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Step</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "left" }}>When</th>
          </tr>
        </thead>
        <tbody>
          {STATUS_STEPS.map(({ key, label }) => {
            const step = norm[key] || {};
            const ok = !!step.status;
            return (
              <tr key={key}>
                <td className="muted">{label}</td>
                <td>
                  <Badge ok={ok} trueText="Yes" falseText="No" />
                </td>
                <td>
                  {whenCell({
                    date: step.date ?? null,
                    time: step.time ?? null,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* lightweight scoped styles; adapt to your design system if you prefer */}
    
    </div>
  );
}
