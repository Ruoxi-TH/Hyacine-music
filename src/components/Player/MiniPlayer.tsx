import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useAudio } from "@/hooks/useAudio";
import { usePlayerStore } from "@/store/playerStore";
import { useI18n } from "@/i18n";
import { TrackCover } from "@/components/TrackCover";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { useTheme } from "@/theme";
export function MiniPlayer(): React.JSX.Element | null {
  const track = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const { togglePlayback } = useAudio();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  if (!track) return null;
  if (preferences.miniPlayerStyle === "capsule") return (
    <LiquidControlSurface className="absolute bottom-[94px] right-4 z-20 flex-row items-center rounded-full p-1.5" style={{ borderRadius: 999 }}>
      <Pressable className="flex-row items-center gap-2 pl-1" onPress={() => router.push(`/player/${track.id}`)}>
        <TrackCover uri={track.artwork} title={track.title} size={36} radius={18} />
        <Text numberOfLines={1} className="max-w-24 text-xs font-extrabold" style={{ color: tokens.text }}>{track.title}</Text>
      </Pressable>
      <Pressable accessibilityLabel={isPlaying ? t("pause") : t("play")} className="ml-2 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: tokens.accent }} onPress={() => void togglePlayback()}><Text style={{ color: tokens.isLight ? "#ffffff" : "#111111", fontWeight: "900" }}>{isPlaying ? "Ⅱ" : "▶"}</Text></Pressable>
    </LiquidControlSurface>
  );
  return <LiquidControlSurface className="absolute bottom-[100px] left-4 right-4 z-20 flex-row items-center rounded-[26px] px-3 py-2" style={{ borderRadius: 26 }}>
    <Pressable className="min-w-0 flex-1 flex-row items-center gap-3" onPress={() => router.push(`/player/${track.id}`)}><TrackCover uri={track.artwork} title={track.title} size={44} radius={14} /><View className="min-w-0 flex-1"><Text className="truncate text-sm font-semibold" style={{ color: tokens.text }}>{track.title}</Text><Text className="truncate text-xs" style={{ color: tokens.mutedText }}>{t("miniPlayer")} · {track.artist}</Text></View></Pressable>
    <Pressable accessibilityLabel={isPlaying ? t("pause") : t("play")} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.text}18` }} onPress={() => void togglePlayback()}><Text style={{ color: tokens.text, fontSize: 16, fontWeight: "800" }}>{isPlaying ? "Ⅱ" : "▶"}</Text></Pressable>
  </LiquidControlSurface>;
}
