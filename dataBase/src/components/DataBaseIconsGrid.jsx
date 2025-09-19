// src/components/DataBaseIconsGrid.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Simple, presentational grid of admin tiles.
 * - selected: string key of the currently selected tile (e.g. "orders"|"images")
 * - onSelect: function(key) called when a tile is clicked
 *
 * This component is intentionally presentational (no auth logic) so it stays easy to test and reuse.
 */
export default function DataBaseIconsGrid({ selected, onSelect }) {
  const tiles = [
    {
      key: "orders",
      title: "Orders",
      subtitle: "See and manage customer orders",
      // svg icon as JSX
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 7L6.5 5C6.8 3.7 8 3 9.3 3H14.7C16 3 17.2 3.7 17.5 5L18 7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 8H4L5 21H19L20 8Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 11V13"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 11V13"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "images",
      title: "Images",
      subtitle: "Upload and approve images (coming soon)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M8 11l2 2 3-3 5 6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "Inventory",
      title: "Inventory",
      subtitle: "Controll Stock On Produtcts",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 7l9-4 9 4-9 4-9-4Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M3 7v10l9 4 9-4V7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M12 11v10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="db-grid" role="tablist" aria-label="Admin sections">
      {tiles.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.key)}
            className={`db-tile ${active ? "db-tile--active" : ""}`}
          >
            <span className="db-tile__icon" aria-hidden>
              {t.icon}
            </span>
            <div className="db-tile__body">
              <strong className="db-tile__title">{t.title}</strong>
              <div className="db-tile__subtitle">{t.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

DataBaseIconsGrid.propTypes = {
  selected: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};
