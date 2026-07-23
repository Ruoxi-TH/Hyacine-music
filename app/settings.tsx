import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Switch, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import CommunitySlider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { appLog, clearLogs, getLogText } from "@/utils/logger";
import { useAccount } from "@/account";
import { languages, type Language, useI18n } from "@/i18n";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { normalizeBackendUrl } from "@/utils/apiBase";
import {
  fontScales,
  listDensities,
  playerLayouts,
  miniPlayerStyles,
  presetAccents,
  themePresets,
  uiStyles,
  type FontScale,
  type ListDensity,
  type PlayerLayout,
  type MiniPlayerStyle,
  type UiStyle,
  useTheme,
} from "@/theme";

const quickColors = ["#7C3AED", "#EC4899", "#F97316", "#22C55E", "#06B6D4", "#3B82F6"];
const validHex = /^#[0-9A-Fa-f]{6}$/;
const customBackgroundPrefix = "hyacine-background";
const urlPattern = /^https?:\/\/[^\s]+$/i;

async function removePreviousCustomBackgrounds(currentUri: string): Promise<void> {
  if (!FileSystem.documentDirectory) return;

  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    await Promise.all(
      files
        .filter((file) => file.startsWith(customBackgroundPrefix))
        .map((file) => `${FileSystem.documentDirectory}${file}`)
        .filter((uri) => uri !== currentUri)
        .map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })),
    );
  } catch {
    // A cleanup failure must not prevent the selected wallpaper from applying.
  }
}
const languageLabels: Record<Language, string> = { "zh-CN": "简体中文", en: "English", ja: "日本語" };

function Segment<T extends string>({
  options,
  value,
  labels,
  onChange,
}: {
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (next: T) => void;
}): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <LiquidControlSurface className="mt-4 flex-row rounded-full p-1" style={{ borderRadius: 24 }}>
      {options.map((option) => (
        <Pressable
          key={option}
          className="h-10 flex-1 items-center justify-center"
          style={{ borderRadius: 20, backgroundColor: option === value ? `${tokens.text}18` : "transparent" }}
          onPress={() => onChange(option)}
        >
          <Text
            numberOfLines={1}
            style={{ color: option === value ? tokens.text : tokens.mutedText, fontSize: 13, fontWeight: "800" }}
          >
            {labels[option]}
          </Text>
        </Pressable>
      ))}
    </LiquidControlSurface>
  );
}

