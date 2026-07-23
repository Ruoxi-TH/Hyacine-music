import { Platform } from "react-native";
import { LiveUpdates, type MediaMetadata, type PlaybackStateData, type QueueTrack } from "../../modules/expo-live-updates/src";
import { appLog } from "@/utils/logger";

export type { MediaMetadata, PlaybackStateData, QueueTrack, MediaControlAction, MediaControlEvent } from "../../modules/expo-live-updates/src";

let isSessionStarted = false;

/**
 * 启动 MediaSession。幂等，重复调用安全。
 * ColorOS 14+ 的音乐流体云会自动读取此会话渲染卡片。
 */
export async function startLiveUpdatesSession(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (isSessionStarted) return;
  try {
    await LiveUpdates.startSession();
    isSessionStarted = true;
    appLog.info("live-updates", "session started");
  } catch (e) {
    appLog.warn("live-updates", "startSession failed", { error: String(e) });
  }
}

/** 同步歌曲元数据到锁屏 / 流体云。 */
export async function updateLiveUpdatesMetadata(data: MediaMetadata): Promise<void> {
  if (Platform.OS !== "android" || !isSessionStarted) return;
  try {
    await LiveUpdates.updateMetadata(data);
  } catch (e) {
    appLog.warn("live-updates", "updateMetadata failed", { error: String(e) });
  }
}

/** 同步播放状态（isPlaying / position / duration / speed）到锁屏 / 流体云。 */
export async function updateLiveUpdatesPlaybackState(data: PlaybackStateData): Promise<void> {
  if (Platform.OS !== "android" || !isSessionStarted) return;
  try {
    await LiveUpdates.updatePlaybackState(data);
  } catch (e) {
    appLog.warn("live-updates", "updatePlaybackState failed", { error: String(e) });
  }
}

/** 同步队列到锁屏（让锁屏显示"1/10"等）。 */
export async function updateLiveUpdatesQueue(tracks: QueueTrack[], currentIndex: number): Promise<void> {
  if (Platform.OS !== "android" || !isSessionStarted) return;
  try {
    await LiveUpdates.setQueue(tracks, currentIndex);
  } catch (e) {
    appLog.warn("live-updates", "setQueue failed", { error: String(e) });
  }
}

/** 切歌后异步刷新封面（避免每次都重新下载整个 metadata）。 */
export async function updateLiveUpdatesArtwork(url: string): Promise<void> {
  if (Platform.OS !== "android" || !isSessionStarted || !url) return;
  try {
    await LiveUpdates.setArtwork(url);
  } catch (e) {
    appLog.warn("live-updates", "setArtwork failed", { error: String(e) });
  }
}

export async function stopLiveUpdatesSession(): Promise<void> {
  if (Platform.OS !== "android" || !isSessionStarted) return;
  try {
    await LiveUpdates.stopSession();
    isSessionStarted = false;
    appLog.info("live-updates", "session stopped");
  } catch (e) {
    appLog.warn("live-updates", "stopSession failed", { error: String(e) });
  }
}

export function isLiveUpdatesActive(): boolean {
  return isSessionStarted;
}
