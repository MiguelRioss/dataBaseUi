import React from "react";

/**
 * Clickable badge component
 * Uses the same classes as Badge: "badge", "badge--ok", "badge--no"
 */
export default function ClickableBadge({
  ok,
  onToggle,
  trueText = "Yes",
  falseText = "No",
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`badge ${ok ? "badge--ok" : "badge--no"} cursor-pointer select-none`}
      style={{ marginRight: "0.5rem", marginBottom: "0.5rem" }} // spacing
    >
      {ok ? trueText : falseText}
    </button>
  );
}
