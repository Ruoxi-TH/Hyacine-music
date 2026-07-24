import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";

const brandIcon = require("../assets/brand-icon.png");

export default function WelcomeScreen(): React.JSX.Element {
  const { profile, serverUser, hydrated } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";

  useEffect(() => {
    if (!hydrated) return;
    if (profile?.onboardingCompleted && serverUser && profile.musicSources?.length) {
      router.replace("/(tabs)");
    }
  }, [hydrated, profile, serverUser]);

  const handleContinue = () => {
    if (profile?.backendUrl) {
      router.replace("/login");
    } else {
      router.replace("/onboarding");
    }
  };

  return (
    <ThemedScreen>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-24 w-24 overflow-hidden rounded-[28px]" style={{ backgroundColor: "transparent" }}>
          <Image
            source={brandIcon}
            className="h-full w-full"
            contentFit="contain"
            style={{ backgroundColor: "transparent" }}
          />
        </View>

        <Text
          className="mt-8 text-center"
          style={{ color: tokens.text, fontSize: 42, fontWeight: "800" }}
        >
          {t("brandName")}
        </Text>
        <Text
          className="mt-3 text-center text-lg"
          style={{ color: tokens.mutedText }}
        >
          {t("welcomeSubtitle")}
        </Text>

        <Pressable
          className="mt-14 h-16 w-full items-center justify-center overflow-hidden rounded-3xl"
          style={{
            shadowColor: tokens.accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 8,
          }}
          onPress={handleContinue}
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
          <Text className="text-lg font-bold" style={{ color: "#fff" }}>
            {t("continue")}
          </Text>
        </Pressable>
      </View>
    </ThemedScreen>
  );
}