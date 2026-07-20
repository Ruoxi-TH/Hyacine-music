import { useCallback } from "react";
import type { Track } from "@/types/music";
import { appLog, summarizeUrl } from "@/utils/logger";

type PlayerModule = typeof import("@/services/player");

function loadPlayer(): Promise<PlayerModule> {
  return import("@/services/player");
}

interface UseAudioResult {
  playTrack: (track: Track) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
}

export function useAudio(): UseAudioResult {
  const playTrack = useCallback(async (track: Track) => {
    appLog.info("audio", "playTrack called", {
      trackId: track.id,
      title: track.title,
      url: summarizeUrl(track.url),
    });
    try {
      await (await loadPlayer()).playTrack(track);
    } catch (error) {
      appLog.error("audio", "playTrack failed", error);
      throw error;
    }
  }, []);

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

  return { playTrack, togglePlayback, seekBy };
}