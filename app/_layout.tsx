import "../global.css";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { MiniPlayer } from "@/components/Player/MiniPlayer";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { AccountProvider, useAccount } from "@/account";
import { I18nProvider } from "@/i18n";
import { ThemeProvider } from "@/theme";
import { AudioPreferencesProvider } from "@/audioPreferences";
import { appLog, bootMeta, installGlobalErrorHandlers } from "@/utils/logger";
import { useEffect } from "react";
import { useRegisterTrackResolver } from "@/hooks/useAudio";

cssInterop(Image, { className: "style" });

const stackAnimation = {
  headerShown: false as const,
  animation: "slide_from_right" as const,
  animationDuration: 280,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationTypeForReplace: "push" as const,
};

function AppNavigator(): React.JSX.Element {
  const { hydrated, profile } = useAccount();
  const pathname = usePathname();
  useRegisterTrackResolver();
  const showMiniPlayer = !pathname.startsWith("/settings") && !pathname.startsWith("/player/") && pathname !== "/admin" && pathname !== "/queue";

  useEffect(() => {
    if (!hydrated) return;
    appLog.info("boot", "account hydrated", {
      hasProfile: Boolean(profile),
      onboardingCompleted: profile?.onboardingCompleted === true,
      musicSource: profile?.musicSources ?? null,
      backendHost: profile?.backendUrl
        ? profile.backendUrl.replace(/^https?:\/\//i, "").split("/")[0]
        : null,
    });
  }, [hydrated, profile]);

  if (!hydrated) return <AppLoadingScreen />;
  if (!profile || !profile.onboardingCompleted) {
    return (
      <Stack screenOptions={{ ...stackAnimation, animation: "fade" }}>
        <Stack.Screen name="onboarding" />
      </Stack>
    );
  }
  if (!profile?.musicSources?.length) {
    return (
      <Stack screenOptions={{ ...stackAnimation, animation: "fade_from_bottom" }}>
        <Stack.Screen name="sources" />
      </Stack>
    );
  }
  return (
    <>
      <Stack screenOptions={stackAnimation}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="sources" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "card",
            animation: "slide_from_right",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="player/[id]"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            animationDuration: 320,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
      </Stack>
      {showMiniPlayer ? <MiniPlayer /> : null}
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  useEffect(() => {
    installGlobalErrorHandlers();
    appLog.info("boot", "root layout mounted", bootMeta());
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <I18nProvider>
          <AudioPreferencesProvider>
            <AccountProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </AccountProvider>
          </AudioPreferencesProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
