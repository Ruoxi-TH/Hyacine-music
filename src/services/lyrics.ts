import { apiBase } from "@/utils/apiBase";

export interface LyricLine { time: number; text: string; translation?: string }

function parse(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const row of raw.split(/\r?\n/)) {
    const text = row.replace(/^(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/, "").trim();
    for (const item of row.matchAll(/\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g)) {
      if (text) lines.push({ time: Number(item[1]) * 60 + Number(item[2]), text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export async function loadLyrics(backendUrl: string, id: string, cookie?: string | null): Promise<LyricLine[]> {
  if (!id.startsWith("netease:")) return [];
  const songId = Number(id.slice(8));
  if (!songId) return [];
  const response = await fetch(`${apiBase(backendUrl)}/music-sources/netease/lyrics`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: songId, cookie: cookie ?? undefined }),
  });
  if (!response.ok) return [];
  const body = await response.json() as { lyric?: string; translation?: string };
  const source = parse(body.lyric ?? "");
  const translated = parse(body.translation ?? "");
  return source.map((line) => ({ ...line, translation: translated.find((item) => Math.abs(item.time - line.time) < .15)?.text }));
}