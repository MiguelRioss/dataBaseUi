import React, { useState } from "react";
import { updateBlogDate } from "../services/blogAdminApi.mjs";

export default function EditDateButton({ slug, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!date) return;

    try {
      setSaving(true);
      setError("");

      // convert YYYY-MM-DD → ISO
      const isoDate = new Date(`${date}T00:00:00Z`).toISOString();

      const updated = await updateBlogDate(slug, isoDate);
      onUpdated?.(updated);

      setOpen(false);
      setDate("");
    } catch (err) {
      setError(err.message || "Failed to update date");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className=" btn ml-2 px-3 py-1.5 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        Edit date
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-medium mb-4">
              Change publish date
            </h3>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="btn w-full border rounded-md px-3 py-2 mb-3"
            />

            {error && (
              <div className="text-sm text-red-600 mb-2">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="btn px-4 py-2 rounded-md border"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!date || saving}
                className={`btn px-4 py-2 rounded-md text-white ${
                  saving
                    ? "bg-blue-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
