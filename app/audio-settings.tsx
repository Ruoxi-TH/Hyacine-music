import { Pressable, ScrollView, Text, View } from "react-native";
import CommunitySlider from "@react-native-community/slider";
import { router } from "expo-router";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { audioQualities, equalizerBands, soundPresets, type AudioQuality, type SoundPreset, useAudioPreferences } from "@/audioPreferences";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";

function Choice<T extends string>({ values, value, labels, onChange }: { values: readonly T[]; value: T; labels: Record<T, string>; onChange: (value: T) => void }): React.JSX.Element {
  const { tokens } = useTheme();
  return <View className="mt-3 flex-row flex-wrap gap-2">{values.map((item) => <Pressable key={item} className="rounded-full px-4 py-3" style={{ backgroundColor: item === value ? `${tokens.accent}24` : tokens.surface, borderWidth: 1, borderColor: item === value ? tokens.accent : tokens.surfaceBorder }} onPress={() => onChange(item)}><Text style={{ color: item === value ? tokens.accent : tokens.text, fontWeight: "800" }}>{labels[item]}</Text></Pressable>)}</View>;
}
export default function AudioSettingsScreen(): React.JSX.Element {
  const { tokens } = useTheme();
  const { t } = useI18n();
  const qualityLabels: Record<AudioQuality, string> = { standard: t("qualityStandard"), higher: t("qualityHigher"), exhigh: t("qualityExhigh"), lossless: t("qualityLossless"), hires: t("qualityHires") };
  const presetLabels: Record<SoundPreset, string> = { flat: t("presetFlat"), bass: t("presetBass"), vocal: t("presetVocal"), bright: t("presetBright"), custom: t("presetCustom") };
  const { quality, preset, equalizer, setQuality, setPreset, setBand, resetEqualizer } = useAudioPreferences();
  return <ThemedScreen><ScrollView contentContainerClassName="px-5 pb-16 pt-14">
    <View className="flex-row items-center justify-between"><Pressable className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }} onPress={() => router.back()}><Text style={{ color: tokens.text, fontSize: 30 }}>‹</Text></Pressable><Text style={{ color: tokens.text, fontSize: 22, fontWeight: "900" }}>{t("audioQualityAndEffects")}</Text><View className="w-11" /></View>
    <Text className="mt-9 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>{t("audioQuality")}</Text>
    <LiquidControlSurface className="mt-3 p-5" style={{ borderRadius: 26 }}><Text style={{ color: tokens.text, fontSize: 17, fontWeight: "900" }}>{t("onlinePlaybackQuality")}</Text><Text className="mt-1 text-xs leading-5" style={{ color: tokens.mutedText }}>{t("onlinePlaybackQualityHint")}</Text><Choice values={audioQualities} value={quality} labels={qualityLabels} onChange={(value) => void setQuality(value)} /></LiquidControlSurface>
    <Text className="mt-9 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>{t("effectsSection")}</Text>
    <LiquidControlSurface className="mt-3 p-5" style={{ borderRadius: 26 }}><Text style={{ color: tokens.text, fontSize: 17, fontWeight: "900" }}>{t("soundPreset")}</Text><Choice values={soundPresets} value={preset} labels={presetLabels} onChange={(value) => void setPreset(value)} /><Text className="mt-4 text-xs leading-5" style={{ color: tokens.mutedText }}>{t("soundPresetHint")}</Text></LiquidControlSurface>
    <View className="mt-9 flex-row items-center justify-between"><Text className="text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>{t("customEqualizer")}</Text><Pressable onPress={() => void resetEqualizer()}><Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("reset")}</Text></Pressable></View>
    <LiquidControlSurface className="mt-3 p-5" style={{ borderRadius: 26 }}>{equalizerBands.map((frequency, index) => <View key={frequency} className="mb-4"><View className="flex-row justify-between"><Text style={{ color: tokens.text, fontWeight: "800" }}>{frequency >= 1000 ? `${frequency / 1000}k` : frequency} Hz</Text><Text style={{ color: tokens.accent, fontWeight: "800" }}>{equalizer[index] > 0 ? "+" : ""}{equalizer[index].toFixed(1)} dB</Text></View><CommunitySlider style={{ width: "100%", height: 36 }} minimumValue={-12} maximumValue={12} step={0.5} value={equalizer[index]} minimumTrackTintColor={tokens.accent} maximumTrackTintColor={tokens.surfaceBorder} onSlidingComplete={(gain) => void setBand(index, gain)} /></View>)}</LiquidControlSurface>
  </ScrollView></ThemedScreen>;
}