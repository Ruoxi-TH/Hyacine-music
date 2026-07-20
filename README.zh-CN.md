# 风堇音乐 · Hyacine Music

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja-JP.md)

Hyacine Music is a mobile client for the [Hyacine Server](https://github.com/Ruoxi-TH/hyacine-server) API, built with React Native + Expo and featuring an Android 10+ Jetpack Compose native navigation layer.

## Current version: 1.2.0

### Implemented

- **Huawei-style floating capsule navigation**: 3 tabs (Home / Music Hall / Me), active `#00A1FF`, inactive `#86909C`, right-side 56dp blue play button, swipe to switch tabs
- **64dp mini player bar**: BlurView glass material, swipe to skip tracks (30dp threshold), tap to expand full player (300ms animation)
- **Adaptive navigation width**: 200dp / 300dp / 400dp by screen size
- **Custom background**: `cover` fill with adjustable overlay, no more washed-out white overlay
- **Playlist detail page**: Clickable playlists, cover entrance scale animation, playable song list
- **Lyrics sync**: Tap lyrics to seek, translation matching, auto-scroll highlight
- **Home cover stack**: 3-layer rotated cover stack on featured card, daily song list covers
- **Real blur glass**: Navigation and mini player use `expo-blur` BlurView, 0.90 opacity when playing, 0.85 when paused
- **Netease Cloud Music**: QR login, daily recommendations, playlists, search, playback, lyrics
- **3 player layouts**: vinyl / immersive / minimal
- **3 UI styles**: native / liquid (Huawei floating nav) / MIUIX
- **Multi-language**: Simplified Chinese, English, Japanese

### In progress / TODO

- Cover shared element transition (Reanimated crash risk, currently using Animated scale entrance)
- Tablet 240dp collapsible side navigation
- Real Media3 playback with background notification
- Device build verification

## Run

```bash
pnpm install
pnpm start
```

The client requires a Development Build. During first-run setup, enter a reachable Hyacine Server address.

## Native Android build

The project includes a Jetpack Compose native Gradle structure (`minSdk 29`, `targetSdk 35`) for direct APK builds:

```bash
./gradlew :app:assembleDebug
```

## Server

Backend deployment and music-source integration docs: [hyacine-server](https://github.com/Ruoxi-TH/hyacine-server).

## License

See [LICENSE](LICENSE).