// utils/compareUtils.js
export const stableSerialize = (value) => {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(",")}}`;
};
export const deepEqual = (a, b) => stableSerialize(a) === stableSerialize(b);
