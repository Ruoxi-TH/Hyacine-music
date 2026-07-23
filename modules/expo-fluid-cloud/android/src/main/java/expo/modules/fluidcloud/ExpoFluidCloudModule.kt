package expo.modules.fluidcloud

import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.URL

private const val TAG = "ExpoFluidCloud"

/**
 * OPPO Fluid Cloud（流体云）原生桥接。
 *
 * 实现策略（基于官方文档）：
 * 1. ColorOS 14+ 系统会自动读取活跃的 MediaSession 渲染音乐卡片，
 *    故 ColorOS 14+ 设备不需要走 shareintent 路径，仅需保证 MediaSession（expo-live-updates）工作正常。
 * 2. 对于 ColorOS 13 及以下或不支持音乐模板的设备，回退到旧版 ContentProvider 接口：
 *    - content://com.oppo.fluidCloud.provider/shareintent  - 创卡/刷新
 *    - content://com.oppo.fluidCloud.provider/deleteintent - 销卡
 *    - content://com.oppo.fluidCloud.provider/queryfeature - 探测能力
 * 3. 旧版路径下，控制按钮通过 PendingIntent 以广播形式发到 FluidCloudControlReceiver，
 *    Receiver 再通过 setMediaController 把按键事件分发到活跃的 MediaSession（OPPO 官方推荐路径）。
 * 4. 进度自驱动：原生 Handler 每 500ms 推进一次进度，避免 JS 限流导致进度条跳变。
 * 5. 封面下载、Base64 编码全部走 IO 线程，主线程只做 ContentValues 提交。
 */
class ExpoFluidCloudModule : Module() {
    private var templateId: String? = null
    private var lastProgress: Long = 0L
    private var lastDuration: Long = 0L
    private var lastIsPlaying: Boolean = false
    private var lastTickAt: Long = 0L
    private var coverBitmap: Bitmap? = null
    private var lastLyrics: String = ""
    private var lastTitle: String = ""
    private var lastArtist: String = ""
    private var lastAlbum: String = ""

    private val handler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val progressTicker = object : Runnable {
        override fun run() {
            try {
                // 移除 lastDuration > 0L 守卫：只要在播放就推进进度，
                // duration 为 0 时由系统自行处理（不显示进度条），但仍推送卡片
                if (lastIsPlaying && isAvailable) {
                    val now = SystemClock.elapsedRealtime()
                    if (lastTickAt > 0L) {
                        lastProgress += (now - lastTickAt)
                        if (lastDuration > 0L && lastProgress > lastDuration) {
                            lastProgress = lastDuration
                        }
                    }
                    lastTickAt = now
                    pushCardInternal(useCoverCache = true)
                }
            } catch (t: Throwable) {
                Log.w(TAG, "ticker exception: ${t.message}")
                // ticker 不可中断
            }
            handler.postDelayed(this, 500L)
        }
    }

    private var availabilityCache: Boolean? = null

    private val isAvailable: Boolean
        get() = availabilityCache == true

    override fun definition() = ModuleDefinition {
        Name("ExpoFluidCloud")

        Events("fluidCloudControl")

        // 探测设备是否支持流体云音乐模板
        AsyncFunction("isAvailable") { promise: Promise ->
            try {
                val ctx = appContext.reactContext ?: throw Exception("No React context")
                val result = queryAvailability(ctx)
                availabilityCache = result
                Log.i(TAG, "isAvailable query result: $result")
                promise.resolve(result)
            } catch (e: Exception) {
                Log.w(TAG, "isAvailable exception: ${e.message}")
                availabilityCache = false
                promise.resolve(false)
            }
        }

        // 创建/刷新流体云卡片
        // 字段：title / artist / album / coverUrl / progress / duration / isPlaying / lyrics
        AsyncFunction("updateNowPlaying") { data: Map<String, Any?>, promise: Promise ->
            try {
                val ctx = appContext.reactContext ?: throw Exception("No React context")

                // 若系统不支持流体云，直接返回
                if (availabilityCache == null) {
                    availabilityCache = queryAvailability(ctx)
                    Log.i(TAG, "updateNowPlaying: lazy availability=$availabilityCache")
                }
                if (availabilityCache != true) {
                    Log.w(TAG, "updateNowPlaying: fluid cloud not available, skip push")
                    promise.resolve(null)
                    return@AsyncFunction
                }

                lastTitle = data["title"] as? String ?: lastTitle
                lastArtist = data["artist"] as? String ?: lastArtist
                lastAlbum = data["album"] as? String ?: lastAlbum
                lastIsPlaying = data["isPlaying"] as? Boolean ?: lastIsPlaying
                lastProgress = (data["progress"] as? Number)?.toLong() ?: lastProgress
                lastDuration = (data["duration"] as? Number)?.toLong() ?: lastDuration
                val lyrics = data["lyrics"] as? String
                if (!lyrics.isNullOrEmpty()) lastLyrics = lyrics

                lastTickAt = if (lastIsPlaying) SystemClock.elapsedRealtime() else 0L

                Log.i(TAG, "updateNowPlaying: title=$lastTitle artist=$lastArtist progress=$lastProgress dur=$lastDuration playing=$lastIsPlaying")

                // 启动 ticker（仅一次）
                handler.removeCallbacks(progressTicker)
                handler.post(progressTicker)

                // 封面异步处理
                val coverUrl = data["coverUrl"] as? String
                if (!coverUrl.isNullOrEmpty()) {
                    scope.launch {
                        coverBitmap = downloadBitmap(coverUrl)
                        Log.i(TAG, "updateNowPlaying: cover downloaded=${coverBitmap != null}")
                        pushCardInternal(useCoverCache = true)
                    }
                } else {
                    pushCardInternal(useCoverCache = false)
                }

                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "updateNowPlaying exception: ${e.message}", e)
                promise.reject(CodedException("ERR_FLUID_CLOUD", e.message, e))
            }
        }

