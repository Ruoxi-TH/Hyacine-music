import { Animated } from "react-native";

/**
 * 全局滚动 Y 值，用于 Tab 栏和 MiniPlayer 的滑动渐隐插值。
 *
 * 各 tab 页面（index/search/library/profile）的 Animated.ScrollView / FlatList
 * 通过 onScroll 更新此值；TabBar 和 MiniPlayer 监听 fadeAnim 插值 opacity/translateY。
 *
 * 切换 tab 时需调用 resetScrollY() 重置，避免上一个页面的滚动位置影响新页面。
 */
export const globalScrollY = new Animated.Value(0);

/**
 * 滑动渐隐动画值：1=可见, 0=隐藏。
 *
 * 行为：垂直滑动时渐隐（→0），停止后渐显（→1）。
 * 由 handleScrollForFade / handleScrollEndForFade 驱动，
 * 仅响应 Y 轴主导的滚动（排除 X 轴水平手势误触）。
 */
export const fadeAnim = new Animated.Value(1);

let hideTimer: ReturnType<typeof setTimeout> | null = null;

// --- Y 轴增量判断状态 ---
let lastScrollY = 0;
let lastScrollX = 0;
let isFaded = false;
let confirmCount = 0;

/**
 * Y 轴触发阈值（px）：必须超过此值才算"有效垂直滑动"。
 * 调高至 14px 以降低灵敏度，避免手指轻微抖动即触发。
 */
const FADE_THRESHOLD = 14;

/**
 * X 轴抑制阈值（px）：X 轴位移超过此值即判定为水平手势，
 * 立即取消渐隐并禁止触发（如推荐卡片横滑、Tab 切换、水平 ViewPager）。
 */
const X_INHIBIT_THRESHOLD = 4;

/**
 * 连续帧确认数：必须连续 N 帧满足 Y 轴条件才触发渐隐，
 * 避免单帧抖动误触。
 */
const CONFIRM_FRAMES = 3;

/** 立即渐隐 TabBar 和 MiniPlayer。 */
function notifyScrollBegin(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true,
  }).start();
}

/** 延迟渐显 TabBar 和 MiniPlayer（兼容惯性滚动）。 */
function notifyScrollEnd(): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    hideTimer = null;
  }, 150);
}

/**
 * 在 onScroll listener 中调用：根据 Y 轴增量判断是否应渐隐。
 *
 * 严格策略：
 * 1. X 轴有动静（|dx| > X_INHIBIT_THRESHOLD）→ 立即恢复显示，禁止触发
 * 2. Y 轴位移超过阈值 → 连续 CONFIRM_FRAMES 帧确认后才触发
 * 3. Y 轴位移回落 → 重置确认计数
 */
export function handleScrollForFade(nativeEvent: { contentOffset: { x: number; y: number } }): void {
  const dy = nativeEvent.contentOffset.y - lastScrollY;
  const dx = nativeEvent.contentOffset.x - lastScrollX;
  lastScrollY = nativeEvent.contentOffset.y;
  lastScrollX = nativeEvent.contentOffset.x;

  // X 轴有动静：立即恢复显示，重置确认计数
  if (Math.abs(dx) > X_INHIBIT_THRESHOLD) {
    if (isFaded) {
      notifyScrollEnd();
      isFaded = false;
    }
    confirmCount = 0;
    return;
  }

  // Y 轴超过阈值：累计确认帧
  if (Math.abs(dy) > FADE_THRESHOLD) {
    confirmCount++;
    if (!isFaded && confirmCount >= CONFIRM_FRAMES) {
      notifyScrollBegin();
      isFaded = true;
    }
  } else {
    // Y 轴位移回落则重新计数
    confirmCount = 0;
  }
}

/**
 * 在 onScrollEndDrag / onMomentumScrollEnd 中调用：触发渐显。
 * 内部有 isFaded 守卫，未渐隐时不重复操作。
 */
export function handleScrollEndForFade(): void {
  if (isFaded) {
    notifyScrollEnd();
    isFaded = false;
  }
  confirmCount = 0;
}

/** 切换 tab 或页面挂载时调用，重置滚动渐隐的起点。 */
export function resetScrollY(): void {
  globalScrollY.setValue(0);
  fadeAnim.setValue(1);
  isFaded = false;
  confirmCount = 0;
  lastScrollY = 0;
  lastScrollX = 0;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}
