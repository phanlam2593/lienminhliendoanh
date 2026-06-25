// Mask a password into a hint: keep first 2 + last 1 chars, replace middle with *.
// Short passwords degrade gracefully (len 3 → "a*c", len 2 → "**", len 1 → "*").
export function maskPassword(pw: string): string {
  if (!pw) return "";
  const n = pw.length;
  if (n <= 1) return "*";
  if (n <= 3) return pw[0] + "*".repeat(Math.max(1, n - 2)) + pw[n - 1];
  return pw.slice(0, 2) + "*".repeat(n - 3) + pw.slice(-1);
}

// Mask a username similarly: h**a from "hoa" → first + stars + last.
export function maskUsername(u: string): string {
  if (!u) return "";
  const n = u.length;
  if (n <= 1) return "*";
  if (n === 2) return u[0] + "*";
  return u[0] + "*".repeat(n - 2) + u[n - 1];
}
