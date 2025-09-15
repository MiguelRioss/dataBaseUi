// src/components/StatusBadge.jsx
export default function StatusBadge({ value }) {
  const map = {
    accepted:  { label: "Accepted",   className: "badge badge--blue" },
    in_transit:{ label: "In transit", className: "badge badge--amber" },
    delivered: { label: "Delivered",  className: "badge badge--ok" },
  };
  const v = map[value] ?? map.accepted;
  return <span className={v.className}>{v.label}</span>;
}
