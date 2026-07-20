import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAudio } from "@/hooks/useAudio";
import { usePlayerStore } from "@/store/playerStore";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useTheme } from "@/theme";
import { useAccount } from "@/account";
import { loadLyrics, type LyricLine } from "@/services/lyrics";

function time(value: number): string { return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`; }
function Controls({ playing, toggle, seek }: { playing: boolean; toggle: () => void; seek: (seconds: number) => void }): React.JSX.Element {
  const { tokens } = useTheme();
  return <View className="mt-8 flex-row items-center justify-center gap-8"><Pressable className="h-12 w-12 items-center justify-center" onPress={() => seek(-15)}><Text style={{ color: tokens.text, fontWeight: "800" }}>−15</Text></Pressable><Pressable className="h-[72px] w-[72px] items-center justify-center rounded-full" style={{ backgroundColor: tokens.accent }} onPress={toggle}><Text style={{ color: "#111", fontSize: 24, fontWeight: "900" }}>{playing ? "Ⅱ" : "▶"}</Text></Pressable><Pressable className="h-12 w-12 items-center justify-center" onPress={() => seek(15)}><Text style={{ color: tokens.text, fontWeight: "800" }}>+15</Text></Pressable></View>;
}
function Lyrics({ lines, progress }: { lines: LyricLine[]; progress: number }): React.JSX.Element {
  const { tokens } = useTheme(); const scroll = useRef<ScrollView>(null);
  const active = Math.max(0, lines.reduce((last, line, index) => line.time <= progress ? index : last, 0));
  useEffect(() => { scroll.current?.scrollTo({ y: Math.max(0, active - 2) * 72, animated: true }); }, [active]);
  if (!lines.length) return <View className="flex-1 items-center justify-center"><Text style={{ color: tokens.mutedText }}>暂时没有可用歌词</Text></View>;
  return <ScrollView ref={scroll} className="flex-1" contentContainerStyle={{ paddingVertical: 70 }} showsVerticalScrollIndicator={false}>{lines.map((line, index) => <View key={`${line.time}-${index}`} className="min-h-[72px] justify-center"><Text style={{ color: index === active ? tokens.text : `${tokens.mutedText}99`, fontSize: index === active ? 24 : 18, fontWeight: index === active ? "900" : "600", lineHeight: 32 }}>{line.text}</Text>{line.translation ? <Text className="mt-1 text-sm" style={{ color: index === active ? tokens.accent : `${tokens.mutedText}88` }}>{line.translation}</Text> : null}</View>)}</ScrollView>;
}
export default function FullPlayerScreen(): React.JSX.Element {
  const track = usePlayerStore((state) => state.currentTrack); const playing = usePlayerStore((state) => state.isPlaying); const progress = usePlayerStore((state) => state.progress); const duration = usePlayerStore((state) => state.duration);
  const { seekBy, togglePlayback } = useAudio(); const { preferences, tokens } = useTheme(); const { profile, getSourceCredential } = useAccount(); const [lyrics, setLyrics] = useState<LyricLine[]>([]); const entrance = useRef(new Animated.Value(36)).current;
  useEffect(() => { if (!track || !profile?.backendUrl) { setLyrics([]); return; } void getSourceCredential("netease").then((cookie) => loadLyrics(profile.backendUrl, track.id, cookie)).then(setLyrics).catch(() => setLyrics([])); }, [getSourceCredential, profile?.backendUrl, track?.id]);
  useEffect(() => { entrance.setValue(36); Animated.timing(entrance, { toValue: 0, duration: 480, useNativeDriver: true }).start(); }, [entrance, track?.id]);
  if (!track) return <ThemedScreen className="items-center justify-center"><Text style={{ color: tokens.text }}>还没有正在播放的音乐</Text></ThemedScreen>;
  const bar = <><View className="mt-7 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `${tokens.text}22` }}><View className="h-full rounded-full" style={{ width: duration ? `${Math.min(progress / duration * 100, 100)}%` : "0%", backgroundColor: tokens.accent }} /></View><View className="mt-2 flex-row justify-between"><Text className="text-xs" style={{ color: tokens.mutedText }}>{time(progress)}</Text><Text className="text-xs" style={{ color: tokens.mutedText }}>{time(duration)}</Text></View></>;
  const controls = <Controls playing={playing} toggle={() => void togglePlayback()} seek={(seconds) => void seekBy(seconds)} />;
  return <ThemedScreen>{preferences.playerLayout === "immersive" && track.artwork ? <Image pointerEvents="none" className="absolute inset-0 h-full w-full opacity-20" contentFit="cover" source={{ uri: track.artwork }} /> : null}<View className="flex-1 px-6 pb-10 pt-16"><View className="flex-row items-center justify-between"><Pressable onPress={() => router.back()}><Text style={{ color: tokens.accent, fontWeight: "800" }}>⌄ 关闭</Text></Pressable><Text className="text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>PLAYER</Text></View>
    {preferences.playerLayout === "vinyl" ? <View className="flex-1"><Animated.View className="flex-1" style={{ transform: [{ translateX: entrance }] }}><Lyrics lines={lyrics} progress={progress} /></Animated.View><Text numberOfLines={1} style={{ color: tokens.text, fontSize: 21, fontWeight: "900" }}>{track.title}</Text><Text className="mt-1" style={{ color: tokens.mutedText }}>{track.artist}</Text>{bar}{controls}</View> : null}
    {preferences.playerLayout === "immersive" ? <View className="flex-1"><View className="mt-8 items-center">{track.artwork ? <View className="overflow-hidden border p-2" style={{ borderRadius: tokens.cardRadius + 8, borderColor: tokens.surfaceBorder }}><Image className="h-60 w-60 rounded-2xl" source={{ uri: track.artwork }} /></View> : null}</View><View className="mt-8"><Text numberOfLines={1} style={{ color: tokens.text, fontSize: 25, fontWeight: "900" }}>{track.title}</Text><Text className="mt-1" style={{ color: tokens.mutedText }}>{track.artist}</Text>{bar}{controls}</View><View className="mt-4 h-36"><Lyrics lines={lyrics} progress={progress} /></View></View> : null}
    {preferences.playerLayout === "minimal" ? <View className="flex-1 justify-center"><View className="flex-row items-center gap-5">{track.artwork ? <Image className="h-24 w-24 rounded-3xl" source={{ uri: track.artwork }} /> : <View className="h-24 w-24 rounded-3xl" style={{ backgroundColor: `${tokens.accent}22` }} />}<View className="min-w-0 flex-1"><Text className="text-xs font-bold tracking-[3px]" style={{ color: tokens.accent }}>NOW PLAYING</Text><Text className="mt-3 text-3xl font-black" numberOfLines={2} style={{ color: tokens.text }}>{track.title}</Text><Text className="mt-2" numberOfLines={1} style={{ color: tokens.mutedText }}>{track.artist}</Text></View></View><View className="mt-12 h-44"><Lyrics lines={lyrics} progress={progress} /></View>{bar}{controls}</View> : null}</View></ThemedScreen>;
}