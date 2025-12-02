// src/components/Blogs/BlogPage.jsx
import BlogDocxUploadPanel from "./BlogDocxUploadPanel";
import BlogAdminList from "./BlogAdminList";
import { API_BASE } from "../services/apiBase";

export default function BlogPage() {
  const handleSubmitDocx = async (files) => {
    // 1) send files to backend for DOCX → JSON → save
    // for now: one file example
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    // TODO: you’ll build a /api/blogs/import endpoint that:
    // - runs buildFullBlogFromDocx
    // - calls addBlogJsonObject(jsonBlogObject)
    const res = await fetch(`${API_BASE}/api/blogs/import-docx`, {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to import blogs");
    }

    // Optionally refresh BlogAdminList after
  };

  return (
    <>
      <BlogDocxUploadPanel onSubmit={handleSubmitDocx} />
      <hr className="my-8" />
      <BlogAdminList />
    </>
  );
}
