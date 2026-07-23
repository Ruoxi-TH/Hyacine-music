package expo.modules.glassbackdrop

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.util.Log
import android.view.View

private const val TAG = "GlassBackdropView"

/**
 * 液态玻璃视图（方案B：RenderEffect 模糊 View 自身半透明背景）
 *
 * 核心原理：
 * - 在 onDraw 中绘制一个半透明背景层（tintColor）
 * - 对 View 应用 RenderEffect.createBlurEffect 模糊"自身绘制的内容"
 * - RenderEffect 会模糊刚画的半透明背景，产生"玻璃质感"
 *
 * 与 PixelCopy 方案的区别：
 * - PixelCopy 方案：捕获 View 下层真实内容，模糊后叠加 → 真玻璃，但 30fps 捕获太卡
 * - 本方案：只模糊自身绘制的半透明背景 → 假玻璃，但零性能开销
 *
 * 实现分级：
 * - API 31+（Android 12）：RenderEffect 真模糊
 * - API < 31：降级到纯半透明背景（无模糊）
 *
 * 优点：
 * - 零性能开销（无需 PixelCopy，无需定时捕获）
 * - 无白色横条（tintColor 是半透明，不会覆盖内容）
 * - 视觉效果好（模糊的半透明背景看起来像玻璃）
 */
class GlassBackdropView(context: Context) : View(context) {

    // --- Props（由 Expo ViewManager 设置）---
    var blurRadiusPx: Float = 12f
        set(value) { field = value; updateRenderEffect() }
    var tintColorArgb: Int = 0x4DFFFFFF // rgba(255,255,255,0.3)
        set(value) { field = value; invalidate() }

    // --- 内部状态 ---
    private val tintPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    private val blurSupported: Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

    init {
        setWillNotDraw(false)
        setBackgroundColor(Color.TRANSPARENT)
        updateRenderEffect()
        Log.i(TAG, "init: blurSupported=$blurSupported sdk=${Build.VERSION.SDK_INT}")
    }

    /** 配置/更新 RenderEffect（API 31+）。blurRadius=0 时移除。 */
    private fun updateRenderEffect() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        if (blurRadiusPx <= 0f) {
            setRenderEffect(null)
        } else {
            setRenderEffect(
                RenderEffect.createBlurEffect(blurRadiusPx, blurRadiusPx, Shader.TileMode.CLAMP)
            )
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // 绘制半透明背景层（RenderEffect 会模糊这个层）
        tintPaint.color = tintColorArgb
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), tintPaint)
    }
}
