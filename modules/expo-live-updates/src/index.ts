// 完整的 Android MediaSession 桥接。
// 与原生 expo-live-updates 模块配对使用。
export interface MediaMetadata {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  duration?: number;   // 秒
  trackId?: string;
  queueIndex?: number;
  queueLength?: number;
}

export interface PlaybackStateData {
  isPlaying: boolean;
  position: number;    // 秒
  duration?: number;   // 秒
  speed?: number;      // 默认 1
}

export interface QueueTrack {
  id: string;
  title: string;
  artist: string;
}

export type MediaControlAction =
  | "play"
  | "pause"
  | "stop"
  | "next"
  | "prev"
  | "seek";

export interface MediaControlEvent {
  action: MediaControlAction;
  position?: number;   // 仅 seek 时返回，单位秒
}

declare global {
  interface ExpoModules {
    ExpoLiveUpdates: {
      startSession(): Promise<void>;
      updateMetadata(data: MediaMetadata): Promise<void>;
      updatePlaybackState(data: PlaybackStateData): Promise<void>;
      setQueue(tracks: QueueTrack[], currentIndex: number): Promise<void>;
      setArtwork(url: string): Promise<void>;
      stopSession(): Promise<void>;
    };
  }
}

// 延迟加载原生模块，避免在不支持的平台上 import 时崩溃
let _native: any = null;
function getNative(): any {
  if (_native !== null) return _native;
  try {
    const r = require("expo-modules-core");
    _native = r?.requireNativeModule?.("ExpoLiveUpdates") ?? null;
  } catch {
    _native = null;
  }
  return _native;
}

export const LiveUpdates = {
  async startSession(): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    try { await mod.startSession(); } catch {}
  },

  async updateMetadata(data: MediaMetadata): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    // 将秒转换为 ms（原生侧用 ms）
    const payload: Record<string, any> = {
      title: data.title,
      artist: data.artist,
      album: data.album ?? "",
      artworkUrl: data.artworkUrl ?? "",
      duration: Math.max(0, Math.round((data.duration ?? 0) * 1000)),
    };
    if (data.trackId) payload.trackId = data.trackId;
    if (data.queueIndex !== undefined) payload.queueIndex = data.queueIndex;
    if (data.queueLength !== undefined) payload.queueLength = data.queueLength;
    try { await mod.updateMetadata(payload); } catch {}
  },

  async updatePlaybackState(data: PlaybackStateData): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    try {
      await mod.updatePlaybackState({
        isPlaying: data.isPlaying,
        position: Math.max(0, Math.round(data.position * 1000)),
        duration: Math.max(0, Math.round((data.duration ?? 0) * 1000)),
        speed: data.speed ?? 1,
      });
    } catch {}
  },

  async setQueue(tracks: QueueTrack[], currentIndex: number): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    try { await mod.setQueue(tracks, currentIndex); } catch {}
  },

  async setArtwork(url: string): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    try { await mod.setArtwork(url); } catch {}
  },

  async stopSession(): Promise<void> {
    const mod = getNative();
    if (!mod) return;
    try { await mod.stopSession(); } catch {}
  },
};
