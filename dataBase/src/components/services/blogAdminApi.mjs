import { API_BASE } from "./apiBase";

export async function updateBlogDate(slug, isoDate) {
  const res = await fetch(`${API_BASE}/api/blogs/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changes: {
        updatedAtISO: isoDate,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Update failed (${res.status})`);
  }

  return res.json();
}
