package expo.modules.liquidglass

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android 液态玻璃原生视图。
 *
 * 实现分级：
 * 1. API 31+（Android 12+）：使用 RenderEffect.createBlurEffect + ColorMatrix（饱和度+亮度）
 *    实现真正的背景模糊 + 颜色增强，视觉接近 Apple iOS Liquid Glass。
 * 2. API 29-30：降级到模拟玻璃 — 半透明白色叠层 + 渐变高光 + 边框。
 * 3. 低于 29：仅显示半透明背景（保留 minSdk=29 的最低支持）。
 *
 * 使用方式：在 RN 中作为 <LiquidGlassView> 组件，接受以下 props：
 *   - blurRadius: number (默认 24)
 *   - saturation: number (默认 1.18，模拟 iOS 饱和度提升)
 *   - brightness: number (默认 1.05，light 模式下提亮)
 *   - cornerRadius: number (默认 28)
 *   - tintColor: string (默认 rgba(255,255,255,0.18)，dark 模式建议传 rgba(0,0,0,0.25))
 *   - borderColor: string (默认 rgba(255,255,255,0.55))
 *   - showHighlight: boolean (默认 true，模拟顶部高光线)
 */
class ExpoLiquidGlassModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoLiquidGlass")

        View(LiquidGlassView::class) {
            Prop("blurRadius") { view: LiquidGlassView, value: Double ->
                view.blurRadius = value.toFloat()
            }
            Prop("saturation") { view: LiquidGlassView, value: Double ->
                view.saturation = value.toFloat()
            }
            Prop("brightness") { view: LiquidGlassView, value: Double ->
                view.brightness = value.toFloat()
            }
            Prop("cornerRadius") { view: LiquidGlassView, value: Double ->
                view.cornerRadius = value.toFloat()
            }
            Prop("tintColor") { view: LiquidGlassView, value: String ->
                view.tintColorString = value
            }
            Prop("borderColor") { view: LiquidGlassView, value: String ->
                view.borderColorString = value
            }
            Prop("showHighlight") { view: LiquidGlassView, value: Boolean ->
                view.showHighlight = value
            }
        }
    }
}
