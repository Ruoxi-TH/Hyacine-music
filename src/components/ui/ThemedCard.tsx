import { Platform, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";

interface ThemedCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedCard({ children, className = "", style, ...props }: ThemedCardProps): React.JSX.Element {
  const { preferences, tokens } = useTheme();
  const isMiuix = preferences.uiStyle === "miuix";
  const isLiquid = preferences.uiStyle === "liquid";

  return (
    <View
      className={`overflow-hidden border p-5 ${className}`}
      style={[
        {
          // Android elevation paints an opaque white plate under transparent views.
          backgroundColor: isLiquid ? "transparent" : tokens.surface,
          borderColor: isLiquid ? "#ffffff8c" : tokens.surfaceBorder,
          borderRadius: tokens.cardRadius,
          shadowColor: isLiquid ? "#31415f" : "#000000",
          shadowOpacity: isLiquid ? 0.08 : isMiuix ? 0.07 : 0,
          shadowRadius: isLiquid ? 10 : isMiuix ? 10 : 0,
          shadowOffset: { width: 0, height: isLiquid ? 4 : 4 },
          elevation: isLiquid ? 0 : isMiuix ? 2 : 0,
        },
        style,
      ]}
      {...props}
    >
      {isLiquid && Platform.OS === "ios" ? (
        <BlurView
          pointerEvents="none"
          className="absolute inset-0"
          intensity={48}
          tint={tokens.isLight ? "light" : "dark"}
          style={{ backgroundColor: "transparent" }}
        />
      ) : null}
      {isLiquid ? <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-px" style={{ backgroundColor: "#ffffff88" }} /> : null}
      {children}
    </View>
  );
}
