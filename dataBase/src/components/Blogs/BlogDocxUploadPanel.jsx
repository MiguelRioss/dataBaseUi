// src/components/Blogs/BlogDocxUploadPanel.jsx
import React from "react";
import PropTypes from "prop-types";

export default function BlogDocxUploadPanel({ onFilesSelected }) {
  const [files, setFiles] = React.useState([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    const docx = arr.filter((f) => f.name.toLowerCase().endsWith(".docx"));

    if (!docx.length) {
      setError("Please upload .docx Word files only.");
      return;
    }

    setError("");
    setFiles(docx);
    if (typeof onFilesSelected === "function") {
      onFilesSelected(docx);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <section className="blog-upload">
      <header className="blog-upload__header">
        <h2>Blog &amp; Content</h2>
        <p>
          Drag and drop your finished Word documents here. We’ll convert them
          into Mesodose blog posts (DOCX → JSON) for the website.
        </p>
      </header>

      <div
        className={
          "blog-upload__dropzone" +
          (isDragging ? " blog-upload__dropzone--dragging" : "")
        }
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="blog-upload__icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 3h7.5L18 7.5V21H6V3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 3V7.5H18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 11H15M8.5 13.5H15M8.5 16H12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="blog-upload__text">
          <p className="blog-upload__title">
            Drop .docx files here or click to browse
          </p>
          <p className="blog-upload__hint">
            Each file should be a single blog post using your SEO header format.
          </p>
        </div>

        <label className="blog-upload__button">
          <span>Choose files</span>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            onChange={onInputChange}
          />
        </label>
      </div>

      {error && <p className="blog-upload__error">{error}</p>}

      {files.length > 0 && (
        <div className="blog-upload__list">
          <h3>Files ready to convert</h3>
          <ul>
            {files.map((f) => (
              <li key={f.name}>
                <span className="blog-upload__file-name">{f.name}</span>
                <span className="blog-upload__file-size">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

BlogDocxUploadPanel.propTypes = {
  onFilesSelected: PropTypes.func,
};
