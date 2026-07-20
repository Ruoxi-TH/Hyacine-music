// 运行时真实请求地址来自用户填写的 backendUrl（见 src/utils/apiBase.ts / apiClient.ts）
// EXPO_PUBLIC_API_URL 仅作开发兜底，不会覆盖用户已保存的服务器地址。
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "";
export const DEMO_TRACK = {
  id: "demo-soundhelix-1",
  title: "Demo Session",
  artist: "Hyacine.music",
  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  artwork:
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80",
};
