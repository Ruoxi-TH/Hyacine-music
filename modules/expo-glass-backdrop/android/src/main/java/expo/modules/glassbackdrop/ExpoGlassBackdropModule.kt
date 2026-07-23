package expo.modules.glassbackdrop

import android.graphics.Color
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "ExpoGlassBackdropModule"

/**
 * Expo 模块定义：暴露 GlassBackdropView 给 React Native。
 *
 * 与 expo-liquid-glass 模块的区别：
 * - expo-liquid-glass：把 RenderEffect 应用在自身，但自身无绘制内容，模糊了"空"，等于透明
 * - expo-glass-backdrop：PixelCopy 捕获下层像素 → onDraw 画 bitmap → RenderEffect 模糊自身绘制（真玻璃）
 *
 * Props（单位均为 px，JS 端通过 PixelRatio.dpToPx 转换）：
 * - blurRadius: number（默认 12px）— 模糊半径
 * - tintColor: string（默认 rgba(255,255,255,0.18)）— 玻璃 tint 色
 */
class ExpoGlassBackdropModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoGlassBackdrop")

        View(GlassBackdropView::class) {
            Prop("blurRadius") { view: GlassBackdropView, value: Double ->
                view.blurRadiusPx = value.toFloat()
                Log.v(TAG, "Prop blurRadius=$value")
            }
            Prop("tintColor") { view: GlassBackdropView, value: String ->
                view.tintColorArgb = parseColor(value, default = 0x2EFFFFFF)
            }
        }
    }

    /** 解析 rgba(...) / rgb(...) / #RRGGBB / #AARRGGBB 字符串。失败回退 default。 */
    private fun parseColor(value: String, default: Int): Int {
        return try {
            val trimmed = value.trim()
            if (trimmed.startsWith("rgba(") || trimmed.startsWith("rgb(")) {
                val inner = trimmed.substringAfter('(').substringBefore(')')
                val parts = inner.split(',').map { it.trim().toFloat() }
                val r = parts.getOrElse(0) { 255f }.toInt().coerceIn(0, 255)
                val g = parts.getOrElse(1) { 255f }.toInt().coerceIn(0, 255)
                val b = parts.getOrElse(2) { 255f }.toInt().coerceIn(0, 255)
                val a = parts.getOrElse(3) { 1f }.coerceIn(0f, 1f)
                Color.argb((a * 255).toInt(), r, g, b)
            } else {
                Color.parseColor(trimmed)
            }
        } catch (_: Throwable) {
            default
        }
    }
}