        // 销毁流体云卡片
        AsyncFunction("removeNowPlaying") { promise: Promise ->
            try {
                Log.i(TAG, "removeNowPlaying: templateId=$templateId")
                handler.removeCallbacks(progressTicker)
                val ctx = appContext.reactContext
                templateId?.let { id ->
                    if (ctx != null) {
                        try {
                            val deleted = ctx.contentResolver.delete(
                                Uri.parse(DELETE_INTENT_URI),
                                "templateId = ?",
                                arrayOf(id)
                            )
                            Log.i(TAG, "removeNowPlaying: delete rows=$deleted")
                        } catch (t: Throwable) {
                            Log.w(TAG, "removeNowPlaying: delete exception: ${t.message}")
                            // 销卡失败不影响主流程
                        }
                    }
                }
                templateId = null
                coverBitmap?.recycle()
                coverBitmap = null
                lastLyrics = ""
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "removeNowPlaying exception: ${e.message}", e)
                promise.reject(CodedException("ERR_FLUID_CLOUD_REMOVE", e.message, e))
            }
        }

        OnDestroy {
            handler.removeCallbacks(progressTicker)
            try { coverBitmap?.recycle() } catch (_: Throwable) {}
            coverBitmap = null
        }
    }

    private fun queryAvailability(ctx: Context): Boolean {
        return try {
            val cursor = ctx.contentResolver.query(
                Uri.parse(QUERY_FEATURE_URI),
                null,
                "music_playback",
                null,
                null
            )
            val available = cursor != null && cursor.count > 0
            cursor?.close()
            Log.i(TAG, "queryAvailability: cursor!=null=${cursor != null} count=${cursor?.count ?: -1} available=$available")
            available
        } catch (t: Throwable) {
            Log.w(TAG, "queryAvailability exception: ${t.message}")
            false
        }
    }

    private fun pushCardInternal(@Suppress("UNUSED_PARAMETER") useCoverCache: Boolean) {
        val ctx = appContext.reactContext ?: return
        if (availabilityCache != true) return

        try {
            val values = ContentValues()

            // 模板类型与场景
            values.put("templateType", "music_playback")
            values.put("sceneType", "music_playback")
            if (templateId == null) {
                templateId = "hyacine_music_${System.currentTimeMillis()}"
            }
            values.put("templateId", templateId)

            // 应用来源信息（系统识别来源、点击跳转）
            values.put("packageName", ctx.packageName)
            values.put("targetActivity", "${ctx.packageName}.MainActivity")

            // 核心信息
            values.put("title", lastTitle)
            values.put("artist", lastArtist)
            if (lastAlbum.isNotEmpty()) {
                values.put("summary", lastAlbum)
            }
            values.put("isPlaying", if (lastIsPlaying) 1 else 0)

            // 进度（毫秒）
            if (lastDuration > 0L) {
                values.put("progress", lastProgress)
                values.put("duration", lastDuration)
            }

            // 封面（Base64 JPEG）
            coverBitmap?.let { bmp ->
                try {
                    val stream = ByteArrayOutputStream()
                    bmp.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                    val base64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                    values.put("cover", base64)
                } catch (_: Throwable) {
                    // 编码失败忽略
                }
            }

            // 歌词
            if (lastLyrics.isNotEmpty()) {
                values.put("lyrics", lastLyrics)
            }

            // 控制按钮：使用 PendingIntent.getBroadcast 发送到 FluidCloudControlReceiver，
            // Receiver 再通过 MediaSession.dispatchMediaButtonEvent 转发到活跃的 MediaSession（OPPO 官方推荐）。
            putControlPendingIntent(values, ctx, ACTION_PLAY, "supportPlayPause", "playIntent")
            putControlPendingIntent(values, ctx, ACTION_PAUSE, "supportPause", "pauseIntent")
            putControlPendingIntent(values, ctx, ACTION_NEXT, "supportNext", "nextIntent")
            putControlPendingIntent(values, ctx, ACTION_PREV, "supportPrev", "prevIntent")
            // Seek 仍声明 supportSeek=1，系统会通过 MediaSession 回调处理
            values.put("supportSeek", 1)

            // 通知权限标志
            values.put("enableFloat", 1)

            val result = ctx.contentResolver.insert(Uri.parse(SHARE_INTENT_URI), values)
            Log.i(TAG, "pushCard: templateId=$templateId progress=$lastProgress dur=$lastDuration playing=$lastIsPlaying coverSize=${coverBitmap?.width ?: 0}x${coverBitmap?.height ?: 0} insertResult=$result")
        } catch (t: Throwable) {
            Log.w(TAG, "pushCard exception: ${t.message}", t)
            // 推送失败不影响播放
        }
    }

    /**
     * 构造控制按钮的 PendingIntent 并放入 ContentValues。
     *
     * OPPO ContentProvider 要求 playIntent/pauseIntent 等字段为 Intent 的 URI 字符串
     * （Intent.toUri(Intent.URI_INTENT_SCHEME) 格式），系统点击按钮时解析此 URI 触发广播。
     * 由 FluidCloudControlReceiver 转发到 MediaSession。
     */
    private fun putControlPendingIntent(
        values: ContentValues,
        ctx: Context,
        action: String,
        supportKey: String,
        intentKey: String,
    ) {
        try {
            values.put(supportKey, 1)
            val intent = Intent(action).apply {
                setClassName(ctx.packageName, "expo.modules.fluidcloud.FluidCloudControlReceiver")
                putExtra(EXTRA_TEMPLATE_ID, templateId)
            }
            // OPPO 要求 Intent URI 字符串格式（content://...?intent=...）
            values.put(intentKey, intent.toUri(Intent.URI_INTENT_SCHEME))
        } catch (_: Throwable) {
            // 构造失败仅声明 support 标志
        }
    }

    private suspend fun downloadBitmap(url: String): Bitmap? = withContext(Dispatchers.IO) {
        try {
            val stream = if (url.startsWith("file://") || url.startsWith("content://")) {
                val ctx = appContext.reactContext ?: return@withContext null
                ctx.contentResolver.openInputStream(Uri.parse(url))
            } else {
                URL(url).openConnection().getInputStream()
            }
            stream?.use { BitmapFactory.decodeStream(it) }
        } catch (_: Throwable) {
            null
        }
    }

    companion object {
        private const val FLUID_CLOUD_AUTHORITY = "com.oppo.fluidCloud.provider"
        private const val SHARE_INTENT_URI = "content://$FLUID_CLOUD_AUTHORITY/shareintent"
        private const val DELETE_INTENT_URI = "content://$FLUID_CLOUD_AUTHORITY/deleteintent"
        private const val QUERY_FEATURE_URI = "content://$FLUID_CLOUD_AUTHORITY/queryfeature"

        // 控制按钮广播 Action
        const val ACTION_PLAY = "com.hyacine.music.FLUID_CLOUD_PLAY"
        const val ACTION_PAUSE = "com.hyacine.music.FLUID_CLOUD_PAUSE"
        const val ACTION_NEXT = "com.hyacine.music.FLUID_CLOUD_NEXT"
        const val ACTION_PREV = "com.hyacine.music.FLUID_CLOUD_PREV"

        const val ACTION_FLUID_CLOUD_CONTROL = "com.hyacine.music.FLUID_CLOUD_CONTROL"
        const val EXTRA_CONTROL_ACTION = "control_action"
        const val EXTRA_TEMPLATE_ID = "template_id"
    }
}
