import * as SecureStore from "expo-secure-store";
import type { Track } from "@/types/music";

const STORAGE_KEY = "hyacine.listening-history";
const MAX_ITEMS = 30;

export async function loadListeningHistory(): Promise<Track[]> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as Track[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function recordListeningHistory(track: Track): Promise<void> {
  const history = await loadListeningHistory();
  const next = [track, ...history.filter((item) => item.id !== track.id)].slice(0, MAX_ITEMS);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
}
