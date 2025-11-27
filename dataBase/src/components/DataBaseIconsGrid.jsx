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
      key: "blog",
      title: "Blog & Content",
      subtitle: "Write and edit articles",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          {/* Left page */}
          <path
            d="M5 5.5C5 4.67 5.67 4 6.5 4H11v13.5L8.75 16.5 6.5 17.5C5.67 17.5 5 16.83 5 16V5.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right page */}
          <path
            d="M19 5.5C19 4.67 18.33 4 17.5 4H13v13.5l2.25-1.5 2.25 1c.83 0 1.5-.67 1.5-1.5V5.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Heading line */}
          <path
            d="M7.5 7.5H10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Text lines */}
          <path
            d="M7.5 9.5H10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M14 7.5h2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M14 9.5h2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "videos",
      title: "Videos",
      subtitle: "Approve the client Videos",
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
    {
      key: "promotions",
      title: "Promo Codes",
      subtitle: "Create and manage discounts",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5.5 3h6.38c.35 0 .68.14.92.38l5.82 5.82a1.3 1.3 0 0 1 0 1.84l-6.36 6.36a1.3 1.3 0 0 1-1.84 0L4.62 11.6A1.3 1.3 0 0 1 4.25 10.7L4 5.5A2.5 2.5 0 0 1 5.5 3Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="8.75"
            cy="7.25"
            r="1.25"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <path
            d="M14 9.5 9.5 14"
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
