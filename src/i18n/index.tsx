import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export const languages = ["zh-CN", "en", "ja"] as const;
export type Language = (typeof languages)[number];

const dictionaries = {
  en: {
    home: "Home", search: "Search", library: "Library", profile: "Profile",
    greeting: "Good evening", subtitle: "Your music, without interruption.", featured: "FEATURED FOR YOU",
    playDemo: "Play demo track", recentlyPlayed: "Recently played",
    historyHint: "Connect your music service to bring your listening history, recommendations, and playlists together.",
    searchPlaceholder: "Songs, artists, or playlists", searchHint: "Find songs, artists, albums, and playlists from your music service.",
    browseTitle: "Browse everything", browseHint: "Search becomes available when your music catalog is connected.",
    localTitle: "Your library", localHint: "Give Hyacine.music access to your local audio files and keep your collection in one place.",
    allowAudio: "Allow local audio access", permissionNote: "Android 13 and later asks for audio-only permission.",
    profileTitle: "Your profile", notSignedIn: "Not signed in", profileHint: "Sign in to sync favorites, playlists, and listening history across devices.",
    language: "Language", appearance: "Appearance", darkMode: "Dark listening room", apiStatus: "Music service", apiReady: "Ready to connect", accountSection: "ACCOUNT", musicService: "Music service", manageMusicService: "Manage music service", myPlaylists: "My playlists", myPlaylistsUnavailable: "Connect Netease Cloud Music to load your playlists.",
    closePlayer: "Close", nothingPlaying: "Nothing is playing", backToHome: "Back to home", nowPlaying: "NOW PLAYING", comments: "Comments", addFavorite: "Add to favorites", removeFavorite: "Remove from favorites",
    pause: "Pause", play: "Play", previous15: "Back 15 seconds", next15: "Forward 15 seconds", miniPlayer: "Now playing", lyricsUnavailable: "Lyrics will appear here when this music source provides them.",
    repeatOne: "Repeat one", repeatAll: "Repeat all", sequentialMode: "Sequential", shuffleMode: "Shuffle",
    previousTrack: "Previous", nextTrack: "Next", loadMoreComments: "Load more comments", noMoreComments: "No more comments",
    queueTitle: "Now playing", queueTracks: "tracks", clearQueue: "Clear queue", clearQueueTitle: "Clear play queue", clearQueueBody: "Current playback continues, but no more tracks will auto-play.", cancel: "Cancel", clear: "Clear", removeFromQueue: "Remove from queue", queueEmpty: "Songs will appear here after playback.", back: "Back", queueLabel: "Queue",
    settingsTitle: "Appearance & settings", appearanceSection: "APPEARANCE", playerSection: "PLAYER",
    uiStyle: "UI style", uiStyleHint: "Change cards, borders, corners, shadows, and background atmosphere.",
    styleNative: "Native", styleLiquid: "Liquid glass", styleMiuix: "MIUIX",
    themeColor: "Theme color", presetMidnight: "Midnight", presetBlack: "Pure black", presetDaylight: "Daylight", presetAurora: "Aurora",
    customAccent: "Custom accent", colorInputPlaceholder: "#7C3AED", colorInputHint: "Enter any six-digit HEX color. Your preview updates instantly.",
    colorInvalid: "Use a valid color such as #7C3AED.", resetToPreset: "Use preset color",
    magicColor: "Magic Color", magicColorHint: "When cover-color extraction is available, it can temporarily override your accent.",
    customBackground: "Custom background", customBackgroundHint: "Pick a wallpaper for all screens. Works best with liquid glass.",
    pickBackground: "Choose image", clearBackground: "Clear background",
    backgroundOpacity: "Background opacity", glassOpacity: "Glass opacity",
    backgroundOpacityHint: "How strong the wallpaper shows through.", glassOpacityHint: "How solid liquid-glass cards and bars feel.",
    permissionDenied: "Permission denied", permissionDeniedHint: "Please allow photo library access to pick a background.",
    playerLayout: "Player layout", layoutVinyl: "Centered lyrics", layoutMinimal: "Compact artwork", layoutCoverLyrics: "Artwork & lyrics",
    readingList: "Reading & list", fontSize: "Font size", density: "List density",
    fontSmall: "Small", fontMedium: "Medium", fontLarge: "Large", densityCompact: "Compact", densityComfortable: "Comfortable",
    preferencesStored: "Preferences are stored securely on this device",
    recommendedPlaylists: "Recommended playlists", neteaseRecommendations: "Recommendations from Netease Cloud", refresh: "Refresh", loadingRecommendations: "Loading recommendations...", noRecommendations: "No recommendations available yet.", recommendationsUnavailable: "Could not load recommendations. Check your Netease login and server connection.", playlistTracks: "tracks", playlistPlays: "plays", neteaseRequired: "Connect Netease Cloud Music to see personalized playlists.",
    librarySubtitle: "Netease Cloud Music playlists", playlistsUnavailable: "This server does not provide Netease playlist management yet.", neteaseLoginExpired: "Netease login expired. Scan the QR code again.", loadFailedHttp: "Load failed HTTP", noPlaylists: "No playlists to show yet.", playlistsLoadFailed: "Could not load your playlists. Check your Netease login and server connection.", loadMoreFailed: "Failed to load more recommendations", createPlaylistUnavailable: "This server does not provide Netease playlist creation yet.", createPlaylistFailed: "Failed to create playlist. Check your Netease login and try again.", deletePlaylistTitle: "Delete playlist", deletePlaylistBody: "Delete this playlist? This will sync to Netease Cloud Music.", delete: "Delete", deletePlaylistFailed: "Failed to delete playlist. Try again later.", collapse: "Collapse", newPlaylist: "New playlist", playlistNamePlaceholder: "Playlist name", creating: "Creating", create: "Create",
    onboardingStep: "FIRST RUN /", onboardingWelcomeBody: "Put your music, identity, and server connection in one player.", onboardingProfileTitle: "Create your profile", onboardingProfileBody: "Your name and avatar appear in your profile.", onboardingBackendTitle: "Connect your server", onboardingBackendBody: "Add a Hyacine server address before entering your library.", onboardingNamePlaceholder: "Name", onboardingAvatarPlaceholder: "Avatar image URL", onboardingBackendHint: "Use a complete address beginning with http:// or https://.", continue: "Continue", finish: "Finish", saving: "Saving",
    sourcesTitle: "Music sources", sourcesBody: "Connect one source before you enter Hyacine.", neteaseCloud: "Netease Cloud", bilibili: "Bilibili", credentialsLocal: "Credentials stay encrypted on this device.", creatingNeteaseSession: "Creating a Netease login session...", scanNeteaseCode: "Scan this code in the Netease Cloud Music app.", qrUnavailable: "Could not get a QR code. Configure NETEASE_API_BASE and use a backend address reachable from this device.", qrExpired: "This QR code expired. Get a new one.", checkingCookie: "Checking Cookie format...", cookieValidationFailed: "Validation failed. On a phone, use your computer's LAN IP instead of 127.0.0.1.", secureSessionWaiting: "Secure session waiting", scanInNetease: "Scan in Netease Cloud Music", connectNetease: "Connect Netease Cloud Music", qrCompletesAutomatically: "It completes automatically after confirmation", qrSessionOnly: "The QR code is only valid for this session", importCookie: "Import login Cookie", cookieRequirements: "SESSDATA and bili_jct are required.", cookiePlaceholder: "Paste Bilibili Cookie", working: "Working...", refreshQr: "Refresh QR code", getQr: "Get QR code", verifyAndSave: "Verify and save",
    // Brand & greetings
    brandName: "Hyacine Music", greetingLateNight: "Good night", greetingMorning: "Good morning", greetingNoon: "Good afternoon", greetingAfternoon: "Good afternoon", greetingEvening: "Good evening",
    dailyRecommendations: "Daily recommendations", dailySongs: "Daily songs", featuredForYou: "Featured for you", playRecommendation: "Play recommended", nowPlayingEllipsis: "Now playing...",
    // Admin
    adminTitle: "Admin Console", adminSubtitle: "This device only · Sensitive info redacted", userData: "User data", backendStatus: "Backend status", clientLogs: "Client logs",
    userDisplayName: "User name", notLoggedInUser: "Not logged in", currentMusicSource: "Current music source", noMusicSourceSelected: "No music source selected",
    listeningHistory: "Listening history", localFavorites: "Local favorites", neteaseCredential: "Netease credential", bilibiliCredential: "Bilibili credential",
    latency: "Latency", neteaseMode: "Netease mode", goDirect: "Go Direct", upstreamCompatible: "Upstream compatible", notConfigured: "Not configured", unavailable: "Unavailable",
    noLogs: "No logs", checking: "Checking",
    // Settings - Account
    adminConsole: "Admin Console", adminConsoleHint: "View device user data, redacted logs, and backend health.", openAdminConsole: "Open admin console",
    accountStatus: "Account status", accountSavedLocally: "Local account saved", noLocalAccount: "No local account created", editProfile: "Edit avatar & name",
    neteaseBound: "Netease Cloud Music bound", bilibiliBound: "Bilibili bound", noMusicServiceBound: "No music service bound",
    serverAddress: "Server address", noServerConfigured: "No server configured", changeServerAddress: "Change server address",
    // Settings - Audio
    audioSection: "Audio", audioQualityAndEffects: "Audio quality & effects", audioQualityHint: "Set online playback quality, sound presets, and custom equalizer.", openAudioSettings: "Open audio settings",
    audioQuality: "Audio quality", onlinePlaybackQuality: "Online playback quality", onlinePlaybackQualityHint: "Used for next Netease song URL fetch. Source, account, and network may auto-downgrade.",
    qualityStandard: "Standard · 128 kbps", qualityHigher: "Higher · 192 kbps", qualityExhigh: "Extreme · 320 kbps", qualityLossless: "Lossless · FLAC", qualityHires: "Hi-Res",
    soundPreset: "Sound preset", presetFlat: "Flat", presetBass: "Bass boost", presetVocal: "Vocal boost", presetBright: "Bright", presetCustom: "Custom",
    soundPresetHint: "Current Expo Audio engine does not expose cross-platform real-time DSP/equalizer APIs. These settings are saved but need native audio module integration.",
    customEqualizer: "Custom equalizer", reset: "Reset",
    // Settings - Appearance
    colorPreview: "Color preview", colorPreviewHint: "Accent text, buttons, progress bars, and card borders will use this color immediately.",
    playButton: "Play button", defaultColor: "Default", coolColor: "Cool", warmColor: "Warm", resetSystemDefault: "Reset to system default",
    // Settings - Player
    lyricColor: "Lyric color", lyricColorHint: "Set sung, current, and upcoming lyrics separately. Default is dark for sung, accent for current, white for upcoming.",
    miniPlayerTheme: "Mini player theme", miniPlayerThemeHint: "Theme 1 is the full song bar. Theme 2 is a compact capsule.",
    theme1Full: "Theme 1 · Full bar", theme2Capsule: "Theme 2 · Mini capsule",
    // Settings - Diagnostics
    diagnosticsLog: "Diagnostics log", appLogTitle: "App log", appLogHint: "Records startup, API, and playback events. Cookies/tokens are auto-redacted. View or share after crashes.",
    viewLog: "View log", shareLog: "Share log", clearLog: "Clear log",
    readingLog: "Reading...", logTitle: "Log", logReadFailed: "Failed to read log", logShareFailed: "Failed to share log",
    clearLogTitle: "Clear log", clearLogBody: "Clear local app log?",
    // Sources
    qrLogin: "QR Login", importCookieTab: "Import Cookie",
    importNeteaseCookie: "Import Netease Cookie", importNeteaseCookieHint: "Paste Cookie containing MUSIC_U. It's encrypted and stored locally for backend direct playback.",
    pasteNeteaseCookie: "Paste Netease Cookie", savingCredentials: "Saving credentials securely...", cookieSaveFailed: "Cookie save failed. Try again.",
    secureSaveAndContinue: "Save and continue",
    // Profile
    listeningRecord: "Listening record", noHistoryHint: "Songs will appear here after playback",
    // Onboarding
    welcomeTitle: "Hyacine Music", backendConnectError: "Could not connect", backendConnectHint: "Confirm the server is running. Use http://publicIP:3000, not 127.0.0.1.",
    changeAvatar: "Change avatar", chooseFromGallery: "Choose from gallery",
    // Library
    deleteFailed: "Delete failed",
    // Register
    registerTitle: "Create Account",
    registerSubtitle: "Join Hyacine Music today",
    registerUsername: "Username",
    registerUsernamePlaceholder: "2-20 characters",
    registerEmail: "Email",
    registerEmailPlaceholder: "your@email.com",
    registerCode: "Verification Code",
    registerCodePlaceholder: "6-digit code",
    registerSendCode: "Send Code",
    registerPassword: "Password",
    registerPasswordPlaceholder: "8+ chars with letters and numbers",
    registerConfirmPassword: "Confirm Password",
    registerConfirmPasswordPlaceholder: "Repeat password",
    registerButton: "Create Account",
    registering: "Creating...",
    registerGoToLogin: "Already have an account? Sign in",
    registerSuccess: "Success",
    registerError: "Error",
    registerUsernameRequired: "Username is required",
    registerEmailRequired: "Email is required",
    registerCodeRequired: "Verification code is required",
    registerPasswordRequired: "Password is required",
    registerPasswordMismatch: "Passwords do not match",
    registerBackendRequired: "Please configure server address first",
    registerCaptchaError: "Failed to load captcha",
    registerCaptchaTitle: "Enter Captcha",
    registerCaptchaPlaceholder: "4 characters",
    registerCaptchaRequired: "Please enter captcha",
    registerCodeSent: "Verification code sent",
    registerCodeError: "Failed to send code",
    registerWelcome: "Welcome to Hyacine Music!",
    confirm: "Confirm",
    // Login
    loginTitle: "Sign In",
    loginSubtitle: "Welcome back to Hyacine Music",
    loginEmail: "Email",
    loginEmailPlaceholder: "your@email.com",
    loginPassword: "Password",
    loginPasswordPlaceholder: "Your password",
    loginButton: "Sign In",
    loggingIn: "Signing in...",
    loginGoToRegister: "Don't have an account? Create one",
    loginSuccess: "Success",
    loginError: "Error",
    loginEmailRequired: "Email is required",
    loginPasswordRequired: "Password is required",
    loginWelcome: "Welcome back!",
    // Welcome
    welcomeSubtitle: "Put your music in one player",
  },
  "zh-CN": {
    home: "首页", search: "搜索", library: "音乐库", profile: "我的",
    greeting: "晚上好", subtitle: "让音乐，不被打断。", featured: "为你推荐", playDemo: "播放试听歌曲", recentlyPlayed: "最近播放",
    historyHint: "连接音乐服务后，可在这里集中查看播放历史、推荐与歌单。",
    searchPlaceholder: "歌曲、歌手或歌单", searchHint: "从你的音乐服务中查找歌曲、歌手、专辑与歌单。",
    browseTitle: "开始探索", browseHint: "连接曲库后即可使用搜索。",
    localTitle: "你的音乐库", localHint: "授权 Hyacine.music 访问本地音频，把收藏集中在一个地方。",
    allowAudio: "允许访问本地音频", permissionNote: "Android 13 及以上仅会请求音频读取权限。",
    profileTitle: "个人中心", notSignedIn: "尚未登录", profileHint: "登录后可在不同设备间同步收藏、歌单与播放历史。",
    language: "语言", appearance: "外观", darkMode: "深色聆听空间", apiStatus: "音乐服务", apiReady: "等待连接", accountSection: "账户", musicService: "音乐服务", manageMusicService: "管理音乐服务", myPlaylists: "我的歌单", myPlaylistsUnavailable: "连接网易云音乐后即可加载你的歌单。",
    closePlayer: "关闭", nothingPlaying: "当前没有播放内容", backToHome: "返回首页", nowPlaying: "正在播放", comments: "评论", addFavorite: "收藏", removeFavorite: "取消收藏",
    pause: "暂停", play: "播放", previous15: "后退 15 秒", next15: "前进 15 秒", miniPlayer: "正在播放", lyricsUnavailable: "暂时没有可用歌词",
    repeatOne: "单曲循环", repeatAll: "列表循环", sequentialMode: "顺序播放", shuffleMode: "随机播放",
    previousTrack: "上一首", nextTrack: "下一首", loadMoreComments: "加载更多评论", noMoreComments: "没有更多评论了",
    queueTitle: "当前播放", queueTracks: "首", clearQueue: "清空队列", clearQueueTitle: "清空播放队列", clearQueueBody: "当前播放会继续，但不会再自动切换下一首。", cancel: "取消", clear: "清空", removeFromQueue: "移出队列", queueEmpty: "播放歌曲后会出现在这里", back: "返回", queueLabel: "队列",
    settingsTitle: "外观与设置", appearanceSection: "外观", playerSection: "播放器",
    uiStyle: "UI 风格", uiStyleHint: "切换卡片、边框、圆角、阴影和背景氛围。",
    styleNative: "原生", styleLiquid: "液态玻璃", styleMiuix: "MIUIX",
    themeColor: "主题色", presetMidnight: "暗夜紫", presetBlack: "纯黑", presetDaylight: "白昼", presetAurora: "极光",
    customAccent: "自定义强调色", colorInputPlaceholder: "#7C3AED", colorInputHint: "输入任意六位 HEX 颜色，预览将即时更新。",
    colorInvalid: "请输入有效颜色，例如 #7C3AED。", resetToPreset: "恢复预设颜色",
    magicColor: "魔法取色", magicColorHint: "封面主色提取接入后，可暂时覆盖当前强调色。",
    customBackground: "自定义背景", customBackgroundHint: "为全局页面选择壁纸，和液态玻璃搭配最好。",
    pickBackground: "选择图片", clearBackground: "清除背景",
    backgroundOpacity: "背景透明度", glassOpacity: "玻璃透明度",
    backgroundOpacityHint: "壁纸透过强度。", glassOpacityHint: "液态玻璃卡片/导航的实心程度。",
    permissionDenied: "权限被拒绝", permissionDeniedHint: "请允许访问照片图库以选择背景。",
    playerLayout: "播放器样式", layoutVinyl: "中心歌词", layoutMinimal: "紧凑封面", layoutCoverLyrics: "封面与歌词",
    readingList: "阅读与列表", fontSize: "字体大小", density: "列表显示密度",
    fontSmall: "小", fontMedium: "中", fontLarge: "大", densityCompact: "紧凑", densityComfortable: "舒适",
    preferencesStored: "偏好已安全保存在本机",
    recommendedPlaylists: "推荐歌单", neteaseRecommendations: "来自网易云音乐的推荐", refresh: "刷新", loadingRecommendations: "正在加载推荐...", noRecommendations: "暂时没有可展示的推荐。", recommendationsUnavailable: "无法加载推荐，请检查网易云登录状态和服务器连接。", playlistTracks: "首", playlistPlays: "播放", neteaseRequired: "连接网易云音乐后即可查看个性化推荐歌单。",
    librarySubtitle: "网易云音乐歌单", playlistsUnavailable: "当前服务器尚未提供网易云歌单管理。", neteaseLoginExpired: "网易云登录已失效，请重新扫码绑定", loadFailedHttp: "加载失败 HTTP", noPlaylists: "暂无可展示的歌单。", playlistsLoadFailed: "无法加载我的歌单，请检查网易云登录状态和服务器连接。", loadMoreFailed: "加载更多推荐失败", createPlaylistUnavailable: "当前服务器尚未提供网易云歌单创建。", createPlaylistFailed: "创建歌单失败，请检查网易云登录状态后重试。", deletePlaylistTitle: "删除歌单", deletePlaylistBody: "确定删除此歌单吗？此操作会同步到网易云音乐。", delete: "删除", deletePlaylistFailed: "删除歌单失败，请稍后重试。", collapse: "收起", newPlaylist: "新建歌单", playlistNamePlaceholder: "歌单名称", creating: "创建中", create: "创建",
    onboardingStep: "首次启动 /", onboardingWelcomeBody: "把音乐、个人资料和服务器连接放进同一个播放器。", onboardingProfileTitle: "创建个人资料", onboardingProfileBody: "你的昵称和头像会显示在个人中心。", onboardingBackendTitle: "连接服务器", onboardingBackendBody: "进入音乐库前，请添加 Hyacine 服务器地址。", onboardingNamePlaceholder: "昵称", onboardingAvatarPlaceholder: "头像图片 URL", onboardingBackendHint: "请输入以 http:// 或 https:// 开头的完整地址。", continue: "继续", finish: "完成", saving: "正在保存",
    sourcesTitle: "音乐源", sourcesBody: "进入 Hyacine 前，请先连接一个音乐源。", neteaseCloud: "网易云音乐", bilibili: "哔哩哔哩", credentialsLocal: "凭据仅加密保存在本设备。", creatingNeteaseSession: "正在创建网易云登录会话...", scanNeteaseCode: "请在网易云音乐 App 中扫描此二维码。", qrUnavailable: "无法获取二维码。请配置 NETEASE_API_BASE，并使用设备可以访问的后端地址。", qrExpired: "二维码已过期，请重新获取。", checkingCookie: "正在检查 Cookie 格式...", cookieValidationFailed: "校验失败。手机请填写电脑的局域网 IP，不要填写 127.0.0.1。", secureSessionWaiting: "正在等待安全会话", scanInNetease: "请在网易云音乐中扫码", connectNetease: "连接网易云音乐", qrCompletesAutomatically: "确认登录后将自动完成", qrSessionOnly: "二维码仅在本次会话内有效", importCookie: "导入登录 Cookie", cookieRequirements: "需要 SESSDATA 和 bili_jct。", cookiePlaceholder: "粘贴 Bilibili Cookie", working: "正在处理...", refreshQr: "刷新二维码", getQr: "获取二维码", verifyAndSave: "验证并保存",
    // Brand & greetings
    brandName: "风堇音乐", greetingLateNight: "夜深了", greetingMorning: "早上好", greetingNoon: "中午好", greetingAfternoon: "下午好", greetingEvening: "晚上好",
    dailyRecommendations: "每日推荐", dailySongs: "每日歌曲", featuredForYou: "为你推荐", playRecommendation: "播放推荐歌曲", nowPlayingEllipsis: "正在播放...",
    // Admin
    adminTitle: "管理后台", adminSubtitle: "仅当前设备 · 敏感信息已脱敏", userData: "用户数据", backendStatus: "后端状态", clientLogs: "客户端日志",
    userDisplayName: "用户名", notLoggedInUser: "未登录用户", currentMusicSource: "当前音乐源", noMusicSourceSelected: "尚未选择音乐源",
    listeningHistory: "听歌历史", localFavorites: "本地收藏", neteaseCredential: "网易云凭据", bilibiliCredential: "B站凭据",
    latency: "延迟", neteaseMode: "网易云模式", goDirect: "Go 直连", upstreamCompatible: "兼容上游", notConfigured: "未配置", unavailable: "不可用",
    noLogs: "暂无日志", checking: "检查中",
    // Settings - Account
    adminConsole: "管理后台", adminConsoleHint: "查看当前设备用户数据、脱敏日志与后端健康状态。", openAdminConsole: "打开管理后台",
    accountStatus: "账号状态", accountSavedLocally: "本地账户资料已保存", noLocalAccount: "尚未创建本地账户资料", editProfile: "编辑头像与昵称",
    neteaseBound: "网易云音乐已绑定", bilibiliBound: "哔哩哔哩已绑定", noMusicServiceBound: "尚未绑定音乐服务",
    serverAddress: "服务器地址", noServerConfigured: "尚未配置服务器", changeServerAddress: "修改服务器地址",
    // Settings - Audio
    audioSection: "音频", audioQualityAndEffects: "音质与音效", audioQualityHint: "设置在线播放音质、音效预设和自定义均衡器。", openAudioSettings: "打开音频设置",
    audioQuality: "音质", onlinePlaybackQuality: "在线播放音质", onlinePlaybackQualityHint: "用于网易云歌曲下一次获取播放地址；音源、账号权限和网络可能自动降级。",
    qualityStandard: "标准 · 128 kbps", qualityHigher: "较高 · 192 kbps", qualityExhigh: "极高 · 320 kbps", qualityLossless: "无损 · FLAC", qualityHires: "Hi-Res",
    soundPreset: "音效预设", presetFlat: "原声", presetBass: "低音增强", presetVocal: "人声突出", presetBright: "明亮", presetCustom: "自定义",
    soundPresetHint: "当前 Expo Audio 播放引擎没有开放跨平台实时 DSP/均衡器接口。以下配置会安全保存，但需后续原生音频处理模块接入后才会改变声音。",
    customEqualizer: "自定义均衡器", reset: "重置",
    // Settings - Appearance
    colorPreview: "颜色效果预览", colorPreviewHint: "强调文字、按钮、进度条和卡片边框会立即使用此颜色。",
    playButton: "播放按钮", defaultColor: "默认", coolColor: "冷色", warmColor: "暖色", resetSystemDefault: "恢复系统默认",
    // Settings - Player
    lyricColor: "歌词颜色", lyricColorHint: "已唱、当前和未唱歌词可分别设置；恢复默认即为已唱深色、当前强调色、未唱白色。",
    miniPlayerTheme: "正在播放栏主题", miniPlayerThemeHint: "主题 1 为完整歌曲栏；主题 2 为更紧凑的小胶囊。",
    theme1Full: "主题 1 · 完整栏", theme2Capsule: "主题 2 · 小胶囊",
    // Settings - Diagnostics
    diagnosticsLog: "诊断日志", appLogTitle: "App 日志", appLogHint: "记录启动、接口与播放链路；Cookie/Token 会自动脱敏。崩溃后可到这里查看或分享。", viewLog: "查看日志", shareLog: "分享日志", clearLog: "清空日志",
    readingLog: "读取中...", logTitle: "日志", logReadFailed: "读取日志失败", logShareFailed: "分享日志失败",
    clearLogTitle: "清空日志", clearLogBody: "确定清空本地 App 日志？",
    // Sources
    qrLogin: "扫码登录", importCookieTab: "导入 Cookie",
    importNeteaseCookie: "导入网易云 Cookie", importNeteaseCookieHint: "粘贴包含 MUSIC_U 的 Cookie。它仅加密保存在本机，用于后端直连播放。",
    pasteNeteaseCookie: "粘贴网易云 Cookie", savingCredentials: "正在安全保存凭据...", cookieSaveFailed: "Cookie 保存失败，请重试。",
    secureSaveAndContinue: "安全保存并继续",
    // Profile
    listeningRecord: "听歌记录", noHistoryHint: "播放歌曲后会显示在这里",
    // Onboarding
    welcomeTitle: "风堇音乐", backendConnectError: "无法连接", backendConnectHint: "请确认服务器已启动，并填写 http://公网IP:3000，不要填 127.0.0.1。",
    changeAvatar: "更换本地头像", chooseFromGallery: "从相册选择头像",
    // Library
    deleteFailed: "删除失败",
    // Register
    registerTitle: "创建账号",
    registerSubtitle: "立即加入风堇音乐",
    registerUsername: "用户名",
    registerUsernamePlaceholder: "2-20 个字符",
    registerEmail: "邮箱",
    registerEmailPlaceholder: "your@email.com",
    registerCode: "验证码",
    registerCodePlaceholder: "6 位数字",
    registerSendCode: "发送验证码",
    registerPassword: "密码",
    registerPasswordPlaceholder: "8 位以上，含字母和数字",
    registerConfirmPassword: "确认密码",
    registerConfirmPasswordPlaceholder: "再次输入密码",
    registerButton: "创建账号",
    registering: "创建中...",
    registerGoToLogin: "已有账号？立即登录",
    registerSuccess: "成功",
    registerError: "错误",
    registerUsernameRequired: "请输入用户名",
    registerEmailRequired: "请输入邮箱",
    registerCodeRequired: "请输入验证码",
    registerPasswordRequired: "请输入密码",
    registerPasswordMismatch: "两次密码不一致",
    registerBackendRequired: "请先配置服务器地址",
    registerCaptchaError: "获取验证码失败",
    registerCaptchaTitle: "输入图形验证码",
    registerCaptchaPlaceholder: "4 个字符",
    registerCaptchaRequired: "请输入图形验证码",
    registerCodeSent: "验证码已发送",
    registerCodeError: "发送验证码失败",
    registerWelcome: "欢迎加入风堇音乐！",
    confirm: "确认",
    // Login
    loginTitle: "登录",
    loginSubtitle: "欢迎回到风堇音乐",
    loginEmail: "邮箱",
    loginEmailPlaceholder: "your@email.com",
    loginPassword: "密码",
    loginPasswordPlaceholder: "您的密码",
    loginButton: "登录",
    loggingIn: "登录中...",
    loginGoToRegister: "没有账号？立即注册",
    loginSuccess: "成功",
    loginError: "错误",
    loginEmailRequired: "请输入邮箱",
    loginPasswordRequired: "请输入密码",
    loginWelcome: "欢迎回来！",
    // Welcome
    welcomeSubtitle: "让音乐，不被打断",
  },
  ja: {
    home: "ホーム", search: "検索", library: "ライブラリ", profile: "プロフィール",
    greeting: "こんばんは", subtitle: "音楽を、途切れさせない。", featured: "FEATURED FOR YOU", playDemo: "デモ曲を再生", recentlyPlayed: "最近再生した曲",
    historyHint: "音楽サービスを接続すると、再生履歴・おすすめ・プレイリストをまとめて確認できます。",
    searchPlaceholder: "曲、アーティスト、プレイリスト", searchHint: "音楽サービスから曲、アーティスト、アルバム、プレイリストを探します。",
    browseTitle: "さあ、探そう", browseHint: "音楽カタログを接続すると検索を利用できます。",
    localTitle: "あなたのライブラリ", localHint: "ローカル音源へのアクセスを許可し、コレクションをひとつにまとめます。",
    allowAudio: "ローカル音源を許可", permissionNote: "Android 13 以降では音声ファイルのみへのアクセスを要求します。",
    profileTitle: "プロフィール", notSignedIn: "ログインしていません", profileHint: "ログインすると、お気に入り、プレイリスト、再生履歴を端末間で同期できます。",
    language: "言語", appearance: "表示", darkMode: "ダーク・リスニングルーム", apiStatus: "音楽サービス", apiReady: "接続待ち", accountSection: "アカウント", musicService: "音楽サービス", manageMusicService: "音楽サービスを管理", myPlaylists: "マイプレイリスト", myPlaylistsUnavailable: "NetEase Cloud Music を接続するとプレイリストを読み込めます。",
    closePlayer: "閉じる", nothingPlaying: "再生中の曲はありません", backToHome: "ホームへ戻る", nowPlaying: "再生中", comments: "コメント", addFavorite: "お気に入りに追加", removeFavorite: "お気に入りから削除",
    pause: "一時停止", play: "再生", previous15: "15秒戻る", next15: "15秒進む", miniPlayer: "再生中", lyricsUnavailable: "利用できる歌詞はありません。",
    repeatOne: "1曲リピート", repeatAll: "全曲リピート", sequentialMode: "順次再生", shuffleMode: "シャッフル",
    previousTrack: "前の曲", nextTrack: "次の曲", loadMoreComments: "もっと読み込む", noMoreComments: "これ以上コメントはありません",
    queueTitle: "再生中", queueTracks: "曲", clearQueue: "キューをクリア", clearQueueTitle: "再生キューをクリア", clearQueueBody: "現在の再生は続きますが、次の曲への自動切り替えは停止します。", cancel: "キャンセル", clear: "クリア", removeFromQueue: "キューから削除", queueEmpty: "再生するとここに曲が表示されます。", back: "戻る", queueLabel: "キュー",
    settingsTitle: "表示と設定", appearanceSection: "表示", playerSection: "プレーヤー",
    uiStyle: "UI スタイル", uiStyleHint: "カード、枠線、角丸、影、背景の雰囲気を切り替えます。",
    styleNative: "ネイティブ", styleLiquid: "リキッドガラス", styleMiuix: "MIUIX",
    themeColor: "テーマカラー", presetMidnight: "ミッドナイト", presetBlack: "ピュアブラック", presetDaylight: "デイライト", presetAurora: "オーロラ",
    customAccent: "カスタムアクセント", colorInputPlaceholder: "#7C3AED", colorInputHint: "6桁の HEX カラーを入力すると、すぐにプレビューされます。",
    colorInvalid: "#7C3AED のような有効なカラーを入力してください。", resetToPreset: "プリセットカラーに戻す",
    magicColor: "マジックカラー", magicColorHint: "カバー色の抽出が利用可能になると、アクセントを一時的に上書きできます。",
    customBackground: "カスタム背景", customBackgroundHint: "全画面の壁紙を選べます。リキッドガラスと相性が良いです。",
    pickBackground: "画像を選ぶ", clearBackground: "背景を消す",
    backgroundOpacity: "背景の不透明度", glassOpacity: "ガラスの不透明度",
    backgroundOpacityHint: "壁紙の透け具合。", glassOpacityHint: "リキッドガラスのカード/バーの濃さ。",
    permissionDenied: "権限が拒否されました", permissionDeniedHint: "背景を選ぶには写真ライブラリへのアクセスを許可してください。",
    playerLayout: "プレーヤーレイアウト", layoutVinyl: "中央歌詞", layoutMinimal: "コンパクトカバー", layoutCoverLyrics: "カバーと歌詞",
    readingList: "表示とリスト", fontSize: "文字サイズ", density: "リスト密度",
    fontSmall: "小", fontMedium: "中", fontLarge: "大", densityCompact: "コンパクト", densityComfortable: "ゆったり",
    preferencesStored: "設定はこの端末に安全に保存されています",
    recommendedPlaylists: "おすすめプレイリスト", neteaseRecommendations: "NetEase Cloud Music からのおすすめ", refresh: "更新", loadingRecommendations: "おすすめを読み込んでいます...", noRecommendations: "表示できるおすすめはまだありません。", recommendationsUnavailable: "おすすめを読み込めません。NetEase のログイン状態とサーバー接続を確認してください。", playlistTracks: "曲", playlistPlays: "再生", neteaseRequired: "NetEase Cloud Music を接続すると、あなた向けのプレイリストを表示できます。",
    librarySubtitle: "NetEase Cloud Music プレイリスト", playlistsUnavailable: "このサーバーはまだ NetEase プレイリスト管理を提供していません。", neteaseLoginExpired: "NetEase ログインの期限が切れました。再度 QR コードをスキャンしてください。", loadFailedHttp: "読み込み失敗 HTTP", noPlaylists: "表示できるプレイリストはまだありません。", playlistsLoadFailed: "マイプレイリストを読み込めません。NetEase のログイン状態とサーバー接続を確認してください。", loadMoreFailed: "おすすめの追加読み込みに失敗しました", createPlaylistUnavailable: "このサーバーはまだ NetEase プレイリスト作成を提供していません。", createPlaylistFailed: "プレイリストの作成に失敗しました。NetEase のログイン状態を確認して再試行してください。", deletePlaylistTitle: "プレイリストを削除", deletePlaylistBody: "このプレイリストを削除しますか？この操作は NetEase Cloud Music に同期されます。", delete: "削除", deletePlaylistFailed: "プレイリストの削除に失敗しました。後でもう一度お試しください。", collapse: "閉じる", newPlaylist: "新規プレイリスト", playlistNamePlaceholder: "プレイリスト名", creating: "作成中", create: "作成",
    onboardingStep: "初回起動 /", onboardingWelcomeBody: "音楽、プロフィール、サーバー接続をひとつのプレーヤーにまとめます。", onboardingProfileTitle: "プロフィールを作成", onboardingProfileBody: "名前とアバターはプロフィールに表示されます。", onboardingBackendTitle: "サーバーに接続", onboardingBackendBody: "ライブラリに入る前に Hyacine サーバーのアドレスを追加してください。", onboardingNamePlaceholder: "名前", onboardingAvatarPlaceholder: "アバター画像 URL", onboardingBackendHint: "http:// または https:// で始まる完全なアドレスを入力してください。", continue: "続ける", finish: "完了", saving: "保存中",
    sourcesTitle: "音楽ソース", sourcesBody: "Hyacine に入る前に、ひとつの音楽ソースを接続してください。", neteaseCloud: "NetEase Cloud Music", bilibili: "Bilibili", credentialsLocal: "認証情報はこの端末に暗号化して保存されます。", creatingNeteaseSession: "NetEase のログインセッションを作成しています...", scanNeteaseCode: "NetEase Cloud Music アプリでこのコードをスキャンしてください。", qrUnavailable: "QR コードを取得できません。NETEASE_API_BASE を設定し、この端末から到達できるバックエンドアドレスを使用してください。", qrExpired: "この QR コードは期限切れです。新しいコードを取得してください。", checkingCookie: "Cookie 形式を確認しています...", cookieValidationFailed: "検証に失敗しました。スマートフォンでは 127.0.0.1 ではなく、PC の LAN IP を使用してください。", secureSessionWaiting: "安全なセッションを待機中", scanInNetease: "NetEase Cloud Music でスキャン", connectNetease: "NetEase Cloud Music を接続", qrCompletesAutomatically: "確認後に自動で完了します", qrSessionOnly: "QR コードはこのセッションでのみ有効です", importCookie: "ログイン Cookie をインポート", cookieRequirements: "SESSDATA と bili_jct が必要です。", cookiePlaceholder: "Bilibili Cookie を貼り付け", working: "処理中...", refreshQr: "QR コードを更新", getQr: "QR コードを取得", verifyAndSave: "検証して保存",
    // Brand & greetings
    brandName: "Hyacine Music", greetingLateNight: "夜更かし", greetingMorning: "おはよう", greetingNoon: "こんにちは", greetingAfternoon: "こんにちは", greetingEvening: "こんばんは",
    dailyRecommendations: "デイリーおすすめ", dailySongs: "デイリーソング", featuredForYou: "あなたにおすすめ", playRecommendation: "おすすめを再生", nowPlayingEllipsis: "再生中...",
    // Admin
    adminTitle: "管理コンソール", adminSubtitle: "この端末のみ · 機密情報はマスク済み", userData: "ユーザーデータ", backendStatus: "バックエンド状態", clientLogs: "クライアントログ",
    userDisplayName: "ユーザー名", notLoggedInUser: "未ログイン", currentMusicSource: "現在の音楽ソース", noMusicSourceSelected: "音楽ソース未選択",
    listeningHistory: "再生履歴", localFavorites: "ローカルお気に入り", neteaseCredential: "NetEase 認証", bilibiliCredential: "Bilibili 認証",
    latency: "レイテンシ", neteaseMode: "NetEase モード", goDirect: "Go 直接", upstreamCompatible: "アップストリーム互換", notConfigured: "未設定", unavailable: "利用不可",
    noLogs: "ログなし", checking: "確認中",
    // Settings - Account
    adminConsole: "管理コンソール", adminConsoleHint: "端末のユーザーデータ、マスク済みログ、バックエンド状態を確認。", openAdminConsole: "管理コンソールを開く",
    accountStatus: "アカウント状態", accountSavedLocally: "ローカルアカウント保存済み", noLocalAccount: "ローカルアカウント未作成", editProfile: "アバターと名前を編集",
    neteaseBound: "NetEase Cloud Music 連携済み", bilibiliBound: "Bilibili 連携済み", noMusicServiceBound: "音楽サービス未連携",
    serverAddress: "サーバーアドレス", noServerConfigured: "サーバー未設定", changeServerAddress: "サーバーアドレスを変更",
    // Settings - Audio
    audioSection: "オーディオ", audioQualityAndEffects: "音質とエフェクト", audioQualityHint: "オンライン再生の音質、エフェクトプリセット、カスタムイコライザを設定。", openAudioSettings: "オーディオ設定を開く",
    audioQuality: "音質", onlinePlaybackQuality: "オンライン再生音質", onlinePlaybackQualityHint: "次の NetEase 楽曲 URL 取得に使用。音源、アカウント、ネットワークにより自動ダウングレードの可能性。",
    qualityStandard: "標準 · 128 kbps", qualityHigher: "高品質 · 192 kbps", qualityExhigh: "最高 · 320 kbps", qualityLossless: "ロスレス · FLAC", qualityHires: "Hi-Res",
    soundPreset: "エフェクトプリセット", presetFlat: "フラット", presetBass: "低音強調", presetVocal: "ボーカル強調", presetBright: "明るい", presetCustom: "カスタム",
    soundPresetHint: "現在の Expo Audio エンジンはクロスプラットフォームのリアルタイム DSP/イコライザ API を公開していません。設定は保存されますが、ネイティブオーディオモジュールの統合が必要です。",
    customEqualizer: "カスタムイコライザ", reset: "リセット",
    // Settings - Appearance
    colorPreview: "色のプレビュー", colorPreviewHint: "アクセントテキスト、ボタン、プログレスバー、カードの枠線に即座に適用。",
    playButton: "再生ボタン", defaultColor: "デフォルト", coolColor: "クール", warmColor: "ウォーム", resetSystemDefault: "システムデフォルトに戻す",
    // Settings - Player
    lyricColor: "歌詞の色", lyricColorHint: "歌唱済み、現在、未歌唱の歌詞を個別に設定。デフォルトは歌唱済みが暗色、現在がアクセント色、未歌唱が白色。",
    miniPlayerTheme: "ミニプレーヤーテーマ", miniPlayerThemeHint: "テーマ 1 はフルソングバー。テーマ 2 はコンパクトなカプセル。",
    theme1Full: "テーマ 1 · フルバー", theme2Capsule: "テーマ 2 · ミニカプセル",
    // Settings - Diagnostics
    diagnosticsLog: "診断ログ", appLogTitle: "App ログ", appLogHint: "起動、API、再生イベントを記録。Cookie/トークンは自動マスク。クラッシュ後に確認または共有可能。", viewLog: "ログを見る", shareLog: "ログを共有", clearLog: "ログをクリア",
    readingLog: "読み込み中...", logTitle: "ログ", logReadFailed: "ログの読み込みに失敗", logShareFailed: "ログの共有に失敗",
    clearLogTitle: "ログをクリア", clearLogBody: "ローカル App ログをクリアしますか？",
    // Sources
    qrLogin: "QR ログイン", importCookieTab: "Cookie インポート",
    importNeteaseCookie: "NetEase Cookie インポート", importNeteaseCookieHint: "MUSIC_U を含む Cookie を貼り付け。ローカルに暗号化保存され、バックエンド直接再生に使用。",
    pasteNeteaseCookie: "NetEase Cookie を貼り付け", savingCredentials: "認証情報を安全に保存中...", cookieSaveFailed: "Cookie の保存に失敗。再試行してください。",
    secureSaveAndContinue: "安全に保存して続行",
    // Profile
    listeningRecord: "再生履歴", noHistoryHint: "再生するとここに曲が表示されます",
    // Onboarding
    welcomeTitle: "Hyacine Music", backendConnectError: "接続できません", backendConnectHint: "サーバーが起動していることを確認。http://パブリックIP:3000 を使用し、127.0.0.1 は使用しないでください。",
    changeAvatar: "アバターを変更", chooseFromGallery: "ギャラリーから選択",
    // Library
    deleteFailed: "削除失敗",
  },
} as const;

type TranslationKey = keyof typeof dictionaries.en;
interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
}
const LANGUAGE_STORAGE_KEY = "hyacine.language";
const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (locale.startsWith("ja")) return "ja";
  if (locale.startsWith("zh")) return "zh-CN";
  return "en";
}

export function I18nProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [language, setCurrentLanguage] = useState<Language>(detectLanguage());
  useEffect(() => {
    void SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY).then((savedLanguage) => {
      if (languages.includes(savedLanguage as Language)) setCurrentLanguage(savedLanguage as Language);
    });
  }, []);
  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: async (nextLanguage) => {
      setCurrentLanguage(nextLanguage);
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, nextLanguage);
    },
    t: (key) => dictionaries[language][key],
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
