/**
 * StatusBadge.jsx
 * Displays the first active status from a status object.
 */
export default function StatusBadge({ status = {} }) {
  if (!status || typeof status !== "object") return null;

  // Find first key whose .status is true
  const activeEntry = Object.entries(status).find(([key, val]) => val?.status === true);

  // Extract readable message
  const message = activeEntry
    ? formatStatusLabel(activeEntry[0])
    : "No Active Status";

  return (
    <span
      className="badge badge--ok"
      style={{
        backgroundColor: "#0c8438ff", // green-600
        color: "white",
        fontWeight: 600,
      }}
    >
      {message}
    </span>
  );
}

// Optional helper to make the key more readable
function formatStatusLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
