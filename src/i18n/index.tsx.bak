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
    closePlayer: "Close player", nothingPlaying: "Nothing is playing", backToHome: "Back to home", nowPlaying: "NOW PLAYING",
    pause: "Pause", play: "Play", previous15: "Back 15 seconds", next15: "Forward 15 seconds", miniPlayer: "Now playing", lyricsUnavailable: "Lyrics will appear here when this music source provides them.",
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
    playerLayout: "Player layout", layoutVinyl: "Classic vinyl", layoutImmersive: "Immersive cover", layoutMinimal: "Minimal list",
    readingList: "Reading & list", fontSize: "Font size", density: "List density",
    fontSmall: "Small", fontMedium: "Medium", fontLarge: "Large", densityCompact: "Compact", densityComfortable: "Comfortable",
    preferencesStored: "Preferences are stored securely on this device",
    recommendedPlaylists: "Recommended playlists", neteaseRecommendations: "Recommendations from Netease Cloud", refresh: "Refresh", loadingRecommendations: "Loading recommendations...", noRecommendations: "No recommendations available yet.", recommendationsUnavailable: "Could not load recommendations. Check your Netease login and server connection.", playlistTracks: "tracks", playlistPlays: "plays", neteaseRequired: "Connect Netease Cloud Music to see personalized playlists.",
    onboardingStep: "FIRST RUN /", onboardingWelcomeBody: "Put your music, identity, and server connection in one player.", onboardingProfileTitle: "Create your profile", onboardingProfileBody: "Your name and avatar appear in your profile.", onboardingBackendTitle: "Connect your server", onboardingBackendBody: "Add a Hyacine server address before entering your library.", onboardingNamePlaceholder: "Name", onboardingAvatarPlaceholder: "Avatar image URL", onboardingBackendHint: "Use a complete address beginning with http:// or https://.", continue: "Continue", finish: "Finish", saving: "Saving",
    sourcesTitle: "Music sources", sourcesBody: "Connect one source before you enter Hyacine.", neteaseCloud: "Netease Cloud", bilibili: "Bilibili", credentialsLocal: "Credentials stay encrypted on this device.", creatingNeteaseSession: "Creating a Netease login session...", scanNeteaseCode: "Scan this code in the Netease Cloud Music app.", qrUnavailable: "Could not get a QR code. Configure NETEASE_API_BASE and use a backend address reachable from this device.", qrExpired: "This QR code expired. Get a new one.", checkingCookie: "Checking Cookie format...", cookieValidationFailed: "Validation failed. On a phone, use your computer's LAN IP instead of 127.0.0.1.", secureSessionWaiting: "Secure session waiting", scanInNetease: "Scan in Netease Cloud Music", connectNetease: "Connect Netease Cloud Music", qrCompletesAutomatically: "It completes automatically after confirmation", qrSessionOnly: "The QR code is only valid for this session", importCookie: "Import login Cookie", cookieRequirements: "SESSDATA and bili_jct are required.", cookiePlaceholder: "Paste Bilibili Cookie", working: "Working...", refreshQr: "Refresh QR code", getQr: "Get QR code", verifyAndSave: "Verify and save",

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
    closePlayer: "关闭播放器", nothingPlaying: "当前没有播放内容", backToHome: "返回首页", nowPlaying: "正在播放",
    pause: "暂停", play: "播放", previous15: "后退 15 秒", next15: "前进 15 秒", miniPlayer: "正在播放", lyricsUnavailable: "音乐源提供歌词后，会在这里完整显示。",
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
    playerLayout: "播放器样式", layoutVinyl: "经典唱片", layoutImmersive: "沉浸背景", layoutMinimal: "极简列表",
    readingList: "阅读与列表", fontSize: "字体大小", density: "列表显示密度",
    fontSmall: "小", fontMedium: "中", fontLarge: "大", densityCompact: "紧凑", densityComfortable: "舒适",
    preferencesStored: "偏好已安全保存在本机",
    recommendedPlaylists: "推荐歌单", neteaseRecommendations: "来自网易云音乐的推荐", refresh: "刷新", loadingRecommendations: "正在加载推荐...", noRecommendations: "暂时没有可展示的推荐。", recommendationsUnavailable: "无法加载推荐，请检查网易云登录状态和服务器连接。", playlistTracks: "首", playlistPlays: "播放", neteaseRequired: "连接网易云音乐后即可查看个性化推荐歌单。",
    onboardingStep: "首次启动 /", onboardingWelcomeBody: "把音乐、个人资料和服务器连接放进同一个播放器。", onboardingProfileTitle: "创建个人资料", onboardingProfileBody: "你的昵称和头像会显示在个人中心。", onboardingBackendTitle: "连接服务器", onboardingBackendBody: "进入音乐库前，请添加 Hyacine 服务器地址。", onboardingNamePlaceholder: "昵称", onboardingAvatarPlaceholder: "头像图片 URL", onboardingBackendHint: "请输入以 http:// 或 https:// 开头的完整地址。", continue: "继续", finish: "完成", saving: "正在保存",
    sourcesTitle: "音乐源", sourcesBody: "进入 Hyacine 前，请先连接一个音乐源。", neteaseCloud: "网易云音乐", bilibili: "哔哩哔哩", credentialsLocal: "凭据仅加密保存在本设备。", creatingNeteaseSession: "正在创建网易云登录会话...", scanNeteaseCode: "请在网易云音乐 App 中扫描此二维码。", qrUnavailable: "无法获取二维码。请配置 NETEASE_API_BASE，并使用设备可以访问的后端地址。", qrExpired: "二维码已过期，请重新获取。", checkingCookie: "正在检查 Cookie 格式...", cookieValidationFailed: "校验失败。手机请填写电脑的局域网 IP，不要填写 127.0.0.1。", secureSessionWaiting: "正在等待安全会话", scanInNetease: "请在网易云音乐中扫码", connectNetease: "连接网易云音乐", qrCompletesAutomatically: "确认登录后将自动完成", qrSessionOnly: "二维码仅在本次会话内有效", importCookie: "导入登录 Cookie", cookieRequirements: "需要 SESSDATA 和 bili_jct。", cookiePlaceholder: "粘贴 Bilibili Cookie", working: "正在处理...", refreshQr: "刷新二维码", getQr: "获取二维码", verifyAndSave: "验证并保存",
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
    closePlayer: "プレーヤーを閉じる", nothingPlaying: "再生中の曲はありません", backToHome: "ホームへ戻る", nowPlaying: "NOW PLAYING",
    pause: "一時停止", play: "再生", previous15: "15秒戻る", next15: "15秒進む", miniPlayer: "再生中", lyricsUnavailable: "音楽ソースが歌詞を提供すると、ここに全文を表示します。",
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
    playerLayout: "プレーヤーレイアウト", layoutVinyl: "クラシックレコード", layoutImmersive: "没入型カバー", layoutMinimal: "ミニマルリスト",
    readingList: "表示とリスト", fontSize: "文字サイズ", density: "リスト密度",
    fontSmall: "小", fontMedium: "中", fontLarge: "大", densityCompact: "コンパクト", densityComfortable: "ゆったり",
    preferencesStored: "設定はこの端末に安全に保存されています",
    recommendedPlaylists: "おすすめプレイリスト", neteaseRecommendations: "NetEase Cloud Music からのおすすめ", refresh: "更新", loadingRecommendations: "おすすめを読み込んでいます...", noRecommendations: "表示できるおすすめはまだありません。", recommendationsUnavailable: "おすすめを読み込めません。NetEase のログイン状態とサーバー接続を確認してください。", playlistTracks: "曲", playlistPlays: "再生", neteaseRequired: "NetEase Cloud Music を接続すると、あなた向けのプレイリストを表示できます。",
    onboardingStep: "初回起動 /", onboardingWelcomeBody: "音楽、プロフィール、サーバー接続をひとつのプレーヤーにまとめます。", onboardingProfileTitle: "プロフィールを作成", onboardingProfileBody: "名前とアバターはプロフィールに表示されます。", onboardingBackendTitle: "サーバーに接続", onboardingBackendBody: "ライブラリに入る前に Hyacine サーバーのアドレスを追加してください。", onboardingNamePlaceholder: "名前", onboardingAvatarPlaceholder: "アバター画像 URL", onboardingBackendHint: "http:// または https:// で始まる完全なアドレスを入力してください。", continue: "続ける", finish: "完了", saving: "保存中",
    sourcesTitle: "音楽ソース", sourcesBody: "Hyacine に入る前に、ひとつの音楽ソースを接続してください。", neteaseCloud: "NetEase Cloud Music", bilibili: "Bilibili", credentialsLocal: "認証情報はこの端末に暗号化して保存されます。", creatingNeteaseSession: "NetEase のログインセッションを作成しています...", scanNeteaseCode: "NetEase Cloud Music アプリでこのコードをスキャンしてください。", qrUnavailable: "QR コードを取得できません。NETEASE_API_BASE を設定し、この端末から到達できるバックエンドアドレスを使用してください。", qrExpired: "この QR コードは期限切れです。新しいコードを取得してください。", checkingCookie: "Cookie 形式を確認しています...", cookieValidationFailed: "検証に失敗しました。スマートフォンでは 127.0.0.1 ではなく、PC の LAN IP を使用してください。", secureSessionWaiting: "安全なセッションを待機中", scanInNetease: "NetEase Cloud Music でスキャン", connectNetease: "NetEase Cloud Music を接続", qrCompletesAutomatically: "確認後に自動で完了します", qrSessionOnly: "QR コードはこのセッションでのみ有効です", importCookie: "ログイン Cookie をインポート", cookieRequirements: "SESSDATA と bili_jct が必要です。", cookiePlaceholder: "Bilibili Cookie を貼り付け", working: "処理中...", refreshQr: "QR コードを更新", getQr: "QR コードを取得", verifyAndSave: "検証して保存",
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
