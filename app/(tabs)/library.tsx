import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { normalizeMediaUrl } from "@/utils/media";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useTheme } from "@/theme";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { apiBase } from "@/utils/apiBase";
import { globalScrollY, handleScrollForFade, handleScrollEndForFade, resetScrollY } from "@/utils/scrollY";
const DEFAULT_PLAYLIST_COVER = require("../../assets/playlist-default.jpg");

interface Playlist { id: number; name: string; coverUrl: string; playCount: number; trackCount: number; description: string; }

function formatPlayCount(value: number, language: string): string {
  return new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function LibraryScreen(): React.JSX.Element {
  const { profile, getSourceCredential, updateProfile } = useAccount();
  const { language, t } = useI18n();
  const { tokens } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recommendations, setRecommendations] = useState<Playlist[]>([]);
  const [loadingMoreRecommendations, setLoadingMoreRecommendations] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "recommended">("mine");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const loadPlaylists = useCallback(async (refresh = false): Promise<void> => {
    if (!profile || !profile.musicSources.includes("netease")) {
      setPlaylists([]);
      setError(t("myPlaylistsUnavailable"));
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      if (!(await supportsNeteaseCapability(profile.backendUrl, "playlists"))) {
        setPlaylists([]);
        setError(t("playlistsUnavailable"));
        return;
      }
      const cookie = await getSourceCredential("netease");
      if (!cookie) throw new Error(t("neteaseLoginExpired"));

      // Keep local avatar/name in sync with the currently bound Netease account.
      try {
        const profileResponse = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie }),
        });
        if (profileResponse.ok) {
          const remote = await profileResponse.json() as { nickname?: string; avatarUrl?: string };
          await updateProfile({
            displayName: remote.nickname?.trim() || profile.displayName,
            avatarUrl: remote.avatarUrl?.trim() || profile.avatarUrl,
          });
        }
      } catch {
        // Profile sync is best-effort and must not block playlist loading.
      }

      const response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const data = await response.json() as Playlist[] | { message?: string };
      if (!response.ok || !Array.isArray(data)) {
        throw new Error((data as { message?: string }).message || `${t("loadFailedHttp")} ${response.status}`);
      }
      setPlaylists(data);
      const recommendationsResponse = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie, limit: 10, offset: 0 }),
      });
      const recommended = await recommendationsResponse.json() as Playlist[] | { message?: string };
      const firstPage = recommendationsResponse.ok && Array.isArray(recommended) ? recommended : [];
      setRecommendations(firstPage);
      setHasMoreRecommendations(firstPage.length === 10);
      if (!data.length) setError(t("noPlaylists"));
    } catch (cause) {
      setPlaylists([]);
      setError(cause instanceof Error ? cause.message : t("playlistsLoadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getSourceCredential, profile, t]);

  useEffect(() => { void loadPlaylists(); }, [loadPlaylists]);
  useEffect(() => { resetScrollY(); }, []);
  const loadMoreRecommendations = async (): Promise<void> => {
    if (!profile || activeTab !== "recommended" || loadingMoreRecommendations || !hasMoreRecommendations) return;
    setLoadingMoreRecommendations(true);
    try {
      const cookie = await getSourceCredential("netease");
      const response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cookie, limit: 10, offset: recommendations.length }) });
      const next = await response.json() as Playlist[];
      if (!response.ok || !Array.isArray(next)) throw new Error(t("loadMoreFailed"));
      setRecommendations((current) => [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setHasMoreRecommendations(next.length === 10);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("loadMoreFailed")); }
    finally { setLoadingMoreRecommendations(false); }
  };
  const createPlaylist = async (): Promise<void> => {
    const name = playlistName.trim();
    if (!name || !profile || !profile.musicSources.includes("netease") || creating) return;
    setCreating(true);
    setError("");
    try {
      if (!(await supportsNeteaseCapability(profile.backendUrl, "createPlaylist"))) {
        setError(t("createPlaylistUnavailable"));
        return;
      }
      const cookie = await getSourceCredential("netease");
      if (!cookie) throw new Error("missing credential");
      const response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/playlists/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cookie }),
      });
      if (!response.ok) throw new Error("request failed");
      setPlaylistName("");
      setShowCreate(false);
      await loadPlaylists(true);
    } catch {
      setError(t("createPlaylistFailed"));
    } finally {
      setCreating(false);
    }
  };

  const deletePlaylist = (playlist: Playlist): void => {
    if (!profile || playlist.id <= 0) return;
    Alert.alert(t("deletePlaylistTitle"), t("deletePlaylistBody"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => void (async () => {
        try {
          const cookie = await getSourceCredential("netease");
          const response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/playlists/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: playlist.id, cookie }) });
          const result = await response.json().catch(() => ({})) as { message?: string };
          if (!response.ok) throw new Error(result.message || `${t("deleteFailed")} HTTP ${response.status}`);
          setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
        } catch (cause) { setError(cause instanceof Error ? cause.message : t("deletePlaylistFailed")); }
      })() },
    ]);
  };
  const visiblePlaylists = activeTab === "mine" ? playlists : recommendations;
  return <ThemedScreen><Animated.ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-16" onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false, listener: ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number; y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => { handleScrollForFade(nativeEvent); const { contentOffset, contentSize, layoutMeasurement } = nativeEvent; if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) void loadMoreRecommendations(); } })} scrollEventThrottle={200} onScrollEndDrag={handleScrollEndForFade} onMomentumScrollEnd={handleScrollEndForFade} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPlaylists(true)} tintColor={tokens.accent} />}>
    <View className="flex-row items-start justify-between"><View><Text style={{ color: tokens.text, fontSize: 31, fontWeight: "800" }}>{t("library")}</Text><Text className="mt-2 text-sm" style={{ color: tokens.mutedText }}>{t("librarySubtitle")}</Text></View><LiquidControlSurface className="h-11 w-11 items-center justify-center rounded-full"><Pressable className="h-full w-full items-center justify-center" onPress={() => void loadPlaylists(true)}><Text style={{ color: tokens.text, fontSize: 18 }}>↻</Text></Pressable></LiquidControlSurface></View>
    <LiquidControlSurface className="mt-10 flex-row overflow-hidden rounded-full p-1" style={{ borderRadius: 999 }}><Pressable className="h-11 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: activeTab === "mine" ? `${tokens.accent}30` : "transparent" }} onPress={() => setActiveTab("mine")}><Text style={{ color: activeTab === "mine" ? tokens.text : tokens.mutedText, fontWeight: "800" }}>{t("myPlaylists")}</Text></Pressable><Pressable className="h-11 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: activeTab === "recommended" ? `${tokens.accent}30` : "transparent" }} onPress={() => setActiveTab("recommended")}><Text style={{ color: activeTab === "recommended" ? tokens.text : tokens.mutedText, fontWeight: "800" }}>{t("recommendedPlaylists")}</Text></Pressable></LiquidControlSurface>
    {activeTab === "mine" ? <View className="mt-7 flex-row items-center justify-between"><Text style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>{t("myPlaylists")}</Text><Pressable onPress={() => setShowCreate((value) => !value)}><Text className="text-xs font-semibold" style={{ color: tokens.accent }}>{showCreate ? t("collapse") : t("newPlaylist")}</Text></Pressable></View> : <Text className="mt-7" style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>{t("featured")}</Text>}
    {activeTab === "mine" && showCreate ? <View className="mt-4 flex-row items-center gap-3"><TextInput value={playlistName} onChangeText={setPlaylistName} placeholder={t("playlistNamePlaceholder")} placeholderTextColor={tokens.mutedText} className="h-11 flex-1 px-4" style={{ color: tokens.text, borderWidth: 1, borderColor: tokens.surfaceBorder, borderRadius: 8 }} maxLength={100} /><LiquidControlSurface className="h-11 px-4" style={{ borderRadius: 8 }}><Pressable className="h-full items-center justify-center" disabled={creating || !playlistName.trim()} onPress={() => void createPlaylist()}><Text style={{ color: tokens.text, fontWeight: "800" }}>{creating ? t("creating") : t("create")}</Text></Pressable></LiquidControlSurface></View> : null}
    {loading ? <View className="h-72 items-center justify-center"><ActivityIndicator color={tokens.accent} /></View> : null}
    {!loading && error ? <Text className="mt-8 text-center" style={{ color: tokens.mutedText }}>{error}</Text> : null}
    {!loading && visiblePlaylists.length ? <View className="mt-5 flex-row flex-wrap justify-between">{visiblePlaylists.map((playlist) => <Pressable key={playlist.id} className="mb-7 w-[48%]" onLongPress={activeTab === "mine" ? () => deletePlaylist(playlist) : undefined} delayLongPress={500} onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: String(playlist.id), name: playlist.name, cover: playlist.coverUrl } })}><View className="aspect-square overflow-hidden rounded-2xl" style={{ backgroundColor: tokens.surface }}><Image className="h-full w-full" source={normalizeMediaUrl(playlist.coverUrl) ? { uri: normalizeMediaUrl(playlist.coverUrl) } : DEFAULT_PLAYLIST_COVER} contentFit="cover" /><View className="absolute bottom-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: "#00000080" }}><Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>▶ {formatPlayCount(playlist.playCount, language)}</Text></View></View><Text className="mt-3 text-sm font-bold" numberOfLines={2} style={{ color: tokens.text }}>{playlist.name}</Text><Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>{playlist.description || `${playlist.trackCount} ${t("playlistTracks")}`}</Text></Pressable>)}</View> : null}
  </Animated.ScrollView></ThemedScreen>;
}