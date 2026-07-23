import { Platform, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";
import { GlassBackdrop } from "../../../modules/expo-glass-backdrop/src";

interface LiquidControlSurfaceProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  /** 圆角；默认与全局 tokens 保持一致。 */
  cornerRadius?: number;
}

/**
 * 液态玻璃控制容器。
 *
 * 平台策略：
 * - Android + liquid 模式：GlassBackdrop（backdrop 库 + PixelCopy 真玻璃）
 * - iOS + liquid 模式：使用 expo-blur 的 BlurView（系统级高斯模糊）
 * - 非 liquid 模式：普通 surface
 */
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

  // iOS：系统 BlurView
  if (Platform.OS === "ios") {
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
          },
          style,
        ]}
        {...props}
      >
        <BlurView
          pointerEvents="none"
          intensity={28}
          tint={tokens.isLight ? "light" : "dark"}
          className="absolute inset-0"
          style={{ backgroundColor: "transparent" }}
        />
        <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-px" style={{ backgroundColor: "#ffffffaa" }} />
        {children}
      </View>
    );
  }

  // Android：真玻璃 backdrop（PixelCopy + backdrop 库）
  const darkMode = !tokens.isLight;
  return (
    <View
      className={`overflow-hidden border ${className}`}
      style={[
        {
          backgroundColor: "transparent",
          borderColor: darkMode ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)",
          borderRadius: radius,
          shadowColor: "#24364f",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
      {...props}
    >
      <GlassBackdrop
        pointerEvents="none"
        blurRadius={16}
        tintColor={darkMode ? "rgba(28,30,38,0.55)" : "rgba(248,250,252,0.55)"}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-px" style={{ backgroundColor: darkMode ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.88)" }} />
      {children}
    </View>
  );
}
