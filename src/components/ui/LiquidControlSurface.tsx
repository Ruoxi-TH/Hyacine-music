import { Platform, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";

interface LiquidControlSurfaceProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  cornerRadius?: number;
}

export function LiquidControlSurface({
  children,
  className = "",
  style,
  cornerRadius,
  ...props
}: LiquidControlSurfaceProps): React.JSX.Element {
  const { preferences, tokens } = useTheme();
  const liquid = preferences.uiStyle === "liquid";
  const radius = cornerRadius ?? 28;

  if (!liquid) {
    return (
      <View
        className={`overflow-hidden border ${className}`}
        style={[
          {
            backgroundColor: tokens.surfaceStrong,
            borderColor: tokens.surfaceBorder,
            borderRadius: radius,
            elevation: 0,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      className={`overflow-hidden border ${className}`}
      style={[
        {
          backgroundColor: "transparent",
          borderColor: "#ffffff8c",
          shadowColor: "#24364f",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          borderRadius: radius,
          elevation: 0,
        },
        style,
      ]}
      {...props}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          pointerEvents="none"
          intensity={28}
          tint={tokens.isLight ? "light" : "dark"}
          className="absolute inset-0"
          style={{ backgroundColor: "transparent" }}
        />
      ) : null}
      <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-px" style={{ backgroundColor: "#ffffffaa" }} />
      {children}
    </View>
  );
}