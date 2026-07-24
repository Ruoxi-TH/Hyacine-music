import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { ThemedCard } from "@/components/ui/ThemedCard";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { normalizeBackendUrl } from "@/utils/apiBase";
import { LIQUID_GLASS_COLORS } from "@/constants/liquidGlass";

const urlPattern = /^https?:\/\/[^\s]+$/i;

export default function OnboardingScreen(): React.JSX.Element {
  const { profile, saveProfile } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const glass = tokens.isLight ? LIQUID_GLASS_COLORS.light : LIQUID_GLASS_COLORS.dark;

  const [backend, setBackend] = useState(profile?.backendUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.backendUrl) {
      setBackend(profile.backendUrl);
    }
  }, [profile?.backendUrl]);

  const handleConnect = async () => {
    if (!backend.trim()) {
      setError(t("onboardingBackendHint"));
      return;
    }

    if (!urlPattern.test(backend.trim())) {
      setError(t("onboardingBackendHint"));
      return;
    }

    setLoading(true);
    setError("");

    const normalizedBackend = normalizeBackendUrl(backend);
    const healthUrl = `${normalizedBackend}/api/v1/health`;

    try {
      const response = await fetch(healthUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await saveProfile({
        displayName: profile?.displayName || "",
        avatarUrl: profile?.avatarUrl || "",
        backendUrl: normalizedBackend,
        musicSources: profile?.musicSources || [],
        onboardingCompleted: false,
      });

      router.replace("/login");
    } catch (err) {
      const detail = err instanceof Error ? ` (${err.message})` : "";
      setError(`${t("backendConnectError")} ${healthUrl}${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedScreen>
      <View className="flex-1 px-5 pt-16">
        <Text
          style={{ color: tokens.mutedText, fontSize: 12, fontWeight: "800", letterSpacing: 1.4 }}
        >
          {t("onboardingStep")} 02
        </Text>
        <Text
          className="mt-3"
          style={{ color: tokens.text, fontSize: 32, fontWeight: "800" }}
        >
          {t("onboardingBackendTitle")}
        </Text>
        <Text
          className="mt-2 text-base"
          style={{ color: tokens.mutedText }}
        >
          {t("onboardingBackendBody")}
        </Text>

        <ThemedCard className="mt-8 p-5" style={{ borderRadius: 24 }}>
          <TextInput
            value={backend}
            onChangeText={(value) => {
              setBackend(value);
              setError("");
            }}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://music.example.com"
            placeholderTextColor={tokens.mutedText}
            className="h-12 rounded-xl px-4"
            style={{
              color: tokens.text,
              backgroundColor: isLiquid ? glass.background : tokens.surface,
              borderWidth: 1,
              borderColor: error ? "#ef4444" : tokens.surfaceBorder,
            }}
          />
          {error ? (
            <Text className="mt-2 text-xs" style={{ color: "#ef4444" }}>
              {error}
            </Text>
          ) : (
            <Text className="mt-2 text-xs" style={{ color: tokens.mutedText }}>
              {t("onboardingBackendHint")}
            </Text>
          )}
        </ThemedCard>

        <Pressable
          disabled={loading || !backend.trim()}
          className="mt-6 h-14 items-center justify-center overflow-hidden rounded-2xl"
          style={{ opacity: loading || !backend.trim() ? 0.5 : 1 }}
          onPress={handleConnect}
        >
          <LinearGradient
            className="absolute inset-0"
            colors={
              isLiquid
                ? ["#203e60", "#6b9cc0", "#274561"]
                : [tokens.accent, tokens.accent]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text className="text-base font-bold" style={{ color: "#fff" }}>
            {loading ? t("working") : t("continue")}
          </Text>
        </Pressable>
      </View>
    </ThemedScreen>
  );
}