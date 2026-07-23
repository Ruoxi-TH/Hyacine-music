import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Animated, PanResponder, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccount } from "@/account";
import { ThemedCard } from "@/components/ui/ThemedCard";
import { useI18n } from "@/i18n";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useTheme } from "@/theme";
import { supportsNeteaseCapability } from "@/services/neteaseCapabilities";
import { apiBase } from "@/utils/apiBase";

type Source = "netease" | "bilibili";
interface QrPayload { key?: string; qrUrl?: string; message?: string; }
interface PollPayload { status?: "pending" | "confirmed" | "expired"; cookie?: string; }

export default function SourcesScreen(): React.JSX.Element {
  const { profile, saveSourceCredential, updateProfile } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const [source, setSource] = useState<Source>("netease");
  const [neteaseMode, setNeteaseMode] = useState<"qr" | "cookie">("qr");
  const sourceMotion = useRef(new Animated.Value(0)).current;
  const sourceRef = useRef<Source>("netease");
  const [qr, setQr] = useState("");
  const [key, setKey] = useState("");
  const [cookie, setCookie] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const base = useMemo(() => apiBase(profile?.backendUrl), [profile?.backendUrl]);

  const syncNeteaseProfile = async (cookie: string): Promise<void> => {
    if (!base) return;
    try {
      const response = await fetch(`${base}/music-sources/netease/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const data = await response.json() as { nickname?: string; avatarUrl?: string; message?: string };
      if (!response.ok) return;
      await updateProfile({
        displayName: data.nickname?.trim() || profile?.displayName || t("neteaseUser"),
        avatarUrl: data.avatarUrl?.trim() || profile?.avatarUrl || "",
      });
    } catch {
      // Keep local profile if remote profile sync fails.
    }
  };

  const createQr = async (): Promise<void> => {
    if (!base) {
      setNote(t("noServerConfigured"));
      return;
    }
    if (!(await supportsNeteaseCapability(profile?.backendUrl, "qr"))) {
      setNeteaseMode("cookie");
      setNote(t("qrNotSupported"));
      return;
    }
    setLoading(true);
    setNote(t("creatingNeteaseSession"));
    try {
      const response = await fetch(`${base}/music-sources/netease/qr`);
      const data = await response.json() as QrPayload;
      if (!response.ok || !data.key || !data.qrUrl) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      setKey(data.key);
      setQr(data.qrUrl);
      setNote(t("scanNeteaseCode"));
    } catch (error) {
      const detail = error instanceof Error && error.message ? `（${error.message}）` : "";
      setNote(`${t("qrUnavailable")}${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (source !== "netease" || neteaseMode !== "qr" || qr || loading) return;
    void createQr();
    // auto fetch once when entering netease tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    if (!key) return;
    const timer = setInterval(() => {
      void fetch(`${base}/music-sources/netease/qr/${encodeURIComponent(key)}`)
        .then(async (response) => ({ response, data: await response.json() as PollPayload }))
        .then(({ response, data }) => {
          if (!response.ok) return;
          if (data.status === "confirmed" && data.cookie) {
            clearInterval(timer);
            void saveSourceCredential("netease", data.cookie).then(async () => { await syncNeteaseProfile(data.cookie!); router.replace("/(tabs)"); });
          }
          if (data.status === "expired") {
            clearInterval(timer);
            setNote(t("qrExpired"));
          }
        })
        .catch(() => undefined);
    }, 1800);
    return () => clearInterval(timer);
  }, [base, key, saveSourceCredential]);

  const saveNeteaseCookie = async (): Promise<void> => {
    const credential = cookie.trim();
    if (!credential) return;
    setLoading(true);
    setNote(t("savingCredentials"));
    try {
      await saveSourceCredential("netease", credential);
      await syncNeteaseProfile(credential);
      router.replace("/(tabs)");
    } catch {
      setNote(t("cookieSaveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const saveBilibili = async (): Promise<void> => {
    if (!cookie.trim()) return;
    setLoading(true);
    setNote(t("checkingCookie"));
    try {
      const response = await fetch(`${base}/music-sources/bilibili/validate-cookie`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cookie }),
      });
      const data = await response.json() as { valid?: boolean };
      if (!response.ok || !data.valid) throw new Error();
      await saveSourceCredential("bilibili", cookie);
      router.replace("/(tabs)");
    } catch {
      setNote(t("cookieValidationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const selectSource = (next: Source): void => {
    if (next === sourceRef.current) return;
    const direction = next === "bilibili" ? 1 : -1;
    sourceMotion.setValue(direction);
    sourceRef.current = next;
    setSource(next);
    setNote("");
    setQr("");
    setKey("");
    Animated.spring(sourceMotion, { toValue: 0, useNativeDriver: true, stiffness: 230, damping: 23, mass: 0.8 }).start();
  };

  const sourcePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 48 && Math.abs(gesture.vx) < 0.38) return;
      selectSource(gesture.dx < 0 ? "bilibili" : "netease");
    },
  })).current;

  const tabStyle = (item: Source) => ({
    backgroundColor: source === item ? (isLiquid ? "transparent" : tokens.surfaceStrong) : "transparent",
    borderRadius: 18,
    borderWidth: source === item && isLiquid ? 1 : 0,
    borderColor: source === item && isLiquid ? `${tokens.text}38` : "transparent",
  });
  const sourceContentStyle = {
    opacity: sourceMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.3, 1, 0.3] }),
    transform: [{ translateX: sourceMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [-46, 0, 46] }) }],
  };

  return <ThemedScreen>
    <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
      <View className="flex-1 px-5">
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text style={{ color: tokens.mutedText, fontSize: 13, fontWeight: "700" }}>{t("onboardingStep")} 03</Text>
            <Text className="mt-1" style={{ color: tokens.text, fontSize: 32, fontWeight: "800" }}>{t("sourcesTitle")}</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: isLiquid ? "#ffffff52" : tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}>
            <Text style={{ color: tokens.text, fontSize: 18, fontWeight: "700" }}>03</Text>
          </View>
        </View>

        <Text className="mt-5 text-base leading-6" style={{ color: tokens.mutedText }}>{t("sourcesBody")}</Text>

        <ThemedCard className="mt-8 p-1.5" style={{ borderRadius: 23 }}>
          <View className="flex-row">
            {(["netease", "bilibili"] as Source[]).map((item) => <Pressable key={item} className="h-12 flex-1 items-center justify-center" style={tabStyle(item)} onPress={() => selectSource(item)}>
              <Text style={{ color: source === item ? tokens.text : tokens.mutedText, fontSize: 15, fontWeight: "800" }}>{item === "netease" ? t("neteaseCloud") : t("bilibili")}</Text>
            </Pressable>)}
          </View>
        </ThemedCard>

        <Animated.View className="flex-1" style={sourceContentStyle} {...sourcePan.panHandlers}>
          {source === "netease" ? <View className="flex-1 pt-8">
            <ThemedCard className="p-1.5" style={{ borderRadius: 23 }}>
              <View className="flex-row">
                {(["qr", "cookie"] as const).map((mode) => <Pressable key={mode} className="h-11 flex-1 items-center justify-center" style={{ backgroundColor: neteaseMode === mode ? (isLiquid ? "transparent" : tokens.surfaceStrong) : "transparent", borderRadius: 18, borderWidth: neteaseMode === mode && isLiquid ? 1 : 0, borderColor: neteaseMode === mode && isLiquid ? `${tokens.text}38` : "transparent" }} onPress={() => { setNeteaseMode(mode); setQr(""); setKey(""); setNote(""); }}>
                  <Text style={{ color: neteaseMode === mode ? tokens.text : tokens.mutedText, fontSize: 14, fontWeight: "800" }}>{mode === "qr" ? t("qrLogin") : t("importCookieTab")}</Text>
                </Pressable>)}
              </View>
            </ThemedCard>
            {neteaseMode === "qr" ? <View className="flex-1 items-center justify-center pb-12">
              <View className="items-center">
                <ThemedCard className="h-[294px] w-[294px] items-center justify-center p-2" style={{ borderRadius: 42 }}>
                  {qr ? <View className="h-[278px] w-[278px] items-center justify-center rounded-[34px] bg-white p-3"><QRCode value={qr} size={254} color="#17212d" backgroundColor="#ffffff" /></View> : <LinearGradient className="h-[278px] w-[278px] items-center justify-center rounded-[34px]" colors={isLiquid ? ["#ffffff74", "#d8ecff50"] : [tokens.backgroundSecondary, tokens.surface]}>
                    <Text style={{ color: tokens.mutedText, fontSize: 15, fontWeight: "700" }}>{t("secureSessionWaiting")}</Text>
                  </LinearGradient>}
                </ThemedCard>
                <Text className="mt-6" style={{ color: tokens.text, fontSize: 19, fontWeight: "800" }}>{qr ? t("scanInNetease") : t("connectNetease")}</Text>
                <Text className="mt-2 text-center text-sm leading-5" style={{ color: tokens.mutedText }}>{qr ? t("qrCompletesAutomatically") : t("qrSessionOnly")}</Text>
              </View>
            </View> : <View className="flex-1 pt-6">
              <ThemedCard className="p-0" style={{ borderRadius: 28 }}>
                <View className="px-5 pb-3 pt-5"><Text style={{ color: tokens.text, fontSize: 18, fontWeight: "800" }}>{t("importNeteaseCookie")}</Text><Text className="mt-1 text-sm leading-5" style={{ color: tokens.mutedText }}>{t("importNeteaseCookieHint")}</Text></View>
                <TextInput value={cookie} onChangeText={setCookie} autoCapitalize="none" autoCorrect={false} multiline placeholder={t("pasteNeteaseCookie")} placeholderTextColor={tokens.mutedText} textAlignVertical="top" style={{ minHeight: 210, color: tokens.text, backgroundColor: isLiquid ? "transparent" : tokens.backgroundSecondary, borderTopWidth: 1, borderColor: tokens.surfaceBorder, padding: 20, fontSize: 14, lineHeight: 22 }} />
              </ThemedCard>
            </View>}
          </View> : <View className="flex-1 pt-8">
            <ThemedCard className="p-0" style={{ borderRadius: 28 }}>
              <View className="px-5 pb-3 pt-5"><Text style={{ color: tokens.text, fontSize: 18, fontWeight: "800" }}>{t("importCookie")}</Text><Text className="mt-1 text-sm leading-5" style={{ color: tokens.mutedText }}>{t("cookieRequirements")}</Text></View>
              <TextInput value={cookie} onChangeText={setCookie} autoCapitalize="none" autoCorrect={false} multiline placeholder={t("cookiePlaceholder")} placeholderTextColor={tokens.mutedText} textAlignVertical="top" style={{ minHeight: 210, color: tokens.text, backgroundColor: isLiquid ? "transparent" : tokens.backgroundSecondary, borderTopWidth: 1, borderColor: tokens.surfaceBorder, padding: 20, fontSize: 14, lineHeight: 22 }} />
            </ThemedCard>
          </View>}
        </Animated.View>

        <View className="mb-2">
          <Pressable disabled={loading || ((source === "bilibili" || (source === "netease" && neteaseMode === "cookie")) && !cookie.trim())} className="h-14 items-center justify-center overflow-hidden rounded-[28px]" style={{ opacity: loading || ((source === "bilibili" || (source === "netease" && neteaseMode === "cookie")) && !cookie.trim()) ? 0.48 : 1 }} onPress={() => void (source === "netease" ? (neteaseMode === "cookie" ? saveNeteaseCookie() : createQr()) : saveBilibili())}>
            <LinearGradient className="absolute inset-0" colors={isLiquid ? ["#203e60", "#6b9cc0", "#274561"] : [tokens.accent, tokens.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>{loading ? t("working") : source === "netease" ? (neteaseMode === "cookie" ? t("secureSaveAndContinue") : (qr ? t("refreshQr") : t("getQr"))) : t("verifyAndSave")}</Text>
          </Pressable>
          <Text className="mx-5 mt-4 text-center text-xs leading-5" style={{ color: tokens.mutedText }}>{note || t("credentialsLocal")}</Text>
        </View>
      </View>
    </SafeAreaView>
  </ThemedScreen>;
}