// Section 卡片：用带圆角背景的容器包裹，形成视觉分组
function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <View
      className="mt-6 overflow-hidden rounded-3xl p-5"
      style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
    >
      <Text className="text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <View className="mt-4 py-2">
      <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "800" }}>{title}</Text>
      {hint ? <Text className="mt-1 text-xs leading-5" style={{ color: tokens.mutedText }}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const {
    preferences,
    tokens,
    setCustomAccent,
    setFontScale,
    setListDensity,
    setMagicColorEnabled,
    setPlayerLayout,
    setMiniPlayerStyle,
    setPreset,
    setUiStyle,
    setCustomBackgroundUri,
    setLyricColors,
    setBackgroundOpacity,
    setGlassOpacity,
    setUiScale,
  } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { profile, serverUser, saveProfile } = useAccount();
  const [hex, setHex] = useState(preferences.customAccent ?? "");
  const [logPreview, setLogPreview] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // 展开式表单状态
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingServer, setEditingServer] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName ?? "");
  const [editAvatar, setEditAvatar] = useState(profile?.avatarUrl ?? "");
  const [editBackend, setEditBackend] = useState(profile?.backendUrl ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [serverSaving, setServerSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => setHex(preferences.customAccent ?? ""), [preferences.customAccent]);
  useEffect(() => {
    if (!editingProfile) {
      setEditName(profile?.displayName ?? "");
      setEditAvatar(profile?.avatarUrl ?? "");
    }
  }, [profile, editingProfile]);
  useEffect(() => {
    if (!editingServer) {
      setEditBackend(profile?.backendUrl ?? "");
      setServerError("");
    }
  }, [profile?.backendUrl, editingServer]);

  const apply = (value: string): void => {
    const next = value.trim().toUpperCase();
    setHex(next);
    if (validHex.test(next)) void setCustomAccent(next);
  };

  const styles: Record<UiStyle, string> = { native: t("styleNative"), liquid: t("styleLiquid"), miuix: t("styleMiuix") };
  const layouts: Record<PlayerLayout, string> = {
    vinyl: t("layoutVinyl"),
    minimal: t("layoutMinimal"),
    coverLyrics: t("layoutCoverLyrics"),
  };
  const miniStyles: Record<MiniPlayerStyle, string> = { full: t("theme1Full"), capsule: t("theme2Capsule") };
  const fonts: Record<FontScale, string> = { small: t("fontSmall"), medium: t("fontMedium"), large: t("fontLarge") };
  const densities: Record<ListDensity, string> = { compact: t("densityCompact"), comfortable: t("densityComfortable") };

  const pickBackground = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("permissionDenied"), t("permissionDeniedHint"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
    quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const sourceUri = result.assets[0].uri;
      const extension = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
      const targetUri = `${FileSystem.documentDirectory}${customBackgroundPrefix}-${Date.now()}.${extension}`;
      await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
      await setCustomBackgroundUri(targetUri);
      void removePreviousCustomBackgrounds(targetUri);
    }
  };

  const clearBackground = (): void => {
    setCustomBackgroundUri(null);
  };

  // 展开式表单：选择头像
  const chooseAvatarInline = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      const sourceUri = result.assets[0].uri;
      const extension = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
      const targetUri = `${FileSystem.documentDirectory}hyacine-avatar.${extension}`;
      await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
      setEditAvatar(targetUri);
    }
  };

  // 展开式表单：保存资料
  const saveProfileInline = async (): Promise<void> => {
    if (!editName.trim() || profileSaving) return;
    setProfileSaving(true);
    try {
      await saveProfile({
        displayName: editName.trim(),
        avatarUrl: editAvatar,
        backendUrl: profile?.backendUrl ?? "",
        musicSources: profile?.musicSources ?? [],
        onboardingCompleted: profile?.onboardingCompleted ?? true,
      });
      setEditingProfile(false);
    } catch (e) {
      appLog.error("settings", "save profile inline failed", e);
    } finally {
      setProfileSaving(false);
    }
  };

  // 展开式表单：保存服务器地址（含健康检查）
  const saveServerInline = async (): Promise<void> => {
    if (serverSaving) return;
    const trimmed = editBackend.trim();
    if (!urlPattern.test(trimmed)) {
      setServerError(t("backendConnectHint"));
      return;
    }
    setServerSaving(true);
    setServerError("");
    const normalizedBackend = normalizeBackendUrl(trimmed);
    const healthUrl = `${normalizedBackend}/api/v1/health`;
    try {
      const response = await fetch(healthUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await saveProfile({
        displayName: profile?.displayName ?? "",
        avatarUrl: profile?.avatarUrl ?? "",
        backendUrl: normalizedBackend,
        musicSources: profile?.musicSources ?? [],
        onboardingCompleted: profile?.onboardingCompleted ?? true,
      });
      setEditingServer(false);
    } catch (e) {
      const detail = e instanceof Error && e.message ? `（${e.message}）` : "";
      setServerError(`${t("backendConnectError")} ${healthUrl}${detail}。${t("backendConnectHint")}`);
    } finally {
      setServerSaving(false);
    }
  };

  const refreshLogs = async (): Promise<void> => {
    setLogLoading(true);
    try {
      const textValue = await getLogText();
      setLogPreview(textValue);
      appLog.info("settings", "logs refreshed", { length: textValue.length });
    } catch (error) {
      appLog.error("settings", "refresh logs failed", error);
      Alert.alert(t("logTitle"), t("logReadFailed"));
    } finally {
      setLogLoading(false);
    }
  };

  const shareLogs = async (): Promise<void> => {
    try {
      const textValue = await getLogText();
      await Share.share({ message: textValue, title: "Hyacine App Log" });
      appLog.info("settings", "logs shared", { length: textValue.length });
    } catch (error) {
      appLog.error("settings", "share logs failed", error);
      Alert.alert(t("logTitle"), t("logShareFailed"));
    }
  };

  const onClearLogs = (): void => {
    Alert.alert(t("clearLogTitle"), t("clearLogBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clear"),
        style: "destructive",
        onPress: () => {
          void clearLogs().then(async () => {
            appLog.info("settings", "logs cleared");
            setLogPreview(await getLogText());
          });
        },
      },
    ]);
  };

  return (
    <ThemedScreen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-16 pt-14"
      >
        {/* Back header */}
        <View className="flex-row items-center justify-between">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
            onPress={() => router.back()}
          >
            <Text style={{ color: tokens.text, fontSize: 30, lineHeight: 30 }}>‹</Text>
          </Pressable>
          <Text style={{ color: tokens.text, fontSize: 22, fontWeight: "800" }}>{t("settingsTitle")}</Text>
          <View className="w-11" />
        </View>

        {/* Account Section（卡片化） */}
        <Section title={t("accountSection")}>
          <Row title={t("language")}>
            <View className="mt-4 flex-row gap-2">
              {languages.map((item) => (
                <Pressable
                  key={item}
                  className="h-10 flex-1 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: language === item ? `${tokens.accent}22` : tokens.surface,
                    borderWidth: 1,
                    borderColor: language === item ? tokens.accent : tokens.surfaceBorder,
                  }}
                  onPress={() => void setLanguage(item)}
                >
                  <Text
                    numberOfLines={1}
                    style={{ color: language === item ? tokens.accent : tokens.text, fontSize: 12, fontWeight: "800" }}
                  >
                    {languageLabels[item]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>
          {serverUser?.role === "admin" ? (
            <Row title={t("adminConsole")} hint={t("adminConsoleHint")}>
              <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => router.push("/admin")}>
                <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("openAdminConsole")}</Text>
                <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
              </Pressable>
            </Row>
          ) : null}

          {/* 账号状态 + 展开式编辑表单 */}
          <Row title={t("accountStatus")} hint={profile ? `${profile.displayName} · ${t("accountSavedLocally")}` : t("noLocalAccount")}>
            <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => setEditingProfile((v) => !v)}>
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("editProfile")}</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>{editingProfile ? "⌄" : "›"}</Text>
            </Pressable>
            {editingProfile ? (
              <View className="mt-4 overflow-hidden rounded-2xl" style={{ backgroundColor: tokens.surfaceStrong, borderWidth: 1, borderColor: tokens.surfaceBorder }}>
                <View className="p-4">
                  <View className="flex-row items-center gap-4">
                    <Pressable className="h-16 w-16 overflow-hidden rounded-full" style={{ backgroundColor: `${tokens.accent}2a` }} onPress={() => void chooseAvatarInline()}>
                      {editAvatar ? (
                        <Image source={{ uri: editAvatar }} className="h-full w-full" />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Text style={{ color: tokens.accent, fontSize: 20, fontWeight: "900" }}>
                            {editName.trim().slice(0, 1).toUpperCase() || "H"}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable className="flex-1 items-center justify-center rounded-full py-3" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }} onPress={() => void chooseAvatarInline()}>
                      <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "700" }}>{t("changeAvatar")}</Text>
                    </Pressable>
                  </View>
                  <View className="mt-4 h-12 justify-center rounded-2xl px-4" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder={t("onboardingNamePlaceholder")}
                      placeholderTextColor={tokens.mutedText}
                      style={{ color: tokens.text, height: "100%", fontSize: 16, paddingVertical: 0 }}
                    />
                  </View>
                  {/* 保存按钮在表单底部 */}
                  <Pressable
                    className="mt-4 h-12 items-center justify-center rounded-full"
                    disabled={!editName.trim() || profileSaving}
                    style={{ backgroundColor: tokens.accent, opacity: !editName.trim() || profileSaving ? 0.5 : 1 }}
                    onPress={() => void saveProfileInline()}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                      {profileSaving ? t("saving") : t("secureSaveAndContinue")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Row>

          <Row title={t("musicService")} hint={profile?.musicSources.includes("netease") ? t("neteaseBound") : profile?.musicSources.includes("bilibili") ? t("bilibiliBound") : t("noMusicServiceBound")}>
            <Pressable
              className="mt-3 flex-row items-center justify-between"
              onPress={() => router.push("/sources")}
            >
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("manageMusicService")}</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
            </Pressable>
          </Row>

          {/* 服务器地址 + 展开式编辑表单 */}
          <Row title={t("serverAddress")} hint={profile?.backendUrl || t("noServerConfigured")}>
            <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => setEditingServer((v) => !v)}>
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("changeServerAddress")}</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>{editingServer ? "⌄" : "›"}</Text>
            </Pressable>
            {editingServer ? (
              <View className="mt-4 overflow-hidden rounded-2xl" style={{ backgroundColor: tokens.surfaceStrong, borderWidth: 1, borderColor: tokens.surfaceBorder }}>
                <View className="p-4">
                  <View className="h-12 justify-center rounded-2xl px-4" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: serverError || (editBackend && !urlPattern.test(editBackend)) ? "#ef4444" : tokens.surfaceBorder }}>
                    <TextInput
                      value={editBackend}
                      onChangeText={(v) => { setEditBackend(v); setServerError(""); }}
                      autoCapitalize="none"
                      keyboardType="url"
                      placeholder="https://music.example.com"
                      placeholderTextColor={tokens.mutedText}
                      style={{ color: tokens.text, height: "100%", fontSize: 16, paddingVertical: 0 }}
                    />
                  </View>
                  <Text className="mt-2 text-xs leading-5" style={{ color: serverError ? "#ef4444" : tokens.mutedText }}>
                    {serverError || t("onboardingBackendHint")}
                  </Text>
                  {/* 保存按钮在表单底部 */}
                  <Pressable
                    className="mt-3 h-12 items-center justify-center rounded-full"
                    disabled={serverSaving}
                    style={{ backgroundColor: tokens.accent, opacity: serverSaving ? 0.5 : 1 }}
                    onPress={() => void saveServerInline()}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                      {serverSaving ? t("saving") : t("secureSaveAndContinue")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Row>
        </Section>

        {/* Audio Section（卡片化） */}
        <Section title={t("audioSection")}>
          <Row title={t("audioQualityAndEffects")} hint={t("audioQualityHint")}>
            <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => router.push("/audio-settings")}>
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("openAudioSettings")}</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
            </Pressable>
          </Row>
        </Section>

        {/* Appearance Section（卡片化） */}
        <Section title={t("appearanceSection")}>
          <Row title={t("uiStyle")} hint={t("uiStyleHint")}>
            <Segment options={uiStyles} value={preferences.uiStyle} labels={styles} onChange={(value) => void setUiStyle(value)} />
          </Row>

          <Row title={t("themeColor")}>
            <View className="mt-4 flex-row justify-between">
              {themePresets.map((preset) => (
                <Pressable
                  key={preset}
                  className="items-center"
                  onPress={() => void setPreset(preset)}
                >
                  <View
                    className="h-11 w-11 rounded-full border-2"
                    style={{
                      backgroundColor: presetAccents[preset],
                      borderColor: preferences.preset === preset && preferences.customAccent === null ? tokens.text : "transparent",
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </Row>

          <Row title={t("customAccent")} hint={t("colorInputHint")}>
            <View className="mt-3 flex-row items-center gap-3">
              <View
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: validHex.test(hex) ? hex : tokens.accent }}
              />
              <LiquidControlSurface
                className="h-11 flex-1 rounded-full px-4"
                style={{ borderRadius: 22 }}
              >
                <TextInput
                  value={hex}
                  maxLength={7}
                  autoCapitalize="characters"
                  placeholder={t("colorInputPlaceholder")}
                  placeholderTextColor={tokens.mutedText}
                  onChangeText={apply}
                  style={{ color: tokens.text, height: "100%" }}
                />
              </LiquidControlSurface>
            </View>
            <View
              className="mt-4 overflow-hidden p-4"
              style={{ borderRadius: tokens.cardRadius, backgroundColor: validHex.test(hex) ? `${hex}18` : `${tokens.accent}18`, borderWidth: 1, borderColor: validHex.test(hex) ? hex : tokens.accent }}
            >
              <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "800" }}>{t("colorPreview")}</Text>
              <Text className="mt-1 text-xs" style={{ color: tokens.mutedText }}>{t("colorPreviewHint")}</Text>
              <View className="mt-3 flex-row items-center gap-3">
                <View className="h-10 flex-1 justify-center px-4" style={{ borderRadius: tokens.pillRadius, backgroundColor: validHex.test(hex) ? hex : tokens.accent }}>
                  <Text style={{ color: "#ffffff", fontWeight: "900", textAlign: "center" }}>{t("playButton")}</Text>
                </View>
                <View className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: `${tokens.text}20` }}>
                  <View className="h-full w-2/3 rounded-full" style={{ backgroundColor: validHex.test(hex) ? hex : tokens.accent }} />
                </View>
              </View>
            </View>
            <View className="mt-4 flex-row justify-between">
              {quickColors.map((color) => (
                <Pressable
                  key={color}
                  className="h-9 w-9 rounded-full"
                  style={{
                    backgroundColor: color,
                    borderWidth: 2,
                    borderColor: preferences.customAccent === color ? tokens.text : "transparent",
                  }}
                  onPress={() => apply(color)}
                />
              ))}
            </View>
          </Row>

          <Row title={t("magicColor")} hint={t("magicColorHint")}>
            <View className="absolute right-0 top-4">
              <Switch
                value={preferences.magicColorEnabled}
                trackColor={{ false: "#77859a", true: tokens.accent }}
                onValueChange={(value) => void setMagicColorEnabled(value)}
              />
            </View>
          </Row>

          {/* Custom Background */}
          <Row title={t("customBackground")} hint={t("customBackgroundHint")}>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                onPress={pickBackground}
              >
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 14 }}>{t("pickBackground")}</Text>
              </Pressable>
              {preferences.customBackgroundUri ? (
                <Pressable
                  className="flex-1 items-center justify-center rounded-full py-3"
                  style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                  onPress={clearBackground}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 14 }}>{t("clearBackground")}</Text>
                </Pressable>
              ) : null}
            </View>
          </Row>

          {/* Background Opacity */}
          <Row title={t("backgroundOpacity")} hint={t("backgroundOpacityHint")}>
            <View className="mt-4 flex-row items-center gap-3">
              <CommunitySlider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={preferences.backgroundOpacity}
                onValueChange={(val) => setBackgroundOpacity(val)}
                minimumTrackTintColor={tokens.accent}
                maximumTrackTintColor={tokens.surfaceBorder}
              />
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: "700", minWidth: 36, textAlign: "right" }}>
                {Math.round(preferences.backgroundOpacity * 100)}%
              </Text>
            </View>
          </Row>

          {/* Glass Opacity */}
          <Row title={t("glassOpacity")} hint={t("glassOpacityHint")}>
            <View className="mt-4 flex-row items-center gap-3">
              <CommunitySlider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={preferences.glassOpacity}
                onValueChange={(val) => setGlassOpacity(val)}
                minimumTrackTintColor={tokens.accent}
                maximumTrackTintColor={tokens.surfaceBorder}
              />
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: "700", minWidth: 36, textAlign: "right" }}>
                {Math.round(preferences.glassOpacity * 100)}%
              </Text>
            </View>
          </Row>
        </Section>

        {/* Player Section（卡片化） */}
        <Section title={t("playerSection")}>
          <Row title={t("playerLayout")}>
            <Segment options={playerLayouts} value={preferences.playerLayout} labels={layouts} onChange={(value) => void setPlayerLayout(value)} />
          </Row>
          <Row title={t("lyricColor")} hint={t("lyricColorHint")}>
            <View className="mt-4 flex-row gap-2">
              <Pressable className="h-10 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: "#1a0d18" }} onPress={() => void setLyricColors({ sung: "#1a0d18", current: tokens.accent, upcoming: "#ffffff" })}><Text style={{ color: "#ffffff", fontWeight: "800" }}>{t("defaultColor")}</Text></Pressable>
              <Pressable className="h-10 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: "#0f172a" }} onPress={() => void setLyricColors({ sung: "#0f172a", current: "#38bdf8", upcoming: "#f8fafc" })}><Text style={{ color: "#ffffff", fontWeight: "800" }}>{t("coolColor")}</Text></Pressable>
              <Pressable className="h-10 flex-1 items-center justify-center rounded-full" style={{ backgroundColor: "#4c0519" }} onPress={() => void setLyricColors({ sung: "#4c0519", current: "#fb7185", upcoming: "#fff1f2" })}><Text style={{ color: "#ffffff", fontWeight: "800" }}>{t("warmColor")}</Text></Pressable>
            </View>
            <Pressable className="mt-3 items-center py-2" onPress={() => void setLyricColors({ sung: null, current: null, upcoming: null })}><Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("resetSystemDefault")}</Text></Pressable>
          </Row>
          <Row title={t("miniPlayerTheme")} hint={t("miniPlayerThemeHint")}>
            <Segment options={miniPlayerStyles} value={preferences.miniPlayerStyle} labels={miniStyles} onChange={(value) => void setMiniPlayerStyle(value)} />
          </Row>
        </Section>

        {/* Diagnostics Section（卡片化） */}
        <Section title={t("diagnosticsLog")}>
          <Row title={t("appLogTitle")} hint={t("appLogHint")}>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                onPress={() => void refreshLogs()}
              >
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 14 }}>{logLoading ? t("readingLog") : t("viewLog")}</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                onPress={() => void shareLogs()}
              >
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 14 }}>{t("shareLog")}</Text>
              </Pressable>
            </View>
            <Pressable
              className="mt-3 items-center justify-center rounded-full py-3"
              style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
              onPress={onClearLogs}
            >
              <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 14 }}>{t("clearLog")}</Text>
            </Pressable>
            {logPreview ? (
              <LiquidControlSurface className="mt-4 rounded-3xl p-4" style={{ borderRadius: 24 }}>
                <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
                  <Text selectable style={{ color: tokens.mutedText, fontSize: 11, lineHeight: 16, fontFamily: "monospace" }}>
                    {logPreview}
                  </Text>
                </ScrollView>
              </LiquidControlSurface>
            ) : null}
          </Row>
        </Section>

      </ScrollView>
    </ThemedScreen>
  );
}
