package expo.modules.liquidglass

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.Shader.TileMode
import android.os.Build
import android.widget.FrameLayout
import androidx.core.graphics.withClip

/**
 * 液态玻璃视图容器。
 * 在 API 31+ 上对自身应用 RenderEffect 模糊背景；低版本降级为视觉模拟。
 *
 * 注：RenderEffect 只能模糊"该 View 自身绘制的内容"，无法直接模糊"位于该 View 下方的其他 View"。
 * 因此本视图同时承担两件事：
 *   1. 在背景层绘制半透明 tint 颜色（模拟玻璃质感）
 *   2. 应用 RenderEffect，使容器内子 View 的边缘与 tint 混合更自然
 *
 * 完整的真背景模糊需要上层 RN 通过 BlurView 包装实现；此视图提供 glass 质感与高光。
 */
class LiquidGlassView constructor(
    context: Context,
) : FrameLayout(context) {

    var blurRadius: Float = 24f
        set(value) { field = value; applyEffect(); invalidate() }
    var saturation: Float = 1.18f
        set(value) { field = value; applyEffect(); invalidate() }
    var brightness: Float = 1.05f
        set(value) { field = value; applyEffect(); invalidate() }
    var cornerRadius: Float = 28f
        set(value) { field = value; invalidate() }
    var tintColorString: String = "rgba(255,255,255,0.18)"
        set(value) { field = value; _tintColor = parseColor(value, default = 0x2EFFFFFF); invalidate() }
    var borderColorString: String = "rgba(255,255,255,0.55)"
        set(value) { field = value; _borderColor = parseColor(value, default = 0x8CFFFFFF.toInt()); invalidate() }
    var showHighlight: Boolean = true
        set(value) { field = value; invalidate() }

    private var _tintColor: Int = 0x2EFFFFFF
    private var _borderColor: Int = 0x8CFFFFFF.toInt()

    private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f
    }
    private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val innerBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 0.5f
    }

    init {
        setWillNotDraw(false)
        // 默认透明背景，让 RenderEffect 工作
        setBackgroundColor(Color.TRANSPARENT)
        applyEffect()
    }

    private fun applyEffect() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        try {
            // 模糊 + 饱和度 + 亮度，串联 RenderEffect
            val blur = RenderEffect.createBlurEffect(blurRadius, blurRadius, TileMode.DECAL)
            val sat = RenderEffect.createColorFilterEffect(
                android.graphics.ColorMatrixColorFilter(
                    android.graphics.ColorMatrix().apply { setSaturation(saturation) }
                )
            )
            val bright = RenderEffect.createColorFilterEffect(
                android.graphics.ColorMatrixColorFilter(
                    android.graphics.ColorMatrix(
                        floatArrayOf(
                            brightness, 0f, 0f, 0f, 0f,
                            0f, brightness, 0f, 0f, 0f,
                            0f, 0f, brightness, 0f, 0f,
                            0f, 0f, 0f, 1f, 0f
                        )
                    )
                )
            )
            // 串联：blur -> sat -> bright
            val chained = RenderEffect.createChainEffect(blur, RenderEffect.createChainEffect(sat, bright))
            setRenderEffect(chained)
        } catch (_: Throwable) {
            // 部分设备 RenderEffect 不支持链式，降级
            try {
                setRenderEffect(RenderEffect.createBlurEffect(blurRadius, blurRadius, TileMode.DECAL))
            } catch (_: Throwable) {
                // 完全不支持则不应用
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return super.onDraw(canvas)

        val rect = RectF(0f, 0f, w, h)
        val radius = cornerRadius.coerceAtLeast(0f)
        val path = Path().apply { addRoundRect(rect, radius, radius, Path.Direction.CW) }

        // 1. 玻璃底色（tint）
        bgPaint.color = _tintColor
        bgPaint.alpha = Color.alpha(_tintColor)
        canvas.withClip(path) {
            drawRect(rect, bgPaint)
        }

        // 2. 顶部高光（仅显示时绘制）
        if (showHighlight && h > 4f) {
            val highlightGradient = LinearGradient(
                0f, 0f, w, 0f,
                intArrayOf(0x00FFFFFF, 0xF2FFFFFF.toInt(), 0x00FFFFFF),
                floatArrayOf(0f, 0.5f, 1f),
                Shader.TileMode.CLAMP
            )
            highlightPaint.shader = highlightGradient
            val hlRect = RectF(radius * 0.4f, 0.5f, w - radius * 0.4f, 2.0f)
            canvas.withClip(path) {
                drawRoundRect(hlRect, 1f, 1f, highlightPaint)
            }
        }

        // 3. 外层边框
        borderPaint.color = _borderColor
        borderPaint.alpha = Color.alpha(_borderColor)
        canvas.drawRoundRect(
            RectF(0.75f, 0.75f, w - 0.75f, h - 0.75f),
            radius, radius, borderPaint
        )

        // 4. 内层细边框（模拟玻璃厚度）
        innerBorderPaint.color = 0x33FFFFFF
        canvas.drawRoundRect(
            RectF(1.5f, 1.5f, w - 1.5f, h - 1.5f),
            (radius - 0.75f).coerceAtLeast(0f),
            (radius - 0.75f).coerceAtLeast(0f),
            innerBorderPaint
        )
    }

    /** 解析 rgba(...) / #RRGGBB / #AARRGGBB 字符串。失败回退 default。 */
    private fun parseColor(value: String, default: Int): Int {
        return try {
            val trimmed = value.trim()
            if (trimmed.startsWith("rgba(") || trimmed.startsWith("rgb(")) {
                val inner = trimmed.substringAfter('(').substringBefore(')')
                val parts = inner.split(',').map { it.trim().toFloat() }
                val r = parts.getOrNull(0)?.toInt() ?: 255
                val g = parts.getOrNull(1)?.toInt() ?: 255
                val b = parts.getOrNull(2)?.toInt() ?: 255
                val a = parts.getOrNull(3) ?: 1f
                Color.argb((a.coerceIn(0f, 1f) * 255).toInt(), r, g, b)
            } else {
                Color.parseColor(trimmed)
            }
        } catch (_: Throwable) {
            default
        }
    }
}
