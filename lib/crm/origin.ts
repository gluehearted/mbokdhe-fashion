/** Match the browser's actual Host, including a local preview alias/port.
 * Next can reconstruct request.url using its internal localhost bind name.
 * Forwarded host headers are deliberately excluded from this decision.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const external = new URL(origin);
    const internal = new URL(request.url);
    const host = request.headers.get("host") || internal.host;
    return external.origin === origin && external.protocol === internal.protocol && external.host === host.toLowerCase();
  } catch { return false; }
}
