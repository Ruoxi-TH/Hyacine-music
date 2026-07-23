import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { ThemedCard } from "@/components/ui/ThemedCard";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { normalizeBackendUrl } from "@/utils/apiBase";

const urlPattern = /^https?:\/\/[^\s]+$/i;

export default function WelcomeScreen(): React.JSX.Element {
  const { profile, updateProfile } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";

  const [backend, setBackend] = useState(profile?.backendUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = useCallback(async () => {
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
      
      // Save backend URL (partial profile, will be completed after login)
      await updateProfile({
        displayName: profile?.displayName || "",
        avatarUrl: profile?.avatarUrl || "",
        backendUrl: normalizedBackend,
        musicSources: profile?.musicSources || [],
        onboardingCompleted: false,
      });
      
      router.replace("/login");
    } catch (err) {
      const detail = err instanceof Error ? `（${err.message}）` : "";
      setError(`${t("backendConnectError")} ${healthUrl}${detail}`);
    } finally {
      setLoading(false);
    }
  }, [backend, profile, updateProfile, t]);

  return (
    <ThemedScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 pb-10 pt-14 flex-1 justify-center"
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{ color: tokens.text, fontSize: 36, fontWeight: "800" }}
            className="text-center"
          >
            {t("brandName")}
          </Text>
          <Text
            className="mt-2 text-center text-base"
            style={{ color: tokens.mutedText }}
          >
            {t("welcomeSubtitle")}
          </Text>

          <ThemedCard className="mt-10 p-5" style={{ borderRadius: 24 }}>
            <Text
              className="mb-2 text-sm"
              style={{ color: tokens.mutedText }}
            >
              {t("onboardingBackendTitle")}
            </Text>
            <Text
              className="mb-4 text-xs"
              style={{ color: tokens.mutedText }}
            >
              {t("onboardingBackendBody")}
            </Text>

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
                backgroundColor: isLiquid ? "transparent" : tokens.surface,
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}