import { Platform } from "react-native";
import { appLog } from "@/utils/logger";
import { FluidCloud, type NowPlayingData } from "../../modules/expo-fluid-cloud/src";

let availabilityCache: boolean | null = null;

export async function isFluidCloudAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (availabilityCache !== null) return availabilityCache;
  try {
    availabilityCache = await FluidCloud.isAvailable();
  } catch (e) {
    appLog.info("fluid-cloud", "availability check failed", { error: String(e) });
    availabilityCache = false;
  }
  return availabilityCache;
}

/**
 * 推送歌曲信息到 OPPO 流体云（旧版 ContentProvider 兜底路径）。
 * ColorOS 14+ 上，流体云会自动读取活跃 MediaSession，此函数仅作为补充渠道，
 * 用于不支持自动渲染的设备。
 */
export async function updateFluidCloudNowPlaying(data: NowPlayingData): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!(await isFluidCloudAvailable())) return;
  try {
    await FluidCloud.updateNowPlaying({
      ...data,
      supportPlayPause: true,
      supportNext: true,
      supportPrev: true,
      supportSeek: true,
    });
  } catch (e) {
    appLog.warn("fluid-cloud", "updateNowPlaying failed", { error: String(e) });
  }
}

export async function removeFluidCloudNowPlaying(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!(await isFluidCloudAvailable())) return;
  try {
    await FluidCloud.removeNowPlaying();
  } catch (e) {
    appLog.warn("fluid-cloud", "removeNowPlaying failed", { error: String(e) });
  }
}
