import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { globalScrollY, handleScrollForFade, handleScrollEndForFade, resetScrollY } from "@/utils/scrollY";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useAccount } from "@/account";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedCard } from "@/components/ui/ThemedCard";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useAudio } from "@/hooks/useAudio";
import { useI18n, type TranslationKey } from "@/i18n";
import { resolvePlayableTrack } from "@/services/musicApi";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { useTheme } from "@/theme";
import { usePlayerStore } from "@/store/playerStore";
import { apiBase } from "@/utils/apiBase";
import { appLog, cookieMeta } from "@/utils/logger";
import { normalizeMediaUrl } from "@/utils/media";
import type { Track } from "@/types/music";
function coverMeta(url?: string | null): { present: boolean; protocol?: string; host?: string; path?: string } {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return { present: false };
  try {
    const parsed = new URL(normalized);
    return { present: true, protocol: parsed.protocol, host: parsed.host, path: parsed.pathname.slice(0, 80) };
  } catch {
    return { present: true, path: normalized.slice(0, 80) };
  }
}

function logCoverResult(event: "load" | "error", id: string, url?: string): void {
  appLog.info("cover", event, { id, ...coverMeta(url) });
}

// Cover URLs are normalized through the shared media helper.

interface DailySong { id: number; title: string; artists: string[]; coverUrl?: string; durationMs?: number; }

