import React, { useEffect, useState } from "react";
import { API_BASE } from "../services/apiBase";
import EditDateButton from "./EditDateButton.jsx";

export default function BlogAdminList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");

  // --- Load all blogs on mount
  useEffect(() => {
    async function fetchBlogs() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/blogs`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setBlogs(data);
      } catch (err) {
        setError(err.message || "Failed to load blogs");
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  // --- Delete a blog
  const handleDelete = async (slug) => {
    const confirm = window.confirm(
      `Are you sure you want to permanently delete "${slug}"?`
    );
    if (!confirm) return;

    try {
      setDeleting(slug);
      const res = await fetch(`${API_BASE}/api/blogs/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      // remove from list
      setBlogs((prev) => prev.filter((b) => b.id !== slug));
    } catch (err) {
      alert(err.message || "Error deleting blog");
    } finally {
      setDeleting("");
    }
  };

  if (loading)
    return <div className="p-4 text-neutral-500">Loading blogs...</div>;
  if (error)
    return <div className="p-4 text-red-600">Error: {String(error)}</div>;
  if (!blogs.length)
    return <div className="p-4 text-neutral-500">No blogs found.</div>;

  return (
    <section className="blog-admin">
      <h2 className="text-xl font-semibold mb-3">All Blogs</h2>

      <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-neutral-600">
                Title
              </th>
              <th className="text-left py-3 px-4 font-medium text-neutral-600">
                Slug
              </th>
              <th className="text-left py-3 px-4 font-medium text-neutral-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((b) => (
              <tr
                key={b.id}
                className="border-t hover:bg-neutral-50 transition-colors"
              >
                <td className="py-3 px-4">{b.title || "(Untitled)"}</td>
                <td className="py-3 px-4 text-neutral-500">{b.id}</td>
                <td className="py-3 px-4 flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deleting === b.id}
                    className={` btn px-3 py-1.5 rounded-md text-sm font-medium ${
                      deleting === b.id
                        ? "bg-neutral-300 text-neutral-700 cursor-not-allowed"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {deleting === b.id ? "Deleting..." : "Delete"}
                  </button>

                  <EditDateButton
                    slug={b.id}
                    onUpdated={(updatedBlog) => {
                      setBlogs((prev) =>
                        prev.map((blog) =>
                          blog.id === b.id ? { ...blog, ...updatedBlog } : blog
                        )
                      );
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
