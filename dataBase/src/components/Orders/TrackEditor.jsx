import React from "react";

/**
 * Small inline editor for track URL.
 * onSave receives the normalized URL (or empty string).
 */
export default function TrackEditor({ initial = "", onCancel, onSave, saving }) {
  const [value, setValue] = React.useState(initial || "");
  React.useEffect(() => setValue(initial || ""), [initial]);

  function handleChange(e) {
    setValue(e.target.value);
  }

  async function handleSave() {
    let normalized = (value || "").trim();
    await onSave(normalized);
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        className="input"
        value={value}
        onChange={handleChange}
        placeholder="RT..."
        style={{ minWidth: 260 }}
      />
      <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button className="btn" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  );
}
