// Stable JSON comparison/hashing: PostgreSQL jsonb does not preserve object-key order.
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const object = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(object)
      .filter((k) => object[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(object[k]))
      .join(",") +
    "}"
  );
}
