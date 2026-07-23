import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Pressable, Text, TextInput, useWindowDimensions, View, type ListRenderItemInfo } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useTheme } from "@/theme";
import { normalizeBackendUrl } from "@/utils/apiBase";

const brandIcon = require("../assets/brand-icon.png");

type PageKey = "welcome" | "profile" | "backend";
interface Page { key: PageKey; }
const pages: Page[] = [{ key: "welcome" }, { key: "profile" }, { key: "backend" }];
const urlPattern = /^https?:\/\/[^\s]+$/i;

export default function OnboardingScreen(): React.JSX.Element {
  const listRef = useRef<FlatList<Page>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [backend, setBackend] = useState("");
  const [backendError, setBackendError] = useState("");
  const [saving, setSaving] = useState(false);
  const { profile, saveProfile } = useAccount();
  const { t } = useI18n();
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const copy = useMemo(() => ({
    welcome: { title: t("brandName"), body: t("onboardingWelcomeBody") },
    profile: { title: t("onboardingProfileTitle"), body: t("onboardingProfileBody") },
    backend: { title: t("onboardingBackendTitle"), body: t("onboardingBackendBody") },
  }), [t]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName);
    setAvatar(profile.avatarUrl);
    setBackend(profile.backendUrl);
  }, [profile]);

  const complete = Boolean(name.trim() && urlPattern.test(backend.trim()));
  const next = (): void => listRef.current?.scrollToOffset({ offset: Math.min(page + 1, pages.length - 1) * width, animated: true });
  const chooseAvatar = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      const sourceUri = result.assets[0].uri;
      const extension = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
      const targetUri = `${FileSystem.documentDirectory}hyacine-avatar.${extension}`;
      await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
      setAvatar(targetUri);
    }
  };
  const finish = async (): Promise<void> => {
    if (!complete || saving) return;
    setSaving(true);
    setBackendError("");
    const normalizedBackend = normalizeBackendUrl(backend);
    const healthUrl = `${normalizedBackend}/api/v1/health`;
    try {
      const response = await fetch(healthUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await saveProfile({ displayName: name, avatarUrl: avatar, backendUrl: normalizedBackend, musicSources: profile?.musicSources ?? [], onboardingCompleted: true });
      router.replace("/sources");
    } catch (error) {
      const detail = error instanceof Error && error.message ? `（${error.message}）` : "";
      setBackendError(`${t("backendConnectError")} ${healthUrl}${detail}。${t("backendConnectHint")}`);
    } finally {
      setSaving(false);
    }
  };

  const render = ({ item, index }: ListRenderItemInfo<Page>): React.JSX.Element => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
    const contentX = scrollX.interpolate({ inputRange, outputRange: [width * 0.22, 0, -width * 0.22], extrapolate: "clamp" });
    const titleY = scrollX.interpolate({ inputRange, outputRange: [54, 0, -54], extrapolate: "clamp" });
    const detailY = scrollX.interpolate({ inputRange, outputRange: [112, 0, -112], extrapolate: "clamp" });
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.82, 1, 0.82], extrapolate: "clamp" });
    const visualRotate = scrollX.interpolate({ inputRange, outputRange: ["-15deg", "0deg", "15deg"], extrapolate: "clamp" });
    const currentCopy = copy[item.key];
    return <View style={{ width }}><Animated.View className="px-7 pt-24" style={{ opacity, transform: [{ translateX: contentX }] }}>
      <Animated.View style={{ transform: [{ translateY: titleY }] }}>
        <Text style={{ color: tokens.mutedText, fontSize: 12, fontWeight: "800", letterSpacing: 1.4 }}>{t("onboardingStep")} {String(index + 1).padStart(2, "0")}</Text>
        {item.key === "welcome" ? <Animated.View className="mt-8 h-20 w-20 overflow-hidden rounded-[22px]" style={{ transform: [{ scale }, { rotate: visualRotate }], backgroundColor: "transparent" }}><Image className="h-full w-full" source={brandIcon} contentFit="contain" style={{ backgroundColor: "transparent" }} /></Animated.View> : null}
        <Text className={item.key === "welcome" ? "mt-10" : "mt-7"} style={{ color: tokens.text, fontSize: item.key === "welcome" ? 35 : 31, fontWeight: "800" }}>{currentCopy.title}</Text>
        <Text className="mt-4 text-base leading-7" style={{ color: tokens.mutedText }}>{currentCopy.body}</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: detailY }] }}>
        {item.key === "profile" ? <>
          <Pressable className="mt-10 h-16 w-16 overflow-hidden rounded-full" style={{ backgroundColor: `${tokens.accent}2a` }} onPress={() => void chooseAvatar()}>{avatar ? <Image className="h-full w-full" source={{ uri: avatar }} /> : <Text className="pt-4 text-center" style={{ color: tokens.accent, fontSize: 20, fontWeight: "900" }}>{name.trim().slice(0, 1).toUpperCase() || "H"}</Text>}</Pressable>
          <View className="mt-8 h-12 justify-center rounded-2xl px-4" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}><TextInput value={name} onChangeText={setName} placeholder={t("onboardingNamePlaceholder")} placeholderTextColor={tokens.mutedText} style={{ color: tokens.text, height: "100%", fontSize: 16, paddingVertical: 0 }} /></View>
          <Pressable className="mt-3 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }} onPress={() => void chooseAvatar()}><Text style={{ color: tokens.text, fontSize: 14, fontWeight: "700" }}>{avatar ? t("changeAvatar") : t("chooseFromGallery")}</Text></Pressable>
        </> : null}
        {item.key === "backend" ? <>
          <View className="mt-12 h-12 justify-center rounded-2xl px-4" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: backendError || (backend && !urlPattern.test(backend)) ? "#ef4444" : tokens.surfaceBorder }}><TextInput value={backend} onChangeText={(value) => { setBackend(value); setBackendError(""); }} autoCapitalize="none" keyboardType="url" placeholder="https://music.example.com" placeholderTextColor={tokens.mutedText} style={{ color: tokens.text, height: "100%", fontSize: 16, paddingVertical: 0 }} /></View>
          <Text className="mt-3 text-xs leading-5" style={{ color: backendError ? "#ef4444" : tokens.mutedText }}>{backendError || t("onboardingBackendHint")}</Text>
        </> : null}
      </Animated.View>
    </Animated.View></View>;
  };

  return <ThemedScreen>
    <Animated.FlatList ref={listRef} data={pages} renderItem={render} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.key} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })} scrollEventThrottle={16} onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))} />
    <View className="absolute bottom-12 left-7 right-7 flex-row items-center justify-between"><View className="h-2 flex-row gap-2">{pages.map((item, index) => { const scaleX = scrollX.interpolate({ inputRange: [(index - 1) * width, index * width, (index + 1) * width], outputRange: [1, 3.25, 1], extrapolate: "clamp" }); return <Animated.View key={item.key} className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.accent, transform: [{ scaleX }] }} />; })}</View><Pressable disabled={page === 2 && !complete} className="h-11 items-center justify-center rounded-full px-6" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder, opacity: page === 2 && !complete ? 0.5 : 1 }} onPress={page === 2 ? () => void finish() : next}><Text style={{ color: tokens.text, fontWeight: "800", fontSize: 14 }}>{page === 2 ? (saving ? t("saving") : t("finish")) : t("continue")}</Text></Pressable></View>
  </ThemedScreen>;
}
