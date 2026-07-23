package expo.modules.fluidcloud

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent

private const val TAG = "FluidCloudCtrlReceiver"

/**
 * 接收 OPPO 流体云控制按钮点击事件，转发到活跃的 MediaSession。
 *
 * 工作流程（标准 Android 路径，无需特殊权限）：
 * 1. 用户点击流体云胶囊上的播放/暂停/上一首/下一首按钮
 * 2. 系统通过 PendingIntent 触发本 BroadcastReceiver
 * 3. 本 Receiver 构造 ACTION_MEDIA_BUTTON 广播 + KeyEvent
 * 4. sendBroadcast 到系统，Android 自动路由到活跃的 MediaSession
 *    （MediaSession.FLAG_HANDLES_MEDIA_BUTTONS 匹配）
 * 5. MediaSession.Callback（在 ExpoLiveUpdatesModule 中定义）回调 onPlay/onPause/onSkipToNext 等
 *
 * 注意：不再使用 MediaSessionManager.getActiveSessions(null)，
 * 该 API 需要 NotificationListenerService 或 MEDIA_CONTENT_CONTROL 权限，
 * 普通第三方应用调用会返回空列表或抛 SecurityException，导致按钮失效。
 */
class FluidCloudControlReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val action = intent.action ?: return
            Log.i(TAG, "onReceive: action=$action")

            // 根据广播 action 映射到 KeyEvent
            val keyCode = when (action) {
                ACTION_PLAY -> KeyEvent.KEYCODE_MEDIA_PLAY
                ACTION_PAUSE -> KeyEvent.KEYCODE_MEDIA_PAUSE
                ACTION_NEXT -> KeyEvent.KEYCODE_MEDIA_NEXT
                ACTION_PREV -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
                else -> {
                    Log.w(TAG, "onReceive: unknown action=$action, skip")
                    return
                }
            }

            // 构造一次按键按下+抬起事件
            val now = SystemClock.uptimeMillis()
            val downEvent = KeyEvent(now, now, KeyEvent.ACTION_DOWN, keyCode, 0)
            val upEvent = KeyEvent(now, now, KeyEvent.ACTION_UP, keyCode, 0)

            // 通过 ACTION_MEDIA_BUTTON 广播让系统自动路由到活跃 MediaSession
            // Android 系统会根据 FLAG_HANDLES_MEDIA_BUTTONS 匹配并分发
            val mediaButtonIntent = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
                setPackage(context.packageName)
                putExtra(Intent.EXTRA_KEY_EVENT, downEvent)
            }
            context.sendBroadcast(mediaButtonIntent)

            val mediaButtonIntentUp = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
                setPackage(context.packageName)
                putExtra(Intent.EXTRA_KEY_EVENT, upEvent)
            }
            context.sendBroadcast(mediaButtonIntentUp)
            Log.i(TAG, "onReceive: forwarded keyCode=$keyCode to MediaSession")
        } catch (t: Throwable) {
            Log.w(TAG, "onReceive exception: ${t.message}", t)
            // 转发失败不影响系统 UI
        }
    }
}

// 控制按钮广播 Action（与 ExpoFluidCloudModule 中保持一致）
private const val ACTION_PLAY = "com.hyacine.music.FLUID_CLOUD_PLAY"
private const val ACTION_PAUSE = "com.hyacine.music.FLUID_CLOUD_PAUSE"
private const val ACTION_NEXT = "com.hyacine.music.FLUID_CLOUD_NEXT"
private const val ACTION_PREV = "com.hyacine.music.FLUID_CLOUD_PREV"
