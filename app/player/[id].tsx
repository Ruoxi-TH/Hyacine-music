import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { normalizeMediaUrl } from "@/utils/media";
import { useAudio } from "@/hooks/useAudio";
import { usePlayerStore } from "@/store/playerStore";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { useTheme } from "@/theme";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { loadLyrics, type LyricLine } from "@/services/lyrics";
import { isFavorite, toggleFavorite } from "@/services/favorites";

function time(v: number): string {
  return `${Math.floor(v / 60)}:${Math.floor(v % 60).toString().padStart(2, "0")}`;
}

function Controls({
  playing,
  toggle,
  skip,
  canSkip,
  modeLabel,
  onCycleMode,
}: {
  playing: boolean;
  toggle: () => void;
  skip: (direction: -1 | 1) => void;
  canSkip: boolean;
  modeLabel: string;
  onCycleMode: () => void;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const { t } = useI18n();
  const buttonStyle = { color: tokens.text, fontSize: 25, fontWeight: "900" as const };
  return (
    <LiquidControlSurface className="mt-6 self-center rounded-full px-3 py-2" style={{ borderRadius: 999 }}>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={t("cycleMode")}
          className="h-11 w-11 items-center justify-center"
          onPress={onCycleMode}
        >
          <Text style={{ color: tokens.accent, fontSize: 18, fontWeight: "900" }}>{modeLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("previousTrack")}
          disabled={!canSkip}
          className="h-11 w-11 items-center justify-center"
          style={{ opacity: canSkip ? 1 : 0.35 }}
          onPress={() => skip(-1)}
        >
          <Text style={buttonStyle}>|◀</Text>
        </Pressable>
        <Pressable
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.accent }}
          onPress={toggle}
        >
          <Text style={{ color: tokens.isLight ? "#fff" : "#111", fontSize: 22, fontWeight: "900" }}>
            {playing ? "Ⅱ" : "▶"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("nextTrack")}
          disabled={!canSkip}
          className="h-11 w-11 items-center justify-center"
          style={{ opacity: canSkip ? 1 : 0.35 }}
          onPress={() => skip(1)}
        >
          <Text style={buttonStyle}>▶|</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("queueLabel")}
          className="h-11 w-11 items-center justify-center"
          onPress={() => router.push("/queue")}
        >
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: "900" }}>≡</Text>
        </Pressable>
      </View>
    </LiquidControlSurface>
  );
}

