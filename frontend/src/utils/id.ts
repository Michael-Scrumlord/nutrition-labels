// utils/id.ts
//
// Shared ID generation. crypto.randomUUID() is unavailable in insecure
// contexts (plain http://hostname), so we fall back to a time+random string.

export function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