function greetingKeyForHour(hour: number): TranslationKey {
  if (hour < 6) return "greetingLateNight";
  if (hour < 11) return "greetingMorning";
  if (hour < 14) return "greetingNoon";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export default function HomeScreen(): React.JSX.Element {
  const { playTrack, skipTrack } = useAudio();
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { t } = useI18n();
  const { tokens } = useTheme();
  const { profile, getSourceCredential } = useAccount();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [greetingKey, setGreetingKey] = useState<TranslationKey>(() => greetingKeyForHour(new Date().getHours()));
  const requestSeq = useRef(0);
  const recommendationEntrance = useRef(new Animated.Value(1)).current;
  const swipeDirection = useRef(1);
  useEffect(() => {
    recommendationEntrance.setValue(0);
    Animated.timing(recommendationEntrance, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [featuredIndex, recommendationEntrance]);
  useEffect(() => {
    const timer = setInterval(() => setGreetingKey(greetingKeyForHour(new Date().getHours())), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { resetScrollY(); }, []);
  const loadDailySongs = useCallback(async (): Promise<void> => {
    const seq = ++requestSeq.current;
    if (!profile?.backendUrl || !profile.musicSources.includes("netease")) {
      if (seq === requestSeq.current) {
        setSongs([]);
        setLoading(false);
        setError(t("connectToViewDaily"));
      }
      appLog.info("home", "daily songs skipped", {
        hasBackend: Boolean(profile?.backendUrl),
        musicSource: profile?.musicSources ?? null,
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
          setError(t("noDailyRecommendations"));
        }
        appLog.warn("home", "daily songs capability missing");
        return;
      }
      const cookie = await getSourceCredential("netease");
      appLog.info("home", "daily songs cookie", { cookieMeta: cookieMeta(cookie) });
      if (!cookie) throw new Error(t("neteaseLoginExpired"));
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
      if (!response.ok || !Array.isArray(data)) throw new Error((data as { message?: string }).message || t("loadRecommendationsFailed"));
      appLog.info("home", "daily songs cover sample", {
        seq,
        samples: data.slice(0, 3).map((song) => ({ id: song.id, ...coverMeta(song.coverUrl) })),
      });
      if (seq !== requestSeq.current) {
        appLog.info("home", "daily songs stale response ignored", { seq, current: requestSeq.current });
        return;
      }
      setSongs(data.map((song) => ({
        id: `netease:${song.id}`,
        title: song.title,
        artist: song.artists.join(" / ") || t("neteaseCloud"),
        artwork: normalizeMediaUrl(song.coverUrl),
        duration: song.durationMs ? Math.round(song.durationMs / 1000) : undefined,
        url: "",
      })));
      appLog.info("home", "daily songs load ok", { count: data.length, seq });
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setSongs([]);
      setError(cause instanceof Error ? cause.message : t("loadRecommendationsFailed"));
      appLog.error("home", "daily songs load failed", cause);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [getSourceCredential, profile?.backendUrl, profile?.musicSources]);

  useEffect(() => {
    void loadDailySongs();
  }, [loadDailySongs]);

  const onPlay = async (track: Track): Promise<void> => {
    if (!profile?.backendUrl) {
      appLog.warn("home", "play skipped: no backend");
      return;
    }
    setPlayingId(track.id);
    setQueue(songs, track.id);
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
      setError(cause instanceof Error ? cause.message : t("playbackFailed"));
      appLog.error("home", "play failed", cause);
    } finally {
      setPlayingId("");
    }
  };

  const featured = songs[featuredIndex] ?? songs[0];
  const changeFeatured = (direction: number): void => {
    if (songs.length < 2) return;
    swipeDirection.current = direction;
    setFeaturedIndex((current) => (current + direction + songs.length) % songs.length);
    // 若当前播放的是 featured 曲目，则同时切换播放
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack && songs.some((s) => s.id === currentTrack.id)) {
      void skipTrack(direction as 1 | -1);
    }
  };
  const recommendationSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onEnd((event) => {
      if (Math.abs(event.translationX) >= 36) changeFeatured(event.translationX < 0 ? 1 : -1);
    });
  return <ThemedScreen>
    <Animated.ScrollView contentContainerClassName="px-5 pb-40 pt-16" onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false, listener: (e: { nativeEvent: { contentOffset: { x: number; y: number } } }) => handleScrollForFade(e.nativeEvent) })} scrollEventThrottle={16} onScrollEndDrag={handleScrollEndForFade} onMomentumScrollEnd={handleScrollEndForFade}>
      <View className="flex-row items-start justify-between">
        <View><Text style={{ color: tokens.text, fontSize: 31, fontWeight: "800" }}>{t(greetingKey)}</Text><Text className="mt-2 text-sm" style={{ color: tokens.mutedText }}>{t("dailyRecommendations")}</Text></View>
        <LiquidControlSurface className="h-11 w-11 items-center justify-center overflow-hidden rounded-full">
          {profile?.avatarUrl ? <Image className="h-full w-full" source={{ uri: profile.avatarUrl }} contentFit="cover" /> : <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "800" }}>{profile?.displayName?.slice(0, 1).toUpperCase() || "H"}</Text>}
        </LiquidControlSurface>
      </View>

      {loading ? <View className="h-72 items-center justify-center"><ActivityIndicator color={tokens.accent} /></View> : null}
      {!loading && featured ? <ThemedCard className="mt-9 p-0" style={{ borderRadius: 28 }}>
<Animated.View className="overflow-hidden p-5" style={{ opacity: recommendationEntrance, transform: [{ translateX: recommendationEntrance.interpolate({ inputRange: [0, 1], outputRange: [swipeDirection.current * 40, 0] }) }] }}>
             <GestureDetector gesture={recommendationSwipe}><View className="min-h-48 flex-row items-end">
              <View className="min-w-0 flex-1 pr-4">
                <Text className="text-xs font-bold" style={{ color: tokens.accent }}>{t("featuredForYou")}</Text>
                <Text className="mt-3 text-2xl font-bold" numberOfLines={2} style={{ color: tokens.text }}>{featured.title}</Text>
                <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: tokens.mutedText }}>{featured.artist}</Text>
              </View>
              <View className="h-48 w-40 items-end justify-center">
                {featured.artwork ? <><Image source={{ uri: songs[(featuredIndex + 2) % songs.length]?.artwork ?? featured.artwork }} contentFit="cover" style={{ position: "absolute", width: 112, height: 144, borderRadius: 24, right: 1, top: 9, opacity: 0.35, transform: [{ rotate: "12deg" }] }} /><Image source={{ uri: songs[(featuredIndex + 1) % songs.length]?.artwork ?? featured.artwork }} contentFit="cover" style={{ position: "absolute", width: 120, height: 160, borderRadius: 24, right: 18, top: 4, opacity: 0.65, transform: [{ rotate: "5deg" }] }} /><View className="absolute h-44 w-32 overflow-hidden rounded-3xl" style={{ right: 36, top: 0, shadowColor: "#17212d", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 0, transform: [{ rotate: "-4deg" }] }}><Image source={{ uri: featured.artwork }} contentFit="cover" style={{ width: "100%", height: "100%" }} onLoad={() => logCoverResult("load", featured.id, featured.artwork)} onError={() => logCoverResult("error", featured.id, featured.artwork)} /></View></> : <View className="h-44 w-32 items-center justify-center rounded-3xl" style={{ backgroundColor: `${tokens.accent}22`, borderWidth: 1, borderColor: `${tokens.accent}55` }}><Text style={{ color: tokens.accent, fontSize: 28, fontWeight: "900" }}>♪</Text></View>}
              </View>
            </View>
            </GestureDetector><Pressable onPress={() => void onPlay(featured)}><LiquidControlSurface className="mt-5 h-12 self-start rounded-full px-5" style={{ borderRadius: 24 }}><View className="h-full flex-row items-center justify-center"><Text style={{ color: tokens.text, fontWeight: "800" }}>{usePlayerStore.getState().currentTrack ? t("nowPlayingEllipsis") : `▶ ${t("playRecommendation")}`}</Text></View></LiquidControlSurface></Pressable>
          </Animated.View>

       </ThemedCard> : null}
      {!loading && error ? <Text className="mt-8 text-sm" style={{ color: "#ef4444" }}>{error}</Text> : null}

      <View className="mt-10 flex-row items-center justify-between"><Text style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>{t("dailySongs")}</Text><Pressable onPress={() => void loadDailySongs()}><Text className="text-xs font-semibold" style={{ color: tokens.accent }}>{t("refresh")}</Text></Pressable></View>
      <View className="mt-4 gap-3">{songs.slice(1).map((song) => <ThemedCard key={song.id} className="p-0" style={{ borderRadius: 20 }}><Pressable className="flex-row items-center p-3" style={{ backgroundColor: "transparent" }} onPress={() => void onPlay(song)}>{song.artwork ? <Image className="h-14 w-14 rounded-2xl" source={{ uri: song.artwork }} contentFit="cover" onLoad={() => logCoverResult("load", song.id, song.artwork)} onError={() => logCoverResult("error", song.id, song.artwork)} /> : <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tokens.accent}18` }}><Text style={{ color: tokens.accent, fontWeight: "900" }}>♪</Text></View>}<View className="ml-3 min-w-0 flex-1"><Text numberOfLines={1} style={{ color: tokens.text, fontWeight: "800" }}>{song.title}</Text><Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>{song.artist}</Text></View><Text style={{ color: tokens.accent, fontSize: 18 }}>{playingId === song.id ? "…" : "▶"}</Text></Pressable></ThemedCard>)}</View>
    </Animated.ScrollView>
  </ThemedScreen>;
}