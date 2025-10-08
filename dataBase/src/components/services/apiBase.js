const DEFAULT_API_BASE = "https://api-backend-mesodose-2.onrender.com";
const DEFAULT_API_BASE_LOCAL = "http://localhost:3000";

function readEnvBase() {
  if (typeof import.meta !== "undefined" && import.meta?.env) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof process !== "undefined" && process?.env) {
    return process.env.VITE_API_BASE_URL;
  }
  return undefined;
}

function normalizeBase(value) {
  if (!value) return undefined;
  const trimmed = `${value}`.trim();
  if (!trimmed) return undefined;
  const flag = trimmed.toLowerCase();
  if (flag === "local") return DEFAULT_API_BASE_LOCAL;
  if (flag === "online" || flag === "prod" || flag === "production") {
    return DEFAULT_API_BASE;
  }
  return trimmed.replace(/\/$/, "");
}

export function resolveApiBase() {
  const envBase = normalizeBase(readEnvBase());
  if (envBase) return envBase;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  if (typeof location !== "undefined" && location.origin) {
    return location.origin.replace(/\/$/, "");
  }

  return DEFAULT_API_BASE;
}

export const API_BASE = resolveApiBase();
