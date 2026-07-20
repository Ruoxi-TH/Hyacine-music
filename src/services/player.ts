import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { usePlayerStore } from "@/store/playerStore";
import { recordListeningHistory } from "@/services/listeningHistory";
import type { Track } from "@/types/music";
import { appLog } from "@/utils/logger";

let player: AudioPlayer | null = null;
let modeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: true });
  modeReady = true;
}

function bindStatus(active: AudioPlayer): void {
  active.addListener("playbackStatusUpdate", (status) => {
    usePlayerStore.getState().setPlaying(status.playing);
    usePlayerStore.getState().setProgress(status.currentTime, status.duration || 0);
  });
}

export async function playTrack(track: Track): Promise<void> {
  if (!track.url) throw new Error("未获取到可播放的音频地址");
  await ensureAudioMode();
  try {
    player?.pause();
    player = createAudioPlayer(track.url);
    bindStatus(player);
    usePlayerStore.getState().setCurrentTrack(track);
    usePlayerStore.getState().setProgress(0, 0);
    player.play();
    player.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: track.artwork });
    await recordListeningHistory(track);
  } catch (error) {
    usePlayerStore.getState().setPlaying(false);
    appLog.error("player", "expo-audio playback failed", error);
    throw error instanceof Error ? error : new Error("无法播放此音频");
  }
}

export async function togglePlayback(): Promise<void> {
  if (!player) return;
  if (player.playing) player.pause(); else player.play();
}

export async function seekBy(seconds: number): Promise<void> {
  if (!player) return;
  await player.seekTo(Math.max(0, player.currentTime + seconds));
}