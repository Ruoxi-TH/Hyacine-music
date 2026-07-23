import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { NativeEventEmitter } from "react-native";
import type { Track } from "@/types/music";
import { appLog, summarizeUrl } from "@/utils/logger";
import { useAccount } from "@/account";
import { resolvePlayableTrack } from "@/services/musicApi";
import { useAudioPreferences } from "@/audioPreferences";
import { usePlayerStore } from "@/store/playerStore";
import type { MediaControlEvent } from "@/services/liveUpdates";

type PlayerModule = typeof import("@/services/player");

function loadPlayer(): Promise<PlayerModule> {
  return import("@/services/player");
}

interface UseAudioResult {
  playTrack: (track: Track) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipTrack: (direction: -1 | 1) => Promise<void>;
}

export function useAudio(): UseAudioResult {
  const { profile, getSourceCredential } = useAccount();
  const { quality } = useAudioPreferences();
  const playTrack = useCallback(async (track: Track) => {
    appLog.info("audio", "playTrack called", {
      trackId: track.id,
      title: track.title,
      url: summarizeUrl(track.url),
    });
    try {
      let playable = track;
      if (profile?.backendUrl && (track.id.startsWith("netease:") || track.id.startsWith("bilibili:"))) {
        const source = track.id.startsWith("netease:") ? "netease" : "bilibili";
        const cookie = await getSourceCredential(source);
        playable = await resolvePlayableTrack({ backendUrl: profile.backendUrl, track, cookie, quality });
      }
      await (await loadPlayer()).playTrack(playable);
    } catch (error) {
      appLog.error("audio", "playTrack failed", error);
      throw error;
    }
  }, [getSourceCredential, profile?.backendUrl, quality]);

  const togglePlayback = useCallback(async () => {
    appLog.info("audio", "togglePlayback");
    try {
      await (await loadPlayer()).togglePlayback();
    } catch (error) {
      appLog.error("audio", "togglePlayback failed", error);
      throw error;
    }
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    appLog.info("audio", "seekBy", { seconds });
    try {
      await (await loadPlayer()).seekBy(seconds);
    } catch (error) {
      appLog.error("audio", "seekBy failed", error);
      throw error;
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    appLog.info("audio", "seekTo", { seconds });
    await (await loadPlayer()).seekTo(seconds);
  }, []);

  const skipTrack = useCallback(async (direction: -1 | 1) => {
    const { queue, queueIndex, playMode, setQueue } = usePlayerStore.getState();
    if (queue.length < 2 || queueIndex < 0) return;
    const nextIndex = playMode === "shuffle"
      ? (() => { let index = queueIndex; while (index === queueIndex) index = Math.floor(Math.random() * queue.length); return index; })()
      : (queueIndex + direction + queue.length) % queue.length;
    const nextTrack = queue[nextIndex];
    setQueue(queue, nextTrack.id);
    await playTrack(nextTrack);
  }, [playTrack]);

  // 注册 MediaSession 控制事件回流：锁屏 / 流体云点击按钮时由原生层 emit
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let emitter: NativeEventEmitter | null = null;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void loadPlayer().then(() => {
      if (cancelled) return;
      try {
        const modules = require("expo-modules-core");
        const nativeModule = modules?.requireNativeModule?.("ExpoLiveUpdates");
        if (!nativeModule) return;
        emitter = new NativeEventEmitter(nativeModule);
        subscription = emitter.addListener("mediaControl", async (event: MediaControlEvent) => {
          appLog.info("audio", "mediaControl event", { action: event.action });
          try {
            const mod = await loadPlayer();
            switch (event.action) {
              case "play":
              case "pause":
                await mod.togglePlayback();
                break;
              case "stop":
                await mod.togglePlayback();
                break;
              case "next":
                await skipTrack(1);
                break;
              case "prev":
                await skipTrack(-1);
                break;
              case "seek":
                if (typeof event.position === "number") {
                  await mod.seekTo(event.position);
                  await mod.syncPlaybackStateNow?.();
                }
                break;
            }
          } catch (e) {
            appLog.warn("audio", "mediaControl handler failed", { error: String(e) });
          }
        });
      } catch (e) {
        appLog.warn("audio", "subscribe mediaControl failed", { error: String(e) });
      }
    });

    return () => {
      cancelled = true;
      try { subscription?.remove(); } catch {}
      subscription = null;
      emitter = null;
    };
  }, [skipTrack]);

  useEffect(() => {
    void loadPlayer().then(({ setPlaybackCompletionHandler }) => setPlaybackCompletionHandler(null));
  }, []);

  return { playTrack, togglePlayback, seekBy, seekTo, skipTrack };
}

export function useRegisterTrackResolver(): void {
  const { profile, getSourceCredential } = useAccount();
  const { quality } = useAudioPreferences();
  useEffect(() => {
    let cancelled = false;
    void loadPlayer().then(({ setTrackResolver }) => {
      if (cancelled) return;
      setTrackResolver(async (track: Track) => {
        if (profile?.backendUrl && (track.id.startsWith("netease:") || track.id.startsWith("bilibili:"))) {
          const source = track.id.startsWith("netease:") ? "netease" : "bilibili";
          const cookie = await getSourceCredential(source);
          return await resolvePlayableTrack({ backendUrl: profile.backendUrl, track, cookie, quality });
        }
        return track;
      });
    });
    return () => {
      cancelled = true;
      void loadPlayer().then(({ setTrackResolver }) => setTrackResolver(null));
    };
  }, [getSourceCredential, profile?.backendUrl, quality]);
}
