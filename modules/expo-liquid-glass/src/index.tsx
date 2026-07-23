// Android 液态玻璃视图（RenderEffect + Apple Liquid Glass 视觉风格）
// 仅 Android 平台渲染原生 View；其他平台返回普通 View 作为降级。
// 使用 require 而非 import，避免在未安装 expo-modules-core 类型的环境（如 CI）下报 TS2307。

import { Platform, View, type ViewProps } from "react-native";

export interface LiquidGlassViewProps extends ViewProps {
  blurRadius?: number;
  saturation?: number;
  brightness?: number;
  cornerRadius?: number;
  tintColor?: string;
  borderColor?: string;
  showHighlight?: boolean;
}

let NativeGlass: any = null;
try {
  if (Platform.OS === "android") {
    // 运行时加载，类型由调用处兜底为 any
    const { requireNativeViewManager } = require("expo-modules-core") as {
      requireNativeViewManager: (name: string) => any;
    };
    NativeGlass = requireNativeViewManager("ExpoLiquidGlass");
  }
} catch {
  NativeGlass = null;
}

/**
 * 渲染液态玻璃容器。
 * - Android 12+：使用 RenderEffect 真模糊 + 饱和度/亮度 ColorMatrix
 * - Android 10/11：降级到玻璃 tint + 顶部高光 + 双层边框
 * - 其他平台：返回普通 View（透传 style 与子节点）
 */
export function LiquidGlassView(props: LiquidGlassViewProps): React.ReactElement {
  const {
    blurRadius = 24,
    saturation = 1.18,
    brightness = 1.05,
    cornerRadius = 28,
    tintColor = "rgba(255,255,255,0.18)",
    borderColor = "rgba(255,255,255,0.55)",
    showHighlight = true,
    style,
    children,
    ...rest
  } = props;

  if (NativeGlass) {
    return (
      <NativeGlass
        blurRadius={blurRadius}
        saturation={saturation}
        brightness={brightness}
        cornerRadius={cornerRadius}
        tintColor={tintColor}
        borderColor={borderColor}
        showHighlight={showHighlight}
        style={style}
        {...rest}
      >
        {children}
      </NativeGlass>
    );
  }

  // 降级：纯 RN 模拟（iOS / 不支持的 Android）
  return (
    <View
      style={[
        {
          backgroundColor: tintColor,
          borderRadius: cornerRadius,
          borderWidth: 1.5,
          borderColor,
          overflow: "hidden",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
