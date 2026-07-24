import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAudio } from "@/hooks/useAudio";
import { usePlayerStore } from "@/store/playerStore";
import { useI18n } from "@/i18n";
import { TrackCover } from "@/components/TrackCover";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { useTheme } from "@/theme";
import { fadeAnim } from "@/utils/scrollY";
import { appLog } from "@/utils/logger";
import { useEffect } from "react";

export function MiniPlayer(): React.JSX.Element | null {
  const track = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const { togglePlayback, skipTrack } = useAudio();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const { bottom: safeBottom } = useSafeAreaInsets();

  useEffect(() => {
    appLog.info("miniplayer", "render", { hasTrack: Boolean(track), trackId: track?.id ?? null, title: track?.title ?? null });
  }, [track]);

  if (!track) return null;
  const canSkip = queue.length > 1;

  const bottomOffset = preferences.uiStyle === "miuix" ? 146
    : preferences.uiStyle === "liquid" ? 100
    : 74 + safeBottom;

  const fadeOpacity = fadeAnim;
  const fadeTranslate = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0], extrapolate: "clamp" });

  const overlayStyle = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, opacity: fadeOpacity, transform: [{ translateY: fadeTranslate }], pointerEvents: "box-none" as const };

  if (preferences.miniPlayerStyle === "capsule") return (
    <Animated.View pointerEvents="box-none" style={overlayStyle}>
    <LiquidControlSurface className="absolute right-4 z-20 flex-row items-center rounded-full p-1.5" style={{ bottom: bottomOffset, borderRadius: 999 }}>
      <Pressable className="flex-row items-center gap-2 pl-1" onPress={() => router.push(`/player/${track.id}`)}>
        <TrackCover uri={track.artwork} title={track.title} size={36} radius={18} />
        <Text numberOfLines={1} className="max-w-24 text-xs font-extrabold" style={{ color: tokens.text }}>{track.title}</Text>
      </Pressable>
      <Pressable accessibilityLabel={isPlaying ? t("pause") : t("play")} className="ml-1 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: tokens.accent }} onPress={() => void togglePlayback()}><Text style={{ color: tokens.isLight ? "#ffffff" : "#111111", fontWeight: "900" }}>{isPlaying ? "Ⅱ" : "▶"}</Text></Pressable>
      <Pressable accessibilityLabel={t("nextTrack")} disabled={!canSkip} className="ml-1 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.text}18`, opacity: canSkip ? 1 : 0.35 }} onPress={() => void skipTrack(1)}><Text style={{ color: tokens.text, fontSize: 14, fontWeight: "900" }}>▶|</Text></Pressable>
    </LiquidControlSurface>
    </Animated.View>
  );

  return (
    <Animated.View pointerEvents="box-none" style={overlayStyle}>
    <LiquidControlSurface className="absolute left-4 right-4 z-20 flex-row items-center rounded-[26px] px-3 py-2" style={{ bottom: bottomOffset, borderRadius: 26 }}>
      <Pressable className="min-w-0 flex-1 flex-row items-center gap-3" onPress={() => router.push(`/player/${track.id}`)}>
        <TrackCover uri={track.artwork} title={track.title} size={44} radius={14} />
        <View className="min-w-0 flex-1">
          <Text className="truncate text-sm font-semibold" style={{ color: tokens.text }}>{track.title}</Text>
          <Text className="truncate text-xs" style={{ color: tokens.mutedText }}>{t("miniPlayer")} · {track.artist}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityLabel={t("previousTrack")} disabled={!canSkip} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.text}18`, opacity: canSkip ? 1 : 0.35 }} onPress={() => void skipTrack(-1)}><Text style={{ color: tokens.text, fontSize: 13, fontWeight: "900" }}>|◀</Text></Pressable>
      <Pressable accessibilityLabel={isPlaying ? t("pause") : t("play")} className="ml-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.text}18` }} onPress={() => void togglePlayback()}><Text style={{ color: tokens.text, fontSize: 16, fontWeight: "800" }}>{isPlaying ? "Ⅱ" : "▶"}</Text></Pressable>
      <Pressable accessibilityLabel={t("nextTrack")} disabled={!canSkip} className="ml-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.text}18`, opacity: canSkip ? 1 : 0.35 }} onPress={() => void skipTrack(1)}><Text style={{ color: tokens.text, fontSize: 13, fontWeight: "900" }}>▶|</Text></Pressable>
    </LiquidControlSurface>
    </Animated.View>
  );
}
