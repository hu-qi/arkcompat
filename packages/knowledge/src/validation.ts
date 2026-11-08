import { valid } from "semver";

export function timestamp(value: string) {
  const time = Date.parse(value);
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
    Number.isFinite(time) &&
    new Date(time).toISOString() === value.replace(/Z$/, ".000Z")
  );
}
export function cleanText(value: string) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
export function exactVersion(value: string) {
  return cleanText(value) && /^[0-9]/.test(value) && valid(value) !== null;
}
