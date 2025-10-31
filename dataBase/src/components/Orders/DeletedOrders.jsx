import React from "react";
import OrdersTable from "./OrdersTable";
import { sortRows, toggleSort } from "./commonFiles/orderUtils.js";
// TODO: wire these to your real services
import { getDeletedOrders } from "../services/orderServices.mjs";

export default function DeletedOrders({ className = "" }) {
  const [rows, setRows] = React.useState([]);
  const [sort, setSort] = React.useState({ key: "date", dir: "desc" });
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  React.useEffect(() => {
    (async () => {
      const data = await getDeletedOrders(); // -> array of rows
      setRows(sortRows(data, sort));
      setSelectedIds(new Set());
    })();
  }, []);

  React.useEffect(() => {
    setRows(prev => sortRows(prev, sort));
  }, [sort]);

  function handleToggleSort(colKey) {
    setSort(prev => toggleSort(prev, colKey));
  }

  function handleToggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    setSelectedIds(prev => {
      if (rows.length === 0) return new Set();
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map(r => r.id));
    });
  }

  const rowProps = () => ({});

  return (
    <div className={className}>
      <h2 className="text-xl font-semibold">Deleted Orders</h2>

      <OrdersTable
        rows={rows}
        sort={sort}
        onToggleSort={handleToggleSort}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        allSelected={allSelected}
        onToggleAll={handleToggleAll}
        rowProps={rowProps}
        className="mt-4"
      />
    </div>
  );
}
