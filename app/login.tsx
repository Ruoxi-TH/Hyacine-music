import { useCallback, useState } from "react";
import {
  Alert,
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
import { login, setStoredToken } from "@/services/auth";
import { LIQUID_GLASS_COLORS } from "@/constants/liquidGlass";

export default function LoginScreen(): React.JSX.Element {
  const { profile, refreshServerUser } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const glass = tokens.isLight ? LIQUID_GLASS_COLORS.light : LIQUID_GLASS_COLORS.dark;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert(t("loginError"), t("loginEmailRequired"));
      return;
    }
    if (!password) {
      Alert.alert(t("loginError"), t("loginPasswordRequired"));
      return;
    }
    if (!profile?.backendUrl) {
      Alert.alert(t("loginError"), t("registerBackendRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await login(profile.backendUrl, email.trim(), password);
      await setStoredToken(result.token);
      await refreshServerUser();
      Alert.alert(t("loginSuccess"), t("loginWelcome"), [
        {
          text: t("continue"),
          onPress: () => {
            if (profile?.musicSources && profile.musicSources.length > 0) {
              router.replace("/(tabs)");
            } else {
              router.replace("/sources");
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t("loginError"), error instanceof Error ? error.message : t("loginError"));
    } finally {
      setLoading(false);
    }
  }, [email, password, profile, t]);

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
          <Text style={{ color: tokens.text, fontSize: 36, fontWeight: "800" }} className="text-center">
            {t("brandName")}
          </Text>
          <Text className="mt-2 text-center text-base" style={{ color: tokens.mutedText }}>
            {t("welcomeSubtitle")}
          </Text>

          <ThemedCard className="mt-10 p-5" style={{ borderRadius: 24 }}>
            <View className="gap-4">
              <View>
                <Text className="mb-2 text-sm" style={{ color: tokens.mutedText }}>
                  {t("loginEmail")}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("loginEmailPlaceholder")}
                  placeholderTextColor={tokens.mutedText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="h-12 rounded-xl px-4"
                  style={{
                    color: tokens.text,
                    backgroundColor: isLiquid ? glass.background : tokens.surface,
                    borderWidth: 1,
                    borderColor: tokens.surfaceBorder,
                  }}
                />
              </View>

              <View>
                <Text className="mb-2 text-sm" style={{ color: tokens.mutedText }}>
                  {t("loginPassword")}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("loginPasswordPlaceholder")}
                  placeholderTextColor={tokens.mutedText}
                  secureTextEntry
                  className="h-12 rounded-xl px-4"
                  style={{
                    color: tokens.text,
                    backgroundColor: isLiquid ? glass.background : tokens.surface,
                    borderWidth: 1,
                    borderColor: tokens.surfaceBorder,
                  }}
                />
              </View>
            </View>
          </ThemedCard>

          <Pressable
            disabled={loading}
            className="mt-6 h-14 items-center justify-center overflow-hidden rounded-2xl"
            style={{ opacity: loading ? 0.5 : 1 }}
            onPress={handleLogin}
          >
            <LinearGradient
              className="absolute inset-0"
              colors={isLiquid ? ["#203e60", "#6b9cc0", "#274561"] : [tokens.accent, tokens.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text className="text-base font-bold" style={{ color: "#fff" }}>
              {loading ? t("loggingIn") : t("loginButton")}
            </Text>
          </Pressable>

          <Pressable className="mt-4 items-center" onPress={() => router.push("/register")}>
            <Text style={{ color: tokens.accent, fontSize: 14 }}>
              {t("loginGoToRegister")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
