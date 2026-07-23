import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAccount } from "@/account";
import { TrackCover } from "@/components/TrackCover";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useAudio } from "@/hooks/useAudio";
import { useI18n } from "@/i18n";
import { resolvePlayableTrack, searchTracks } from "@/services/musicApi";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { useTheme } from "@/theme";
import type { Track } from "@/types/music";
import { usePlayerStore } from "@/store/playerStore";
import { globalScrollY, handleScrollForFade, handleScrollEndForFade, resetScrollY } from "@/utils/scrollY";

export default function SearchScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { tokens } = useTheme();
  const { profile, getSourceCredential } = useAccount();
  const { playTrack } = useAudio();
  const setQueue = usePlayerStore((state) => state.setQueue);
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"netease" | "bilibili">("netease");
  useEffect(() => {
    if (profile?.musicSources?.length) setSource(profile.musicSources[0]);
  }, [profile?.musicSources]);
  useEffect(() => { resetScrollY(); }, []);

  const onSearch = useCallback(async (): Promise<void> => {
    if (!profile?.backendUrl) {
      setError(t("connectSourceFirst"));
      return;
    }
    const q = keywords.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      if (source === "netease" && !(await supportsNeteaseCapability(profile.backendUrl, "search"))) {
        setResults([]);
        setError(t("neteaseSearchUnavailable"));
        return;
      }
      const cookie = await getSourceCredential(source);
      const rows = await searchTracks({
        backendUrl: profile.backendUrl,
        source,
        keywords: q,
        cookie,
      });
      setResults(rows);
      if (!rows.length) setError(t("noSearchResults"));
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : t("searchFailed"));
    } finally {
      setLoading(false);
    }
  }, [getSourceCredential, keywords, profile?.backendUrl, source]);

  const onPlay = useCallback(
    async (track: Track): Promise<void> => {
      if (!profile?.backendUrl) return;
      setPlayingId(track.id);
      setError("");
      setQueue(results, track.id);
      try {
        const cookie = await getSourceCredential(source);
        const playable = await resolvePlayableTrack({
          backendUrl: profile.backendUrl,
          track,
          cookie,
        });
        await playTrack(playable);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("playbackFailed"));
      } finally {
        setPlayingId("");
      }
    },
    [getSourceCredential, playTrack, profile?.backendUrl, source],
  );

  return (
    <ThemedScreen>
      <View className="flex-1 px-5 pb-36 pt-16">
        <Text style={{ color: tokens.text, fontSize: 31, fontWeight: "800" }}>{t("search")}</Text>
        <Text className="mt-2 text-sm" style={{ color: tokens.mutedText }}>
          {source === "bilibili" ? t("biliSearchHint") : t("neteaseSearchHint")}
        </Text>
        <LiquidControlSurface className="mt-5 flex-row rounded-full p-1" style={{ borderRadius: 24 }}>
          {(["netease", "bilibili"] as const).map((item) => (
            <Pressable
              key={item}
              className="h-10 flex-1 items-center justify-center rounded-full"
              style={{ backgroundColor: source === item ? `${tokens.text}18` : "transparent" }}
              onPress={() => { setSource(item); setResults([]); setError(""); }}
            >
              <Text style={{ color: source === item ? tokens.text : tokens.mutedText, fontSize: 13, fontWeight: "800" }}>
                {item === "netease" ? t("neteaseCloud") : t("bilibili")}
              </Text>
            </Pressable>
          ))}
        </LiquidControlSurface>
        <LiquidControlSurface className="mt-5 h-14 flex-row items-center rounded-full px-5" style={{ borderRadius: 28 }}>
          <Text className="mr-3 text-xl" style={{ color: tokens.mutedText }}>
            ⌕
          </Text>
          <TextInput
            className="h-full flex-1 text-base"
            style={{ color: tokens.text }}
            value={keywords}
            onChangeText={setKeywords}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={tokens.mutedText}
            returnKeyType="search"
            onSubmitEditing={() => void onSearch()}
          />
          <Pressable onPress={() => void onSearch()} disabled={loading}>
            <Text style={{ color: tokens.accent, fontWeight: "800" }}>{loading ? "..." : t("search")}</Text>
          </Pressable>
        </LiquidControlSurface>

        {error ? (
          <Text className="mt-4 text-sm" style={{ color: "#ef4444" }}>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View className="mt-16 items-center">
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : (
          <FlatList
            className="mt-6"
            data={results}
            keyExtractor={(item) => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false, listener: (e: { nativeEvent: { contentOffset: { x: number; y: number } } }) => handleScrollForFade(e.nativeEvent) })}
            scrollEventThrottle={16}
            onScrollEndDrag={handleScrollEndForFade}
            onMomentumScrollEnd={handleScrollEndForFade}
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListEmptyComponent={
              <Text className="mt-10 text-sm leading-6" style={{ color: tokens.mutedText }}>{t("searchEmptyHint")}</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                className="flex-row items-center rounded-3xl border px-3 py-3"
                style={{ borderColor: tokens.surfaceBorder, backgroundColor: tokens.surface }}
                onPress={() => void onPlay(item)}
              >
                <TrackCover uri={item.artwork} title={item.title} size={56} radius={16} />
                <View className="ml-3 min-w-0 flex-1">
                  <Text numberOfLines={1} style={{ color: tokens.text, fontWeight: "800" }}>
                    {item.title}
                  </Text>
                  <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>
                    {item.artist}
                  </Text>
                </View>
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 18 }}>
                  {playingId === item.id ? "…" : "▶"}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </ThemedScreen>
  );
}