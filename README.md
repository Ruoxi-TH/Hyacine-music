# 风堇音乐 · Hyacine Music

[简体中文](README.zh-CN.md) · [English](README.md) · [日本語](README.ja-JP.md)

风堇音乐是连接 [Hyacine Server](https://github.com/Ruoxi-TH/hyacine-server) API 的移动端音乐客户端，基于 React Native + Expo 构建，同时包含 Android 10+ Jetpack Compose 原生导航架构。

## 当前版本：1.2.0

### 已实现

- **华为风格悬浮胶囊导航**：三页签（首页 / 音乐厅 / 我的），选中 `#00A1FF`，未选中 `#86909C`，右侧 56dp 蓝色播放按钮，左右滑动切换页签
- **64dp 迷你播放条**：毛玻璃材质（BlurView），左右滑动切歌（30dp 阈值），点击展开全屏播放器（300ms 动画）
- **导航宽度自适应**：小屏 200dp / 中屏 300dp / 大屏 400dp
- **自定义背景**：`cover` 全屏填充，轻量可调遮罩，不再被厚白底冲淡
- **歌单详情页**：歌单可点击进入，封面入场缩放动画，歌曲列表可播放
- **歌词同步**：点击歌词跳转进度，翻译歌词匹配，自动滚动高亮
- **首页封面堆叠**：推荐卡片三层旋转封面堆叠，每日歌曲列表封面
- **真实毛玻璃**：导航栏与迷你条使用 `expo-blur` 的 `BlurView`，播放时透明度 0.90，暂停时 0.85
- **网易云音乐**：扫码登录、每日推荐、歌单、搜索、播放、歌词
- **三种播放器布局**：vinyl / immersive / minimal
- **三种 UI 风格**：native / liquid（华为悬浮导航）/ MIUIX
- **多语言**：简体中文、English、日本語

### 进行中 / 待完善

- 封面共享元素转场（Reanimated 闪退风险，当前用 Animated 缩放入场替代）
- 平板 240dp 可折叠侧边导航
- 真实 Media3 播放与后台通知
- 真机构建验证

## 运行

```bash
pnpm install
pnpm start
```

客户端需要使用 Development Build 运行。首次设置时填写可访问的 Hyacine Server 地址。

## 原生 Android 构建

项目包含 Jetpack Compose 原生 Gradle 工程结构（`minSdk 29`，`targetSdk 35`），可直接用 Gradle 构建 APK：

```bash
./gradlew :app:assembleDebug
```

## 后端

后端部署、使用方法和音乐源接入说明请前往 [hyacine-server](https://github.com/Ruoxi-TH/hyacine-server)。

## 许可证

参见 [LICENSE](LICENSE)。