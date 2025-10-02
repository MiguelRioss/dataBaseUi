import React from "react";

export default function SortableTh({ label, colKey, sort, onToggle, style }) {
  const active = sort?.key === colKey;
  const dirArrow = active ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th
      onClick={() => onToggle(colKey)}
      role="button"
      aria-sort={ariaSort}
      title={`Sort by ${label}`}
      style={{ cursor: "pointer", userSelect: "none", ...style }}
    >
      {label}{dirArrow}
    </th>
  );
}
