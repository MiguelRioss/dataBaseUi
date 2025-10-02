const DEFAULT_API_BASE = "https://api-backend-mesodose-2.onrender.com";

export function resolveApiBase() {
  const envBase = import.meta?.env?.VITE_API_BASE_URL;
  const base = (typeof envBase === "string" && envBase.trim().length > 0)
    ? envBase.trim()
    : DEFAULT_API_BASE;
  return base.replace(/\/$/, "");
}

export const API_BASE = resolveApiBase();
