import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useTheme } from "@/theme";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { apiBase } from "@/utils/apiBase";

interface Playlist { id: number; name: string; coverUrl: string; playCount: number; trackCount: number; description: string; }

function formatPlayCount(value: number, language: string): string {
  return new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function LibraryScreen(): React.JSX.Element {
  const { profile, getSourceCredential, updateProfile } = useAccount();
  const { language, t } = useI18n();
  const { tokens } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const loadPlaylists = useCallback(async (refresh = false): Promise<void> => {
    if (!profile || profile.musicSource !== "netease") {
      setPlaylists([]);
      setError("当前音乐源不支持我的歌单。请绑定网易云音乐后查看。");
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      if (!(await supportsNeteaseCapability(profile.backendUrl, "playlists"))) {
        setPlaylists([]);
        setError("当前服务器尚未提供网易云歌单管理。");
        return;
      }
      const cookie = await getSourceCredential("netease");
      if (!cookie) throw new Error("网易云登录已失效，请重新扫码绑定");

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
        throw new Error((data as { message?: string }).message || `加载失败 HTTP ${response.status}`);
      }
      setPlaylists(data);
      if (!data.length) setError("暂无可展示的歌单。");
    } catch (cause) {
      setPlaylists([]);
      setError(cause instanceof Error ? cause.message : "无法加载我的歌单，请检查网易云登录状态和服务器连接。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getSourceCredential, profile, t]);

  useEffect(() => { void loadPlaylists(); }, [loadPlaylists]);
  const createPlaylist = async (): Promise<void> => {
    const name = playlistName.trim();
    if (!name || !profile || profile.musicSource !== "netease" || creating) return;
    setCreating(true);
    setError("");
    try {
      if (!(await supportsNeteaseCapability(profile.backendUrl, "createPlaylist"))) {
        setError("当前服务器尚未提供网易云歌单创建。");
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
      setError("创建歌单失败，请检查网易云登录状态后重试。");
    } finally {
      setCreating(false);
    }
  };

  return <ThemedScreen><ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-16" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPlaylists(true)} tintColor={tokens.accent} />}>
    <View className="flex-row items-start justify-between"><View><Text style={{ color: tokens.text, fontSize: 31, fontWeight: "800" }}>{t("library")}</Text><Text className="mt-2 text-sm" style={{ color: tokens.mutedText }}>{"已绑定网易云音乐的我的歌单"}</Text></View><LiquidControlSurface className="h-11 w-11 items-center justify-center rounded-full"><Pressable className="h-full w-full items-center justify-center" onPress={() => void loadPlaylists(true)}><Text style={{ color: tokens.text, fontSize: 18 }}>↻</Text></Pressable></LiquidControlSurface></View>
    <View className="mt-10 flex-row items-center justify-between"><Text style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>{t("myPlaylists")}</Text><Pressable onPress={() => setShowCreate((value) => !value)}><Text className="text-xs font-semibold" style={{ color: tokens.accent }}>{showCreate ? "收起" : "新建歌单"}</Text></Pressable></View>
    {showCreate ? <View className="mt-4 flex-row items-center gap-3"><TextInput value={playlistName} onChangeText={setPlaylistName} placeholder="歌单名称" placeholderTextColor={tokens.mutedText} className="h-11 flex-1 px-4" style={{ color: tokens.text, borderWidth: 1, borderColor: tokens.surfaceBorder, borderRadius: 8, backgroundColor: "transparent" }} maxLength={100} /><LiquidControlSurface className="h-11 px-4" style={{ borderRadius: 8 }}><Pressable className="h-full items-center justify-center" disabled={creating || !playlistName.trim()} onPress={() => void createPlaylist()}><Text style={{ color: tokens.text, fontWeight: "800" }}>{creating ? "创建中" : "创建"}</Text></Pressable></LiquidControlSurface></View> : null}
    {loading ? <View className="h-72 items-center justify-center"><ActivityIndicator color={tokens.accent} /><Text className="mt-4 text-sm" style={{ color: tokens.mutedText }}>{"正在加载我的歌单..."}</Text></View> : null}
    {!loading && error ? <View className="h-72 items-center justify-center px-8"><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.accent}1c` }}><Text style={{ color: tokens.accent, fontSize: 28 }}>♫</Text></View><Text className="mt-5 text-center text-sm leading-6" style={{ color: tokens.mutedText }}>{error}</Text><LiquidControlSurface className="mt-6 h-11 rounded-full px-5" style={{ borderRadius: 22 }}><Pressable className="h-full items-center justify-center" onPress={() => void loadPlaylists(true)}><Text style={{ color: tokens.text, fontWeight: "800" }}>{t("refresh")}</Text></Pressable></LiquidControlSurface></View> : null}
    {!loading && playlists.length ? <View className="mt-5 flex-row flex-wrap justify-between">{playlists.map((playlist) => <Pressable key={playlist.id} className="mb-7 w-[48%]" onPress={() => undefined}><View className="aspect-square overflow-hidden rounded-2xl" style={{ backgroundColor: tokens.surface }}><Image className="h-full w-full" source={{ uri: playlist.coverUrl }} contentFit="cover" /><View className="absolute bottom-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: "#00000080" }}><Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>▶ {formatPlayCount(playlist.playCount, language)}</Text></View></View><Text className="mt-3 text-sm font-bold" numberOfLines={2} style={{ color: tokens.text }}>{playlist.name}</Text><Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>{playlist.description || `${playlist.trackCount} ${t("playlistTracks")}`}</Text></Pressable>)}</View> : null}
  </ScrollView></ThemedScreen>;
}