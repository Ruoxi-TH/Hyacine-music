import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useAudio } from "@/hooks/useAudio";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { usePlayerStore } from "@/store/playerStore";
import { apiBase } from "@/utils/apiBase";
import { appLog, cookieMeta } from "@/utils/logger";
import { normalizeMediaUrl } from "@/utils/media";
import type { Track } from "@/types/music";

interface PlaylistTrack { id: number; title: string; artists: string[]; coverUrl: string; durationMs: number; }

export default function PlaylistDetailScreen(): React.JSX.Element {
  const { id, name, cover } = useLocalSearchParams<{ id: string; name: string; cover?: string }>();
  const { profile, getSourceCredential } = useAccount();
  const { playTrack } = useAudio();
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { t } = useI18n();
  const { tokens } = useTheme();
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cover entrance animation: scale from 0.4 to 1, opacity 0 to 1
  const coverScale = useRef(new Animated.Value(0.4)).current;
  const coverOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(coverScale, { toValue: 1, stiffness: 200, damping: 18, mass: 0.8, useNativeDriver: true }),
      Animated.timing(coverOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const load = useCallback(async () => {
    if (!profile?.backendUrl || !id) { setLoading(false); setError(t("missingParam")); return; }
    const cookie = await getSourceCredential("netease");
    appLog.info("playlist-detail", "load start", { id, cookieMeta: cookieMeta(cookie) });
    try {
      const res = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/playlists/detail`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id), cookie }), signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
      setTracks(data);
    } catch (e) { setError(String(e)); appLog.error("playlist-detail", "load failed", { error: e }); }
    setLoading(false);
  }, [getSourceCredential, id, profile?.backendUrl]);

  useEffect(() => { void load(); }, [load]);

  const play = (t: PlaylistTrack) => {
    const all = tracks.map((item): Track => ({ id: `netease:${item.id}`, title: item.title, artist: item.artists.join(" / "), url: "", artwork: normalizeMediaUrl(item.coverUrl), duration: item.durationMs / 1000 }));
    const track = all.find((item) => item.id === `netease:${t.id}`);
    if (!track) return;
    setQueue(all, track.id);
    void playTrack(track);
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View className="flex-row items-center gap-4 px-5 pt-16">
          <Pressable onPress={() => router.back()}><Text style={{ color: tokens.accent, fontWeight: "800" }}>{`← ${t("back")}`}</Text></Pressable>
          {cover ? <Animated.View style={{ transform: [{ scale: coverScale }], opacity: coverOpacity }}><Image source={{ uri: cover }} style={{ width: 80, height: 80, borderRadius: 16 }} contentFit="cover" /></Animated.View> : null}
          <View className="flex-1"><Text style={{ color: tokens.text, fontSize: 22, fontWeight: "900" }} numberOfLines={2}>{name ?? t("playlistLabel")}</Text><Text style={{ color: tokens.mutedText, fontSize: 13, marginTop: 4 }}>{tracks.length} {t("queueTracks")}</Text></View>
        </View>
        {loading ? <ActivityIndicator className="mt-12" color={tokens.accent} /> : null}
        {error ? <Text className="mt-8 px-5" style={{ color: tokens.mutedText }}>{error}</Text> : null}
        {!loading && tracks.map((t, i) => (
          <Pressable key={t.id} className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: `${tokens.text}08` }} onPress={() => play(t)}>
            <Text style={{ color: tokens.mutedText, fontSize: 14, fontWeight: "700", width: 28 }}>{i + 1}</Text>
            {normalizeMediaUrl(t.coverUrl) ? <Image source={{ uri: normalizeMediaUrl(t.coverUrl) }} style={{ width: 48, height: 48, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: `${tokens.accent}18` }} />}
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} style={{ color: tokens.text, fontSize: 15, fontWeight: "700" }}>{t.title}</Text>
              <Text numberOfLines={1} style={{ color: tokens.mutedText, fontSize: 12, marginTop: 2 }}>{t.artists.join(" / ")}</Text>
            </View>
            <Text style={{ color: tokens.accent, fontSize: 18 }}>▶</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedScreen>
  );
}