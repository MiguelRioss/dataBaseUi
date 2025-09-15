// src/components/StatusSelect.jsx
export default function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value || "accepted"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="input"
      style={{ minWidth: 180 }}
    >
      <option value="accepted">Accepted</option>
      <option value="in_transit">In transit</option>
      <option value="delivered">Delivered</option>
    </select>
  );
}
