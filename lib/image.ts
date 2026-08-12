/**
 * Lightweight Client/Server Image Helper
 * Handles image data URL validation & file extension sanitization
 */

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatWeight(gram: number): string {
  if (gram >= 1000) {
    return `${(gram / 1000).toFixed(1)} kg`;
  }
  return `${gram} gram`;
}