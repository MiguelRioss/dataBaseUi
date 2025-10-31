import React from "react";
import SortableTh from "./commonFiles/toggleSort";
import OrderRow from "./OrderRow";

/**
 * Reusable Orders table layout
 *
 * Props:
 * - rows: array of row objects already filtered/sorted (what you currently call sortedRows)
 * - sort: { key, dir }
 * - onToggleSort: (key) => void
 * - selectedIds: Set<string>
 * - onToggleRow: (id: string) => void
 * - allSelected: boolean
 * - onToggleAll: () => void
 *
 * - rowProps: function(row) => extra props for <OrderRow/> (so the parent can inject handlers like onSaveTrackUrl, sendingEmail, etc.)
 *
 * Notes:
 * - Keeps ONLY table layout concerns here.
 * - Parent controls data, selection, and all handlers.
 */
export default function OrdersTable({
  rows,
  sort,
  onToggleSort,
  selectedIds,
  onToggleRow,
  allSelected,
  onToggleAll,
  rowProps,
  className = "",
}) {
  return (
    <div className={`overflow-x-auto mt-6 ${className}`}>
      <table className="card w-full text-sm align-middle">
        <thead>
          <tr>
            {/* Master checkbox */}
            <th className="px-2 text-center">
              <input
                type="checkbox"
                checked={allSelected && rows.length > 0}
                onChange={onToggleAll}
              />
            </th>

            <SortableTh label="Order ID"      colKey="id"              sort={sort} onToggle={onToggleSort} />
            <SortableTh label="Payment ID"    colKey="payment"         sort={sort} onToggle={onToggleSort} />
            <SortableTh label="Date"          colKey="date"            sort={sort} onToggle={onToggleSort} />
            <SortableTh label="Customer"      colKey="customer"        sort={sort} onToggle={onToggleSort} />
            <SortableTh label="Email"         colKey="email"           sort={sort} onToggle={onToggleSort} />
            <th>Products</th>
            <th>Address</th>
            <SortableTh label="Price"         colKey="price"           sort={sort} onToggle={onToggleSort} />
            <th>Track URL</th>
            <SortableTh label="Payment Status" colKey="payment_status" sort={sort} onToggle={onToggleSort} />
            <th>Actions</th>
            <SortableTh label="Status"        colKey="status"          sort={sort} onToggle={onToggleSort} />
            <SortableTh
              label="Completed?"
              colKey="completed"
              sort={sort}
              onToggle={onToggleSort}
              className="text-center"
            />
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-middle">
              {/* Row checkbox */}
              <td className="px-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => onToggleRow(r.id)}
                />
              </td>

              <OrderRow
                row={r}
                {...(typeof rowProps === "function" ? rowProps(r) : {})}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
