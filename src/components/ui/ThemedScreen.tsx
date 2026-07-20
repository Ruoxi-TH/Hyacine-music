import { View, type ViewProps } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedScreen } from "@/components/navigation/AnimatedScreen";
import { useTheme } from "@/theme";

interface ThemedScreenProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedScreen({ children, className = "", style, ...props }: ThemedScreenProps): React.JSX.Element {
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const isMiuix = preferences.uiStyle === "miuix";
  const hasCustomBg = Boolean(preferences.customBackgroundUri);
  const bgOpacity = Math.min(1, Math.max(0, preferences.backgroundOpacity));

  return (
    <View className={`flex-1 overflow-hidden ${className}`} style={[{ backgroundColor: tokens.background }, style]} {...props}>
      {hasCustomBg ? (
        <>
          <Image
            pointerEvents="none"
            source={{ uri: preferences.customBackgroundUri ?? undefined }}
            cachePolicy="none"
            contentFit="cover"
            blurRadius={28}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", opacity: bgOpacity * 0.7, transform: [{ scale: 1.08 }] }}
          />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: tokens.isLight ? "rgba(235,242,252,0.2)" : "rgba(5,10,18,0.28)" }} />
          <Image
            pointerEvents="none"
            source={{ uri: preferences.customBackgroundUri ?? undefined }}
            cachePolicy="none"
            contentFit="cover"
            contentPosition="center"
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", opacity: bgOpacity }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: tokens.isLight
                ? `rgba(244,248,255,${(1 - bgOpacity) * 0.22})`
                : `rgba(8,12,22,${(1 - bgOpacity) * 0.24})`,
            }}
          />
        </>
      ) : null}

      {isLiquid && !hasCustomBg ? (
        <>
          <LinearGradient
            pointerEvents="none"
            className="absolute inset-0"
            colors={
              tokens.isLight
                ? ["#cfe5ff", "#f5f8ff", "#d9ecff", "#f8f4ff"]
                : [tokens.background, "#162745", "#151a33", tokens.backgroundSecondary]
            }
            locations={[0, 0.34, 0.68, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            pointerEvents="none"
            className="absolute inset-0"
            colors={[`${tokens.accent}38`, "#ffffff00", "#8bd5ff24", "#ffffff10"]}
            locations={[0, 0.36, 0.72, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </>
      ) : null}

      {/* Custom wallpaper remains unmasked in liquid mode. */}

      {isMiuix && !hasCustomBg ? (
        <LinearGradient
          pointerEvents="none"
          className="absolute inset-0"
          colors={tokens.isLight ? ["#f7f7f8", "#f1f2f4"] : [tokens.background, tokens.backgroundSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      ) : null}

      <AnimatedScreen>
        <View className="flex-1">
          {children}
        </View>
      </AnimatedScreen>
    </View>
  );
}