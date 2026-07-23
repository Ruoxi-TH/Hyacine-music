// 真液态玻璃视图（PixelCopy 背景捕获 + RenderEffect 自身模糊）
// 与 expo-liquid-glass（RenderEffect 应用在空 View 上等于透明）不同：
// 本模块在 onDraw 里画 PixelCopy 捕获的下层 bitmap，再由 RenderEffect 模糊"自身绘制内容"，
// 实现真玻璃模糊效果。仅 Android 平台渲染原生 View；其他平台返回普通 View 作为降级。

import { Platform, PixelRatio, View, type ViewProps } from "react-native";

export interface GlassBackdropProps extends ViewProps {
  /** 模糊半径（dp，内部转 px），默认 12 */
  blurRadius?: number;
  /** 玻璃 tint 色，rgba(...) 格式，默认 rgba(255,255,255,0.18) */
  tintColor?: string;
}

let NativeGlassBackdrop: any = null;
try {
  if (Platform.OS === "android") {
    const { requireNativeViewManager } = require("expo-modules-core") as {
      requireNativeViewManager: (name: string) => any;
    };
    NativeGlassBackdrop = requireNativeViewManager("ExpoGlassBackdrop");
  }
} catch {
  NativeGlassBackdrop = null;
}

const dpToPx = (dp: number): number => PixelRatio.getPixelSizeForLayoutSize(dp);

/**
 * 渲染真液态玻璃容器。
 *
 * 平台行为：
 * - Android 12+：PixelCopy 捕获下层 + RenderEffect 模糊（真玻璃）
 * - Android < 12 或 PixelCopy 连续失败：降级到半透明实色
 * - iOS / 其他平台：返回普通 View（透传 style 与子节点）
 *
 * 注意：本组件会持续进行 30fps 的 PixelCopy 捕获，建议仅在需要玻璃效果的
 * 关键控件（TabBar、MiniPlayer、Card）上使用，避免大量实例造成性能问题。
 */
export function GlassBackdrop(props: GlassBackdropProps): React.ReactElement {
  const {
    blurRadius = 12,
    tintColor = "rgba(255,255,255,0.18)",
    style,
    children,
    ...rest
  } = props;

  if (NativeGlassBackdrop) {
    return (
      <NativeGlassBackdrop
        blurRadius={dpToPx(blurRadius)}
        tintColor={tintColor}
        style={style}
        {...rest}
      >
        {children}
      </NativeGlassBackdrop>
    );
  }

  // 降级：纯 RN 模拟（iOS / 不支持的 Android）
  return (
    <View
      style={[
        {
          backgroundColor: tintColor,
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.55)",
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
