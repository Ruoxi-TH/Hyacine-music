import { apiBase } from "@/utils/apiBase";

export type NeteaseCapability =
  | "qr"
  | "profile"
  | "dailySongs"
  | "playlists"
  | "recommendations"
  | "search"
  | "createPlaylist";

type HealthResponse = {
  netease?: {
    direct?: boolean;
    capabilities?: Partial<Record<NeteaseCapability, boolean>>;
  };
};

const cache = new Map<string, Promise<Partial<Record<NeteaseCapability, boolean>>>>();

export async function getNeteaseCapabilities(backendUrl?: string): Promise<Partial<Record<NeteaseCapability, boolean>>> {
  const base = apiBase(backendUrl ?? "");
  if (!base) return {};
  const existing = cache.get(base);
  if (existing) return existing;
  const request = fetch(`${base}/health`)
    .then(async (response) => {
      if (!response.ok) return {};
      const body = (await response.json()) as HealthResponse;
      return body.netease?.capabilities ?? {};
    })
    .catch(() => ({}));
  cache.set(base, request);
  return request;
}

export async function supportsNeteaseCapability(backendUrl: string | undefined, capability: NeteaseCapability): Promise<boolean> {
  const capabilities = await getNeteaseCapabilities(backendUrl);
  return capabilities[capability] !== false;
}