// pages/Videos.jsx
import React from "react";
import VideoRow from "./VideoRow";
import SortableTh from "../Orders/commonFiles/toggleSort";
import { getAllVideosService } from "../services/videoServices.mjs";

export default function Videos() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [sort, setSort] = React.useState({ key: "uploadedAt", dir: "desc" });
  const [searchTerm, setSearchTerm] = React.useState("");
  const [deletingId, setDeletingId] = React.useState(null);

  // Load videos
  const load = React.useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const videos = await getAllVideosService();
      setRows(videos);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);


  // Sorting configuration
  const SORT_KEYS = {
    id: (r) => r.id,
    filename: (r) => (r.filename || "").toLowerCase(),
    originalName: (r) => (r.originalName || "").toLowerCase(),
    uploadedAt: (r) => new Date(r.uploadedAt || r.createdAt || 0).getTime(),
    status: (r) => (r.status || "").toLowerCase(),
  };

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key)
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      const defaultDir = ["uploadedAt", "size"].includes(key) ? "desc" : "asc";
      return { key, dir: defaultDir };
    });
  };

  // Filter and sort rows
  const filteredRows = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    
    return rows.filter((video) => {
      const idMatch = String(video.id ?? "").toLowerCase().includes(query);
      const filenameMatch = String(video.filename ?? "").toLowerCase().includes(query);
      const originalNameMatch = String(video.originalName ?? "").toLowerCase().includes(query);
      const statusMatch = String(video.status ?? "").toLowerCase().includes(query);
      
      return idMatch || filenameMatch || originalNameMatch || statusMatch;
    });
  }, [rows, searchTerm]);

  const sortedRows = React.useMemo(() => {
    const targetRows = filteredRows;
    const getter = SORT_KEYS[sort.key];
    if (!getter) return targetRows;
    
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...targetRows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  }, [filteredRows, sort]);

  return (
    <div className="page py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="videos-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="videos-title text-xl font-semibold">Videos</h1>
          
          <div className="videos-actions flex flex-wrap gap-4 items-center">
            <button
              className="btn btn--primary"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="new-order-hint new-order-hint--error mt-4">
            {error}
          </div>
        ) : null}

        <div className="mt-4 w-full">
          <label
            htmlFor="videos-search"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Search Videos
          </label>
          <input
            id="videos-search"
            type="text"
            className="new-order-input w-full"
            placeholder="Search by ID, filename, original name, or status"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* State feedback */}
        {loading ? (
          <div className="page text-center mt-6">Loading videos...</div>
        ) : !rows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No videos uploaded yet.
          </div>
        ) : !filteredRows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No videos match your search.
          </div>
        ) : (
          <div className="overflow-x-auto mt-6">
            <table className="card w-full text-sm">
              <thead>
                <tr>
                  <SortableTh
                    label="Video ID"
                    colKey="id"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Filename"
                    colKey="filename"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Original Name"
                    colKey="originalName"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Upload Date"
                    colKey="uploadedAt"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <th>Preview</th>
                  <th>URL</th>
                  <SortableTh
                    label="Status"
                    colKey="status"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((video) => (
                  <VideoRow
                    key={video.id}
                    video={video}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}