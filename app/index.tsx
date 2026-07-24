import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";

export default function WelcomeScreen(): React.JSX.Element {
  const { profile } = useAccount();
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";

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
        <Text
          style={{ color: tokens.text, fontSize: 42, fontWeight: "800" }}
          className="text-center"
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
          className="mt-12 h-14 w-full items-center justify-center overflow-hidden rounded-2xl"
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
          <Text className="text-base font-bold" style={{ color: "#fff" }}>
            {t("continue")}
          </Text>
        </Pressable>
      </View>
    </ThemedScreen>
  );
}