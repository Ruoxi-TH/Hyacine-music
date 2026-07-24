import { useEffect } from "react";
import { router } from "expo-router";
import { useAccount } from "@/account";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";

export default function IndexScreen(): React.JSX.Element {
  const { profile, serverUser, hydrated } = useAccount();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile || !profile.onboardingCompleted) {
      router.replace("/onboarding");
    } else if (!serverUser) {
      router.replace("/login");
    } else if (!profile.musicSources?.length) {
      router.replace("/sources");
    } else {
      router.replace("/(tabs)");
    }
  }, [hydrated, profile, serverUser]);

  if (!hydrated) return <AppLoadingScreen />;
  return <AppLoadingScreen />;
}