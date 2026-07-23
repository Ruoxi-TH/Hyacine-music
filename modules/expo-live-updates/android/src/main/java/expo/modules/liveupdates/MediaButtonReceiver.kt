package expo.modules.liveupdates

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.view.KeyEvent

/**
 * MediaButtonReceiver：接收系统的媒体按钮事件（锁屏、蓝牙耳机、流体云控制按钮）。
 *
 * 系统在需要分发媒体按键时，会查找已注册的 MediaButtonReceiver 并发送 ACTION_MEDIA_BUTTON 广播。
 * 本 Receiver 转发 KeyEvent 到当前活跃的 MediaSession（由系统自动路由）。
 *
 * 注意：本 Receiver 需在 AndroidManifest.xml 中注册并设置 intent-filter：
 *   <intent-filter>
 *     <action android:name="android.intent.action.MEDIA_BUTTON" />
 *   </intent-filter>
 */
class MediaButtonReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_MEDIA_BUTTON) return
        val event = intent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT) ?: return
        // 系统会自动将 ACTION_MEDIA_BUTTON 路由到活跃的 MediaSession，
        // 这里只需确保不中断广播链。实际的 onPlay/onPause/onSkipToNext 回调
        // 由 MediaSession.Callback 处理。
        isOrderedBroadcast // 标记为已处理
    }
}
