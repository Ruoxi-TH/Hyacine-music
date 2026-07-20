import { apiBase } from "@/utils/apiBase";
import type { Track } from "@/types/music";
import { appLog, cookieMeta, summarizeUrl } from "@/utils/logger";

function normalizeMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function resolveBackendAssetUrl(backendUrl: string, rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;

  const base = apiBase(backendUrl);
  const origin = base.replace(/\/api\/v1$/i, "");

  // Older servers returned /api/v1/music-sources/...; newer ones return
  // /music-sources/... so clients that already prefix apiBase stay correct.
  if (value.startsWith("/api/v1/")) {
    return `${origin}${value}`;
  }
  if (value.startsWith("/")) {
    return `${base}${value}`;
  }
  return `${base}/${value}`;
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 20000): Promise<T> {
  appLog.info("http", "POST start", { url: summarizeUrl(url), timeoutMs });
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as T & { message?: string };
    appLog.info("http", "POST done", {
      url: summarizeUrl(url),
      status: response.status,
      ok: response.ok,
      ms: Date.now() - started,
    });
    if (!response.ok) {
      const message = (data as { message?: string } | null)?.message ?? `HTTP ${response.status}`;
      appLog.error("http", "POST failed", {
        url: summarizeUrl(url),
        status: response.status,
        message,
      });
      throw new Error(message);
    }
    return data;
  } catch (error) {
    const aborted = error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message));
    appLog.error("http", aborted ? "POST timeout/aborted" : "POST error", {
      url: summarizeUrl(url),
      ms: Date.now() - started,
      error,
    });
    if (aborted) throw new Error("请求超时，请检查后端或网络");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchTracks(options: {
  backendUrl: string;
  source: "netease" | "bilibili";
  keywords: string;
  cookie?: string | null;
}): Promise<Track[]> {
  const base = apiBase(options.backendUrl);
  const keywords = options.keywords.trim();
  if (!base || !keywords) return [];

  appLog.info("musicApi", "searchTracks", {
    source: options.source,
    keywords,
    cookieMeta: cookieMeta(options.cookie),
  });

  if (options.source === "netease") {
    const rows = await postJson<
      Array<{
        id: number;
        title: string;
        artists: string[];
        coverUrl?: string;
        durationMs?: number;
      }>
    >(`${base}/music-sources/netease/search`, {
      keywords,
      limit: 30,
      cookie: options.cookie ?? undefined,
    });
    return rows.map((item) => ({
      id: `netease:${item.id}`,
      title: item.title,
      artist: (item.artists ?? []).join(" / ") || "网易云",
      url: "",
      artwork: normalizeMediaUrl(item.coverUrl),
      duration: item.durationMs ? Math.round(item.durationMs / 1000) : undefined,
    }));
  }

  const rows = await postJson<
    Array<{
      id: string;
      title: string;
      artists: string[];
      coverUrl?: string;
      duration?: string;
    }>
  >(`${base}/music-sources/bilibili/search`, {
    keywords,
    limit: 30,
    cookie: options.cookie ?? undefined,
  });
  return rows.map((item) => ({
    id: `bilibili:${item.id}`,
    title: item.title,
    artist: (item.artists ?? []).join(" / ") || "哔哩哔哩",
    url: "",
    artwork: normalizeMediaUrl(item.coverUrl),
  }));
}

export async function resolvePlayableTrack(options: {
  backendUrl: string;
  track: Track;
  cookie?: string | null;
}): Promise<Track> {
  const base = apiBase(options.backendUrl);
  if (!base) throw new Error("未配置服务器地址");

  appLog.info("musicApi", "resolvePlayableTrack start", {
    trackId: options.track.id,
    title: options.track.title,
    cookieMeta: cookieMeta(options.cookie),
    backend: summarizeUrl(base),
  });

  if (options.track.id.startsWith("netease:")) {
    const id = Number(options.track.id.replace("netease:", ""));
    const result = await postJson<{ url: string; br?: number }>(`${base}/music-sources/netease/play-url`, {
      id,
      level: "exhigh",
      cookie: options.cookie ?? undefined,
    });
    if (!result.url) throw new Error("未获取到网易云播放地址");
    const resolved = resolveBackendAssetUrl(options.backendUrl, result.url);
    appLog.info("musicApi", "netease play-url resolved", {
      id,
      rawUrl: summarizeUrl(result.url),
      resolvedUrl: summarizeUrl(resolved),
      br: result.br,
    });
    return {
      ...options.track,
      artwork: normalizeMediaUrl(options.track.artwork),
      url: resolved,
    };
  }

  if (options.track.id.startsWith("bilibili:")) {
    const id = options.track.id.replace("bilibili:", "");
    const result = await postJson<{ url: string; quality?: string; cid?: string }>(
      `${base}/music-sources/bilibili/play-url`,
      {
        id,
        cookie: options.cookie ?? undefined,
      },
    );
    if (!result.url) throw new Error("未获取到 Bilibili 播放地址");
    appLog.info("musicApi", "bilibili play-url resolved", {
      id,
      url: summarizeUrl(result.url),
      quality: result.quality,
    });
    return {
      ...options.track,
      url: result.url,
      headers: {
        Referer: "https://www.bilibili.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
      },
    };
  }

  if (options.track.url) {
    appLog.info("musicApi", "track already has url", {
      trackId: options.track.id,
      url: summarizeUrl(options.track.url),
    });
    return options.track;
  }
  appLog.error("musicApi", "unable to resolve track url", { trackId: options.track.id });
  throw new Error("无法解析该音源的播放地址");
}