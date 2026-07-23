import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { apiBase } from "@/utils/apiBase";
import {
  getCaptcha,
  register,
  sendVerificationCode,
  setStoredToken,
} from "@/services/auth";
import { LIQUID_GLASS_COLORS } from "@/constants/liquidGlass";

export default function RegisterScreen(): React.JSX.Element {
  const { profile, updateProfile } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const glass = tokens.isLight ? LIQUID_GLASS_COLORS.light : LIQUID_GLASS_COLORS.dark;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [captchaModalVisible, setCaptchaModalVisible] = useState(false);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const showCaptchaModal = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert(t("registerError"), t("registerEmailRequired"));
      return;
    }
    if (!profile?.backendUrl) {
      Alert.alert(t("registerError"), t("registerBackendRequired"));
      return;
    }

    try {
      const captcha = await getCaptcha(profile.backendUrl);
      setCaptchaId(captcha.id);
      setCaptchaImage(captcha.image);
      setCaptchaInput("");
      setCaptchaModalVisible(true);
    } catch (error) {
      Alert.alert(t("registerError"), t("registerCaptchaError"));
    }
  }, [email, profile?.backendUrl, t]);

  const handleSendCode = useCallback(async () => {
    if (!captchaInput.trim()) {
      Alert.alert(t("registerError"), t("registerCaptchaRequired"));
      return;
    }

    setSendingCode(true);
    try {
      await sendVerificationCode(
        profile!.backendUrl,
        email.trim(),
        captchaId,
        captchaInput.toUpperCase()
      );
      setCaptchaModalVisible(false);
      setCountdown(60);
      Alert.alert(t("registerSuccess"), t("registerCodeSent"));
    } catch (error) {
      Alert.alert(
        t("registerError"),
        error instanceof Error ? error.message : t("registerCodeError")
      );
      const captcha = await getCaptcha(profile!.backendUrl);
      setCaptchaId(captcha.id);
      setCaptchaImage(captcha.image);
      setCaptchaInput("");
    } finally {
      setSendingCode(false);
    }
  }, [captchaInput, captchaId, email, profile, t]);

  const handleRegister = useCallback(async () => {
    if (!username.trim()) {
      Alert.alert(t("registerError"), t("registerUsernameRequired"));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t("registerError"), t("registerEmailRequired"));
      return;
    }
    if (!code.trim()) {
      Alert.alert(t("registerError"), t("registerCodeRequired"));
      return;
    }
    if (!password) {
      Alert.alert(t("registerError"), t("registerPasswordRequired"));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("registerError"), t("registerPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await register(
        profile!.backendUrl,
        username.trim(),
        email.trim(),
        password,
        code.trim()
      );
      await setStoredToken(result.token);
      await updateProfile({
        displayName: result.user.username,
        avatarUrl: "",
      });
      Alert.alert(t("registerSuccess"), t("registerWelcome"), [
        { text: t("continue"), onPress: () => router.replace("/sources") },
      ]);
    } catch (error) {
      Alert.alert(
        t("registerError"),
        error instanceof Error ? error.message : t("registerError")
      );
    } finally {
      setLoading(false);
    }
  }, [
    username,
    email,
    password,
    confirmPassword,
    code,
    profile?.backendUrl,
    updateProfile,
    t,
  ]);

  const goToLogin = useCallback(() => {
    router.push("/login");
  }, []);

  return (
    <ThemedScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 pb-10 pt-14"
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{ color: tokens.text, fontSize: 32, fontWeight: "800" }}
          >
            {t("registerTitle")}
          </Text>
          <Text
            className="mt-2 text-base"
            style={{ color: tokens.mutedText }}
          >
            {t("registerSubtitle")}
          </Text>

          <ThemedCard className="mt-8 p-5" style={{ borderRadius: 24 }}>
            <View className="gap-4">
              <View>
                <Text
                  className="mb-2 text-sm"
                  style={{ color: tokens.mutedText }}
                >
                  {t("registerUsername")}
                </Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t("registerUsernamePlaceholder")}
                  placeholderTextColor={tokens.mutedText}
                  autoCapitalize="none"
                  autoCorrect={false}
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
                <Text
                  className="mb-2 text-sm"
                  style={{ color: tokens.mutedText }}
                >
                  {t("registerEmail")}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("registerEmailPlaceholder")}
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
                <Text
                  className="mb-2 text-sm"
                  style={{ color: tokens.mutedText }}
                >
                  {t("registerCode")}
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder={t("registerCodePlaceholder")}
                    placeholderTextColor={tokens.mutedText}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 h-12 rounded-xl px-4"
                    style={{
                      color: tokens.text,
                      backgroundColor: isLiquid
                        ? "transparent"
                        : tokens.surface,
                      borderWidth: 1,
                      borderColor: tokens.surfaceBorder,
                    }}
                  />
                  <Pressable
                    disabled={countdown > 0 || sendingCode}
                    className="h-12 items-center justify-center rounded-xl px-4"
                    style={{
                      backgroundColor:
                        countdown > 0 || sendingCode
                          ? tokens.surface
                          : tokens.accent,
                      opacity: countdown > 0 || sendingCode ? 0.5 : 1,
                    }}
                    onPress={showCaptchaModal}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color:
                          countdown > 0 || sendingCode
                            ? tokens.mutedText
                            : "#fff",
                      }}
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : t("registerSendCode")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View>
                <Text
                  className="mb-2 text-sm"
                  style={{ color: tokens.mutedText }}
                >
                  {t("registerPassword")}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("registerPasswordPlaceholder")}
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

              <View>
                <Text
                  className="mb-2 text-sm"
                  style={{ color: tokens.mutedText }}
                >
                  {t("registerConfirmPassword")}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("registerConfirmPasswordPlaceholder")}
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
            onPress={handleRegister}
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
            <Text
              className="text-base font-bold"
              style={{ color: "#fff" }}
            >
              {loading ? t("registering") : t("registerButton")}
            </Text>
          </Pressable>

          <Pressable className="mt-4 items-center" onPress={goToLogin}>
            <Text style={{ color: tokens.accent, fontSize: 14 }}>
              {t("registerGoToLogin")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={captchaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptchaModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <ThemedCard className="w-4/5 p-5" style={{ borderRadius: 24 }}>
            <Text
              className="mb-4 text-center text-lg font-bold"
              style={{ color: tokens.text }}
            >
              {t("registerCaptchaTitle")}
            </Text>
            {captchaImage && (
              <Image
                className="h-28 w-full"
                source={{ uri: captchaImage }}
                resizeMode="contain"
              />
            )}
            <TextInput
              value={captchaInput}
              onChangeText={setCaptchaInput}
              placeholder={t("registerCaptchaPlaceholder")}
              placeholderTextColor={tokens.mutedText}
              autoCapitalize="characters"
              maxLength={4}
              className="mt-4 h-12 rounded-xl px-4 text-center text-lg"
              style={{
                color: tokens.text,
                backgroundColor: isLiquid ? glass.background : tokens.surface,
                borderWidth: 1,
                borderColor: tokens.surfaceBorder,
              }}
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 h-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: tokens.surface }}
                onPress={() => setCaptchaModalVisible(false)}
              >
                <Text style={{ color: tokens.mutedText }}>
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                disabled={sendingCode || captchaInput.length !== 4}
                className="flex-1 h-12 items-center justify-center overflow-hidden rounded-xl"
                style={{ opacity: sendingCode ? 0.5 : 1 }}
                onPress={handleSendCode}
              >
                <LinearGradient
                  className="absolute inset-0"
                  colors={[tokens.accent, tokens.accent]}
                />
                <Text className="font-bold" style={{ color: "#fff" }}>
                  {sendingCode ? t("working") : t("confirm")}
                </Text>
              </Pressable>
            </View>
          </ThemedCard>
        </View>
      </Modal>
    </ThemedScreen>
  );
}
