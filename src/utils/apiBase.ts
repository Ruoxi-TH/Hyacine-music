export function normalizeBackendUrl(url: string | null | undefined): string {
  return (url ?? "").trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
}

export function apiBase(url: string | null | undefined): string {
  const base = normalizeBackendUrl(url);
  return base ? `${base}/api/v1` : "";
}
