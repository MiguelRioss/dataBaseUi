import React from "react";
import ObjectPopup from "../PopUp/ObjectPopup";
import ShipmentStatusView from "./ShipmentStatusView.jsx";
import ClickableBadge from "../ClicableBadge";
import {
  SHIPMENT_STATUS_STEPS,
  SHIPMENT_STATUS_KEYS,
  normalizeShipmentStatus,
} from "./shipmentStatus.js";

export default function StatusPopup({
  status,
  onSave,
  title = "Shipment status",
  buttonText = "View",
}) {
  const canonical = normalizeShipmentStatus(status);
  const initial = SHIPMENT_STATUS_KEYS.reduce((acc, key) => {
    acc[key] = !!canonical[key]?.status;
    return acc;
  }, {});

  const [edit, setEdit] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Keep in sync with parent updates
  React.useEffect(() => {
    const nextCanonical = normalizeShipmentStatus(status);
    setEdit(
      SHIPMENT_STATUS_KEYS.reduce((acc, key) => {
        acc[key] = !!nextCanonical[key]?.status;
        return acc;
      }, {})
    );
  }, [status]);

  const handleSave = async () => {
    if (!onSave) return;
    setError("");
    setSaving(true);
    try {
      await onSave({ ...edit });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ObjectPopup
      title={title}
      buttonText={buttonText}
      fields={[
        {
          key: "status",
          label: "Current",
          render: () => <ShipmentStatusView status={status} />, // ← not edit
        },
        ,
        {
          key: "edit",
          label: "Edit",
          render: () => (
            <div className="grid gap-3">
              {/* Render badges dynamically */}
              <div className="flex flex-wrap gap-3">
                {SHIPMENT_STATUS_STEPS.map(({ key, label }) => (
                  <ClickableBadge
                    key={key}
                    ok={edit[key]}
                    onToggle={() =>
                      setEdit((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    trueText={label}
                    falseText={label}
                  />
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  className="btn inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500 text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-60"
                  onClick={handleSave}
                  disabled={saving || !onSave}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
