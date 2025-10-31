/**
 * StatusBadge.jsx
 * Displays the last active status from a status object.
 */
export default function StatusBadge({ status = {} }) {
  if (!status || typeof status !== "object") return null;

  // Get all keys whose .status is true
  const activeEntries = Object.entries(status).filter(
    ([, val]) => val?.status === true
  );

  // Pick the *last* one (most recent step)
  const lastActive = activeEntries[activeEntries.length - 1];

  // Extract readable label
  const message = lastActive
    ? formatStatusLabel(lastActive[0])
    : "No Active Status";

  return (
    <span
      className="badge badge--ok "
      style={{
        backgroundColor: "#0c8438ff", // green
        color: "white",
        fontWeight: 600,
      }}
    >
      {message}
    </span>
  );
}

function formatStatusLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