function Lyrics({
  lines,
  progress,
  onSeek,
  light = false,
  focusBlur = false,
}: {
  lines: LyricLine[];
  progress: number;
  onSeek: (v: number) => void;
  light?: boolean;
  focusBlur?: boolean;
}): React.JSX.Element {
  const { tokens, preferences } = useTheme();
  const { t } = useI18n();
  const scroll = useRef<ScrollView>(null);
  const lyricEntrance = useRef(new Animated.Value(1)).current;
  const active = Math.max(0, lines.reduce((last, line, index) => line.time <= progress ? index : last, 0));

  useEffect(() => {
    if (!focusBlur) scroll.current?.scrollTo({ y: Math.max(0, active * 84), animated: true });
  }, [active, focusBlur]);

  useEffect(() => {
    if (!focusBlur) return;
    lyricEntrance.setValue(0);
    Animated.timing(lyricEntrance, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [active, focusBlur, lyricEntrance]);

  if (!lines.length) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text style={{ color: light ? "#ffffffcc" : tokens.mutedText }}>{t("lyricsUnavailable")}</Text>
      </View>
    );
  }

  const renderLine = (line: LyricLine, index: number): React.JSX.Element => {
    const current = index === active;
    const distance = Math.abs(index - active);
    const opacity = focusBlur ? [1, 0.58, 0.32, 0.16, 0.06][Math.min(distance, 4)] : current ? 1 : distance === 1 ? 0.48 : 0.2;
    const scale = focusBlur ? [1, 0.98, 0.95, 0.92, 0.89][Math.min(distance, 4)] : 1;
    return (
      <Pressable
        key={`${line.time}-${index}`}
        onPress={() => onSeek(line.time)}
        style={{ minHeight: 84, justifyContent: "center", alignItems: "center", opacity, transform: [{ scale }] }}
      >
        <Text
          style={{
            color: current ? (preferences.lyricCurrentColor ?? (light ? "#fff" : tokens.accent)) : (light ? "#fff" : tokens.text),
            fontSize: current ? 27 : 17,
            fontWeight: current ? "900" : "700",
            lineHeight: current ? 36 : 25,
            textAlign: "center",
            textShadowColor: focusBlur && !current ? "rgba(255,255,255,0.72)" : "transparent",
            textShadowRadius: focusBlur ? Math.min(distance, 4) * 3 : 0,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          {line.text}
        </Text>
        {line.translation ? (
          <Text
            className="mt-1 text-sm"
            style={{ color: current ? (light ? "#ffffffcc" : tokens.accent) : (light ? "#fff" : tokens.mutedText), textAlign: "center" }}
          >
            {line.translation}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  if (focusBlur) {
    const visible = [active - 1, active, active + 1].filter((index) => index >= 0 && index < lines.length);
    return (
      <View className="overflow-hidden" style={{ height: 310, justifyContent: "center" }}>
        {visible.map((index) => {
          const line = lines[index];
          const current = index === active;
          const distance = Math.abs(index - active);
          return (
            <Animated.View
              key={`${line.time}-${index}`}
              style={{
                opacity: current ? lyricEntrance : distance === 1 ? 0.24 : 0,
                transform: [{ translateY: lyricEntrance.interpolate({ inputRange: [0, 1], outputRange: [current ? 26 : 12, 0] }) }],
              }}
            >
              <Pressable onPress={() => onSeek(line.time)} style={{ minHeight: current ? 112 : 64, justifyContent: "center", alignItems: "center" }}>
                <Text
                  style={{
                    color: current ? (preferences.lyricCurrentColor ?? (light ? "#fff" : tokens.accent)) : (light ? "#fff" : tokens.text),
                    fontSize: current ? 34 : 18,
                    fontWeight: current ? "900" : "700",
                    lineHeight: current ? 44 : 26,
                    textAlign: "center",
                    textShadowColor: current ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                    textShadowRadius: current ? 1 : 8,
                    textShadowOffset: { width: 0, height: 0 },
                  }}
                >
                  {line.text}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scroll}
      className="flex-1"
      contentContainerStyle={{ paddingTop: 126, paddingBottom: 126 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={84}
      decelerationRate="fast"
    >
      {lines.map(renderLine)}
    </ScrollView>
  );
}

export default function FullPlayerScreen(): React.JSX.Element {
  const track = usePlayerStore(s => s.currentTrack);
  const playing = usePlayerStore(s => s.isPlaying);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const queue = usePlayerStore(s => s.queue);
  const playMode = usePlayerStore(s => s.playMode);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const cycleUnifiedMode = usePlayerStore(s => s.cycleUnifiedMode);
  const { seekTo, togglePlayback, skipTrack } = useAudio();
  const { preferences, tokens } = useTheme();
  const { t } = useI18n();
  const { profile, getSourceCredential } = useAccount();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [draggingProgress, setDraggingProgress] = useState<number | null>(null);
  const entrance = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    if (!track || !profile?.backendUrl) {
      setLyrics([]);
      return;
    }
    void getSourceCredential("netease")
      .then(c => loadLyrics(profile.backendUrl, track.id, c))
      .then(setLyrics)
      .catch(() => setLyrics([]));
  }, [getSourceCredential, profile?.backendUrl, track?.id]);

  useEffect(() => {
    if (track) void isFavorite(track.id).then(setFavorite);
  }, [track?.id]);

  useEffect(() => {
    entrance.setValue(36);
    Animated.timing(entrance, { toValue: 0, duration: 480, useNativeDriver: true }).start();
  }, [entrance, track?.id]);

  // 手势：左右滑动切歌、下滑关闭
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
    onPanResponderRelease: (_, g) => {
      // 横向切歌
      if (Math.abs(g.dx) > 60 && Math.abs(g.dx) > Math.abs(g.dy)) {
        if (g.dx < 0) void skipTrack(1);
        else void skipTrack(-1);
        return;
      }
      // 下滑关闭
      if (g.dy > 120 && Math.abs(g.dy) > Math.abs(g.dx)) {
        router.back();
        return;
      }
    },
  })).current;

  if (!track) {
    return (
      <ThemedScreen className="items-center justify-center">
        <Text style={{ color: tokens.text }}>{t("nothingPlaying")}</Text>
      </ThemedScreen>
    );
  }

  // 统一模式按钮：使用 store 的 cycleUnifiedMode
  // 状态：sequential → shuffle → repeatOne → sequential
  // 显示：sequential=→ / shuffle=⇄ / repeatOne=↻1
  const modeLabel = repeatMode === "one" ? "↻1" : playMode === "shuffle" ? "⇄" : "→";

  // 进度条：使用 Slider 支持拖动；拖动中暂停 progress 更新
  const displayedProgress = draggingProgress ?? progress;
  const bar = (
    <>
      <Slider
        style={{ width: "100%", height: 36, marginTop: 24 }}
        minimumValue={0}
        maximumValue={Math.max(0.1, duration)}
        value={Math.min(displayedProgress, duration)}
        minimumTrackTintColor={tokens.accent}
        maximumTrackTintColor={`${tokens.text}33`}
        thumbTintColor={tokens.accent}
        onValueChange={(v: number) => setDraggingProgress(v)}
        onSlidingComplete={(v: number) => {
          void seekTo(v);
          setDraggingProgress(null);
        }}
        onSlidingStart={() => setDraggingProgress(progress)}
      />
      <View className="mt-1 flex-row justify-between">
        <Text className="text-xs" style={{ color: tokens.mutedText }}>{time(displayedProgress)}</Text>
        <Text className="text-xs" style={{ color: tokens.mutedText }}>{time(duration)}</Text>
      </View>
    </>
  );

  const controls = (
    <Controls
      playing={playing}
      toggle={() => void togglePlayback()}
      skip={direction => void skipTrack(direction)}
      canSkip={queue.length > 1}
      modeLabel={modeLabel}
      onCycleMode={cycleUnifiedMode}
    />
  );

  const actions = (
    <View className="flex-row gap-2">
      <Pressable
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tokens.accent}18` }}
        accessibilityLabel={t("comments")}
        onPress={() => router.push({ pathname: "/comments/[id]", params: { id: track.id, title: track.title } })}
      >
        <Text style={{ color: tokens.accent, fontSize: 20, fontWeight: "900" }}>💬</Text>
      </Pressable>
      <Pressable
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tokens.accent}18` }}
        accessibilityLabel={favorite ? t("removeFavorite") : t("addFavorite")}
        onPress={() => void getSourceCredential("netease")
          .then(cookie => toggleFavorite(track, { backendUrl: profile?.backendUrl, cookie }))
          .then(setFavorite)}
      >
        <Text style={{ color: tokens.accent, fontSize: 24 }}>{favorite ? "♥" : "♡"}</Text>
      </Pressable>
    </View>
  );

  const heading = (
    <View className="flex-row items-center justify-between">
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} style={{ color: tokens.text, fontSize: 23, fontWeight: "900" }}>{track.title}</Text>
        <Text className="mt-1" numberOfLines={1} style={{ color: tokens.mutedText }}>{track.artist}</Text>
      </View>
      {actions}
    </View>
  );

  return (
    <ThemedScreen>
      <View className="flex-1 px-6 pb-10 pt-16" {...panResponder.panHandlers}>
        <View className="z-10 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: tokens.accent, fontWeight: "900" }}>⌄ {t("closePlayer")}</Text>
          </Pressable>
          <Pressable accessibilityLabel={t("nowPlaying")} onPress={() => router.push("/queue")}>
            <Text style={{ color: tokens.accent, fontSize: 22, fontWeight: "900" }}>≡</Text>
          </Pressable>
        </View>

        {preferences.playerLayout === "vinyl" ? (
          <View className="flex-1">
            <View className="mt-14 items-center">
              {track.artwork ? (
                <Image
                  source={{ uri: normalizeMediaUrl(track.artwork) }}
                  contentFit="cover"
                  style={{ width: 224, height: 224, borderRadius: 34, borderColor: tokens.surfaceBorder, borderWidth: 1 }}
                />
              ) : null}
            </View>
            <Animated.View className="mt-5 flex-1" style={{ transform: [{ translateX: entrance }] }}>
              <Lyrics lines={lyrics} progress={progress} onSeek={v => void seekTo(v)} />
            </Animated.View>
            {heading}
            {bar}
            {controls}
          </View>
        ) : null}

        {preferences.playerLayout === "coverLyrics" ? (
          <View className="flex-1">
            <View className="mt-5 flex-row items-center gap-4">
              {track.artwork ? (
                <Image source={{ uri: normalizeMediaUrl(track.artwork) }} style={{ width: 80, height: 80, borderRadius: 20 }} />
              ) : null}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={2} style={{ color: tokens.text, fontSize: 22, fontWeight: "900" }}>{track.title}</Text>
                <Text className="mt-1" numberOfLines={1} style={{ color: tokens.mutedText }}>{track.artist}</Text>
              </View>
              {actions}
            </View>
            <View className="mt-6 flex-1">
              <Lyrics lines={lyrics} progress={progress} onSeek={v => void seekTo(v)} />
            </View>
            <View className="pb-2">
              {bar}
              {controls}
            </View>
          </View>
        ) : null}

        {preferences.playerLayout === "minimal" ? (
          <View className="flex-1 justify-center pt-24">
            <View className="flex-row items-center gap-5">
              {track.artwork ? (
                <Image source={{ uri: normalizeMediaUrl(track.artwork) }} style={{ width: 96, height: 96, borderRadius: 28 }} />
              ) : null}
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-bold tracking-[3px]" style={{ color: tokens.accent }}>{t("nowPlaying")}</Text>
                <Text className="mt-3 text-3xl font-black" numberOfLines={2} style={{ color: tokens.text }}>{track.title}</Text>
                <Text className="mt-2" numberOfLines={1} style={{ color: tokens.mutedText }}>{track.artist}</Text>
              </View>
              {actions}
            </View>
            <View className="mt-12 h-44">
              <Lyrics lines={lyrics} progress={progress} onSeek={v => void seekTo(v)} />
            </View>
            {bar}
            {controls}
          </View>
        ) : null}
      </View>
    </ThemedScreen>
  );
}
