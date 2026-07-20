import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAccount } from "@/account";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedCard } from "@/components/ui/ThemedCard";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useAudio } from "@/hooks/useAudio";
import { useI18n } from "@/i18n";
import { resolvePlayableTrack } from "@/services/musicApi";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { useTheme } from "@/theme";
import { apiBase } from "@/utils/apiBase";
import { appLog, cookieMeta } from "@/utils/logger";
import type { Track } from "@/types/music";

function normalizeCoverUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("https://")) return value;
  return value;
}

interface DailySong { id: number; title: string; artists: string[]; coverUrl?: string; durationMs?: number; }

export default function HomeScreen(): React.JSX.Element {
  const { playTrack } = useAudio();
  const { t } = useI18n();
  const { tokens } = useTheme();
  const { profile, getSourceCredential } = useAccount();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState("");

  const requestSeq = useRef(0);
  const loadDailySongs = useCallback(async (): Promise<void> => {
    const seq = ++requestSeq.current;
    if (!profile?.backendUrl || profile.musicSource !== "netease") {
      if (seq === requestSeq.current) {
        setSongs([]);
        setLoading(false);
        setError("绑定网易云音乐后可查看每日推荐");
      }
      appLog.info("home", "daily songs skipped", {
        hasBackend: Boolean(profile?.backendUrl),
        musicSource: profile?.musicSource ?? null,
      });
      return;
    }
    if (seq === requestSeq.current) {
      setLoading(true);
      setError("");
    }
    appLog.info("home", "daily songs load start", { seq });
    try {
      if (!(await supportsNeteaseCapability(profile.backendUrl, "dailySongs"))) {
        if (seq === requestSeq.current) {
          setSongs([]);
          setError("当前服务器尚未提供网易云每日推荐。");
        }
        appLog.warn("home", "daily songs capability missing");
        return;
      }
      const cookie = await getSourceCredential("netease");
      appLog.info("home", "daily songs cookie", { cookieMeta: cookieMeta(cookie) });
      if (!cookie) throw new Error("网易云登录已失效");
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/daily-songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await response.json() as DailySong[] | { message?: string };
      appLog.info("home", "daily songs response", {
        status: response.status,
        ok: response.ok,
        ms: Date.now() - started,
        count: Array.isArray(data) ? data.length : 0,
        seq,
      });
      if (!response.ok || !Array.isArray(data)) throw new Error((data as { message?: string }).message || "无法加载每日推荐");
      if (seq !== requestSeq.current) {
        appLog.info("home", "daily songs stale response ignored", { seq, current: requestSeq.current });
        return;
      }
      setSongs(data.map((song) => ({
        id: `netease:${song.id}`,
        title: song.title,
        artist: song.artists.join(" / ") || "网易云音乐",
        artwork: normalizeCoverUrl(song.coverUrl),
        duration: song.durationMs ? Math.round(song.durationMs / 1000) : undefined,
        url: "",
      })));
      appLog.info("home", "daily songs load ok", { count: data.length, seq });
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setSongs([]);
      setError(cause instanceof Error ? cause.message : "无法加载每日推荐");
      appLog.error("home", "daily songs load failed", cause);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [getSourceCredential, profile?.backendUrl, profile?.musicSource]);

  useEffect(() => {
    void loadDailySongs();
  }, [loadDailySongs]);

  const onPlay = async (track: Track): Promise<void> => {
    if (!profile?.backendUrl) {
      appLog.warn("home", "play skipped: no backend");
      return;
    }
    setPlayingId(track.id);
    setError("");
    appLog.info("home", "play pressed", { trackId: track.id, title: track.title });
    try {
      const cookie = await getSourceCredential("netease");
      appLog.info("home", "play cookie", { cookieMeta: cookieMeta(cookie) });
      const playable = await resolvePlayableTrack({ backendUrl: profile.backendUrl, track, cookie });
      appLog.info("home", "playable resolved", { trackId: playable.id, hasUrl: Boolean(playable.url) });
      await playTrack(playable);
      appLog.info("home", "play request finished", { trackId: track.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "播放失败");
      appLog.error("home", "play failed", cause);
    } finally {
      setPlayingId("");
    }
  };

  const featured = songs[0];
  return <ThemedScreen>
    <ScrollView contentContainerClassName="px-5 pb-40 pt-16">
      <View className="flex-row items-start justify-between">
        <View><Text style={{ color: tokens.text, fontSize: 31, fontWeight: "800" }}>{t("greeting")}</Text><Text className="mt-2 text-sm" style={{ color: tokens.mutedText }}>网易云音乐每日推荐</Text></View>
        <LiquidControlSurface className="h-11 w-11 items-center justify-center overflow-hidden rounded-full">
          {profile?.avatarUrl ? <Image className="h-full w-full" source={{ uri: profile.avatarUrl }} contentFit="cover" /> : <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "800" }}>{profile?.displayName?.slice(0, 1).toUpperCase() || "H"}</Text>}
        </LiquidControlSurface>
      </View>

      {loading ? <View className="h-72 items-center justify-center"><ActivityIndicator color={tokens.accent} /></View> : null}
      {!loading && featured ? <ThemedCard className="mt-9 p-0" style={{ borderRadius: 28 }}>
        <Pressable className="overflow-hidden p-5" onPress={() => void onPlay(featured)}>
          <Image className="absolute inset-0 h-full w-full" source={{ uri: featured.artwork }} contentFit="cover" style={{ opacity: 0.16 }} />
          <View className="min-h-48 flex-row items-end">
            <View className="min-w-0 flex-1 pr-4">
              <Text className="text-xs font-bold" style={{ color: tokens.accent }}>为你推荐</Text>
              <Text className="mt-3 text-2xl font-bold" numberOfLines={2} style={{ color: tokens.text }}>{featured.title}</Text>
              <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: tokens.mutedText }}>{featured.artist}</Text>
            </View>
            <View className="h-48 w-40 items-end justify-center">
              {featured.artwork ? (
                <>
                  <Image className="absolute h-36 w-28 rounded-3xl" source={{ uri: featured.artwork }} contentFit="cover" style={{ right: 1, top: 9, opacity: 0.35, transform: [{ rotate: "12deg" }] }} />
                  <Image className="absolute h-40 w-30 rounded-3xl" source={{ uri: featured.artwork }} contentFit="cover" style={{ right: 18, top: 4, opacity: 0.65, transform: [{ rotate: "5deg" }] }} />
                  <View className="absolute h-44 w-32 overflow-hidden rounded-3xl" style={{ right: 36, top: 0, shadowColor: "#17212d", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 0, transform: [{ rotate: "-4deg" }] }}>
                    <Image className="h-full w-full" source={{ uri: featured.artwork }} contentFit="cover" />
                  </View>
                </>
              ) : (
                <View className="h-44 w-32 items-center justify-center rounded-3xl" style={{ backgroundColor: `${tokens.accent}22`, borderWidth: 1, borderColor: `${tokens.accent}55` }}>
                  <Text style={{ color: tokens.accent, fontSize: 28, fontWeight: "900" }}>♪</Text>
                </View>
              )}
            </View>
          </View>
          <LiquidControlSurface className="mt-5 h-12 self-start rounded-full px-5" style={{ borderRadius: 24 }}><View className="h-full flex-row items-center justify-center"><Text style={{ color: tokens.text, fontWeight: "800" }}>{playingId === featured.id ? "正在播放..." : "▶ 播放推荐歌曲"}</Text></View></LiquidControlSurface>
        </Pressable>
      </ThemedCard> : null}
      {!loading && error ? <Text className="mt-8 text-sm" style={{ color: "#ef4444" }}>{error}</Text> : null}

      <View className="mt-10 flex-row items-center justify-between"><Text style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>每日歌曲</Text><Pressable onPress={() => void loadDailySongs()}><Text className="text-xs font-semibold" style={{ color: tokens.accent }}>刷新</Text></Pressable></View>
      <View className="mt-4 gap-3">{songs.slice(1, 9).map((song) => <ThemedCard key={song.id} className="p-0" style={{ borderRadius: 20 }}><Pressable className="flex-row items-center p-3" style={{ backgroundColor: "transparent" }} onPress={() => void onPlay(song)}>{song.artwork ? <Image className="h-14 w-14 rounded-2xl" source={{ uri: song.artwork }} contentFit="cover" /> : <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tokens.accent}18` }}><Text style={{ color: tokens.accent, fontWeight: "900" }}>♪</Text></View>}<View className="ml-3 min-w-0 flex-1"><Text numberOfLines={1} style={{ color: tokens.text, fontWeight: "800" }}>{song.title}</Text><Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>{song.artist}</Text></View><Text style={{ color: tokens.accent, fontSize: 18 }}>{playingId === song.id ? "…" : "▶"}</Text></Pressable></ThemedCard>)}</View>
    </ScrollView>
  </ThemedScreen>;
}