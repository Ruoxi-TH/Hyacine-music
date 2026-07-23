import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { TrackCover } from "@/components/TrackCover";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useAudio } from "@/hooks/useAudio";
import { useI18n } from "@/i18n";
import { loadListeningHistory } from "@/services/listeningHistory";
import { useTheme } from "@/theme";
import { apiBase } from "@/utils/apiBase";
import type { Track } from "@/types/music";
import { usePlayerStore } from "@/store/playerStore";
import { globalScrollY, handleScrollForFade, handleScrollEndForFade, resetScrollY } from "@/utils/scrollY";

export default function ProfileScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { profile, getSourceCredential, updateProfile } = useAccount();
  const { tokens } = useTheme();
  const { playTrack } = useAudio();
  const setQueue = usePlayerStore((state) => state.setQueue);
  const [history, setHistory] = useState<Track[]>([]);

  const refreshHistory = useCallback(async (): Promise<void> => {
    setHistory(await loadListeningHistory());
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    if (!profile?.backendUrl || !profile.musicSources.includes("netease")) return;
    void (async () => {
      try {
        const cookie = await getSourceCredential("netease");
        if (!cookie) return;
        const response = await fetch(`${apiBase(profile.backendUrl)}/music-sources/netease/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie }),
        });
        if (!response.ok) return;
        const remote = await response.json() as { nickname?: string; avatarUrl?: string };
        await updateProfile({
          displayName: remote.nickname?.trim() || profile.displayName,
          avatarUrl: remote.avatarUrl?.trim() || profile.avatarUrl,
        });
      } catch {
        // Keep local avatar if remote profile is unavailable.
      }
    })();
  }, [getSourceCredential, profile?.avatarUrl, profile?.backendUrl, profile?.displayName, profile?.musicSources, updateProfile]);

  useEffect(() => { resetScrollY(); }, []);

  const sourceName = profile?.musicSources.includes("netease") ? t("neteaseBound") : profile?.musicSources.includes("bilibili") ? t("bilibiliBound") : t("noMusicServiceBound");

  return (
    <ThemedScreen>
      <Animated.ScrollView contentContainerClassName="px-5 pb-40 pt-14" onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false, listener: (e: { nativeEvent: { contentOffset: { x: number; y: number } } }) => handleScrollForFade(e.nativeEvent) })} scrollEventThrottle={16} onScrollEndDrag={handleScrollEndForFade} onMomentumScrollEnd={handleScrollEndForFade}>
        <View className="flex-row items-center justify-between">
          <Text style={{ color: tokens.text, fontSize: 28, fontWeight: "800" }}>{t("profileTitle")}</Text>
          <Pressable className="h-12 w-12 items-center justify-center rounded-full" style={{ borderWidth: 1, borderColor: tokens.surfaceBorder }} onPress={() => router.push("/settings")}>
            <Text style={{ color: tokens.text, fontSize: 19 }}>⚙</Text>
          </Pressable>
        </View>

        <View className="mt-8 overflow-hidden border" style={{ backgroundColor: "transparent", borderColor: tokens.surfaceBorder, borderRadius: 28 }}>
          <Pressable className="flex-row items-center p-5" style={{ backgroundColor: "transparent" }} onPress={() => router.push("/settings")}>
            <View className="h-20 w-20 overflow-hidden rounded-full" style={{ backgroundColor: `${tokens.accent}24`, borderWidth: 2, borderColor: `${tokens.accent}88` }}>
              {profile?.avatarUrl ? <Image className="h-full w-full" source={{ uri: profile.avatarUrl }} contentFit="cover" /> : <Text className="pt-5 text-center" style={{ color: tokens.accent, fontSize: 24, fontWeight: "900" }}>{profile?.displayName?.slice(0, 1).toUpperCase() || "H"}</Text>}
            </View>
            <View className="ml-4 min-w-0 flex-1">
              <Text numberOfLines={1} style={{ color: tokens.text, fontSize: 22, fontWeight: "800" }}>{profile?.displayName || t("notSignedIn")}</Text>
              <Text className="mt-2 text-sm" numberOfLines={1} style={{ color: tokens.mutedText }}>{sourceName}</Text>
            </View>
            <Text style={{ color: tokens.mutedText, fontSize: 26 }}>›</Text>
          </Pressable>
        </View>

        <View className="mt-10 flex-row items-center justify-between">
          <Text style={{ color: tokens.text, fontSize: 21, fontWeight: "800" }}>{t("listeningRecord")}</Text>
          <Pressable onPress={() => void refreshHistory()}><Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "800" }}>{t("refresh")}</Text></Pressable>
        </View>
        <View className="mt-4 gap-3">
          {history.map((track) => (
            <View key={track.id} className="overflow-hidden border" style={{ backgroundColor: "transparent", borderColor: tokens.surfaceBorder, borderRadius: 20 }}>
              <Pressable className="flex-row items-center p-3" style={{ backgroundColor: "transparent" }} onPress={() => { setQueue(history, track.id); void playTrack(track); }}>
                <TrackCover uri={track.artwork} title={track.title} size={56} radius={16} />
                <View className="ml-3 min-w-0 flex-1">
                  <Text numberOfLines={1} style={{ color: tokens.text, fontWeight: "800" }}>{track.title}</Text>
                  <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: tokens.mutedText }}>{track.artist}</Text>
                </View>
                <Text style={{ color: tokens.accent, fontSize: 18 }}>▶</Text>
              </Pressable>
            </View>
          ))}
          {!history.length ? <View className="items-center border py-10" style={{ backgroundColor: "transparent", borderColor: tokens.surfaceBorder, borderRadius: 24 }}><Text style={{ color: tokens.mutedText, fontSize: 14 }}>{t("noHistoryHint")}</Text></View> : null}
        </View>
      </Animated.ScrollView>
    </ThemedScreen>
  );
}