import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Switch, Text, TextInput, View } from "react-native";
import CommunitySlider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { appLog, clearLogs, getLogText } from "@/utils/logger";
import { useAccount } from "@/account";
import { languages, type Language, useI18n } from "@/i18n";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
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

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <View className="mt-9">
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
    <View className="mt-3 py-4">
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
    setBackgroundOpacity,
    setGlassOpacity,
    setUiScale,
  } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { profile } = useAccount();
  const [hex, setHex] = useState(preferences.customAccent ?? "");
  const [logPreview, setLogPreview] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  useEffect(() => setHex(preferences.customAccent ?? ""), [preferences.customAccent]);

  const apply = (value: string): void => {
    const next = value.trim().toUpperCase();
    setHex(next);
    if (validHex.test(next)) void setCustomAccent(next);
  };

  const styles: Record<UiStyle, string> = { native: t("styleNative"), liquid: t("styleLiquid"), miuix: t("styleMiuix") };
  const layouts: Record<PlayerLayout, string> = { vinyl: "歌词流动", immersive: "沉浸封面", minimal: "极简封面" };
  const miniStyles: Record<MiniPlayerStyle, string> = { full: "主题 1 · 完整栏", capsule: "主题 2 · 小胶囊" };
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
  const refreshLogs = async (): Promise<void> => {
    setLogLoading(true);
    try {
      const textValue = await getLogText();
      setLogPreview(textValue);
      appLog.info("settings", "logs refreshed", { length: textValue.length });
    } catch (error) {
      appLog.error("settings", "refresh logs failed", error);
      Alert.alert("日志", "读取日志失败");
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
      Alert.alert("日志", "分享日志失败");
    }
  };

  const onClearLogs = (): void => {
    Alert.alert("清空日志", "确定清空本地 App 日志？", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
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

        {/* Account */}
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
          <Row title="账号状态" hint={profile ? `${profile.displayName} · 本地账户资料已保存` : "尚未创建本地账户资料"}>
            <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => router.push("/onboarding")}>
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>编辑头像与昵称</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
            </Pressable>
          </Row>
          <Row title={t("musicService")} hint={profile?.musicSource === "netease" ? "网易云音乐已绑定" : profile?.musicSource === "bilibili" ? "哔哩哔哩已绑定" : "尚未绑定音乐服务"}>
            <Pressable
              className="mt-3 flex-row items-center justify-between"
              onPress={() => router.push("/sources")}
            >
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>{t("manageMusicService")}</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
            </Pressable>
          </Row>
          <Row title="服务器地址" hint={profile?.backendUrl || "尚未配置服务器"}>
            <Pressable className="mt-3 flex-row items-center justify-between" onPress={() => router.push("/onboarding")}>
              <Text style={{ color: tokens.accent, fontWeight: "800" }}>修改服务器地址</Text>
              <Text style={{ color: tokens.accent, fontSize: 20 }}>›</Text>
            </Pressable>
          </Row>
        </Section>

        {/* Appearance */}
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
              <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "800" }}>颜色效果预览</Text>
              <Text className="mt-1 text-xs" style={{ color: tokens.mutedText }}>强调文字、按钮、进度条和卡片边框会立即使用此颜色</Text>
              <View className="mt-3 flex-row items-center gap-3">
                <View className="h-10 flex-1 justify-center px-4" style={{ borderRadius: tokens.pillRadius, backgroundColor: validHex.test(hex) ? hex : tokens.accent }}>
                  <Text style={{ color: "#ffffff", fontWeight: "900", textAlign: "center" }}>播放按钮</Text>
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
            <View className="absolute right-0 top-6">
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

        {/* Player */}
        <Section title={t("playerSection")}>
          <Row title={t("playerLayout")}>
            <Segment options={playerLayouts} value={preferences.playerLayout} labels={layouts} onChange={(value) => void setPlayerLayout(value)} />
          </Row>
          <Row title="正在播放栏主题" hint="主题 1 为完整歌曲栏；主题 2 为更紧凑的小胶囊。">
            <Segment options={miniPlayerStyles} value={preferences.miniPlayerStyle} labels={miniStyles} onChange={(value) => void setMiniPlayerStyle(value)} />
          </Row>
        </Section>

        {/* Diagnostics */}
        <Section title="诊断日志">
          <Row title="App 日志" hint="记录启动、接口与播放链路；Cookie/Token 会自动脱敏。崩溃后可到这里查看或分享。">
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                onPress={() => void refreshLogs()}
              >
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 14 }}>{logLoading ? "读取中..." : "查看日志"}</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                onPress={() => void shareLogs()}
              >
                <Text style={{ color: tokens.accent, fontWeight: "800", fontSize: 14 }}>分享日志</Text>
              </Pressable>
            </View>
            <Pressable
              className="mt-3 items-center justify-center rounded-full py-3"
              style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
              onPress={onClearLogs}
            >
              <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 14 }}>清空日志</Text>
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