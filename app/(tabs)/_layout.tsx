import { useEffect, useRef, useState } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ColorValue, type LayoutChangeEvent } from "react-native";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { fadeAnim } from "@/utils/scrollY";
import { GlassBackdrop } from "../../modules/expo-glass-backdrop/src";

const tabs = [
  { route: "/(tabs)", symbol: "⌂", key: "home" },
  { route: "/(tabs)/search", symbol: "⌕", key: "search" },
  { route: "/(tabs)/library", symbol: "♫", key: "library" },
  { route: "/(tabs)/profile", symbol: "◉", key: "profile" },
] as const;

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }): React.JSX.Element {
  return <Text style={{ color, fontSize: 19, fontWeight: "700" }}>{symbol}</Text>;
}

function LiquidTabBar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { tokens } = useTheme();
  const activeIndex = pathname.includes("/search") ? 1 : pathname.includes("/library") ? 2 : pathname.includes("/profile") ? 3 : 0;
  const position = useRef(new Animated.Value(activeIndex)).current;
  const activeIndexRef = useRef(activeIndex);
  const tabWidthRef = useRef(0);
  const [contentWidth, setContentWidth] = useState(0);
  const tabWidth = contentWidth / tabs.length;

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    if (!tabWidth) return;
    Animated.spring(position, { toValue: activeIndex, useNativeDriver: true, stiffness: 240, damping: 24, mass: 0.72 }).start();
  }, [activeIndex, position, tabWidth]);

  const switchTo = (index: number): void => {
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, index));
    if (nextIndex === activeIndexRef.current) {
      Animated.spring(position, { toValue: activeIndexRef.current, useNativeDriver: true, stiffness: 240, damping: 24, mass: 0.72 }).start();
      return;
    }
    router.replace(tabs[nextIndex].route);
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => position.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      if (!tabWidthRef.current) return;
      const next = Math.max(0, Math.min(tabs.length - 1, activeIndexRef.current + gesture.dx / tabWidthRef.current));
      position.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      if (!tabWidthRef.current) return;
      const distance = gesture.dx / tabWidthRef.current;
      const velocity = gesture.vx;
      const offset = Math.abs(velocity) > 0.45 ? (velocity > 0 ? 1 : -1) : Math.round(distance);
      switchTo(activeIndexRef.current + offset);
    },
    onPanResponderTerminate: () => {
      Animated.spring(position, { toValue: activeIndexRef.current, useNativeDriver: true, stiffness: 240, damping: 24, mass: 0.72 }).start();
    },
  })).current;

  const onContentLayout = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width;
    tabWidthRef.current = width / tabs.length;
    setContentWidth(width);
  };

  // 滑动渐隐：fadeAnim 由各 tab 页面滚动事件驱动（滑动时→0，停止后→1）
  const fadeOpacity = fadeAnim;
  const fadeTranslate = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0], extrapolate: "clamp" });

return <Animated.View pointerEvents="box-none" style={{ opacity: fadeOpacity, transform: [{ translateY: fadeTranslate }] }}>
  <View pointerEvents="box-none" className="absolute bottom-3 left-4 right-4 h-[76px] z-50">
    {Platform.OS === "android" ? (
      <View
        pointerEvents="none"
        className="absolute inset-0 overflow-hidden rounded-[38px] border"
        style={{
          backgroundColor: "transparent",
          borderColor: tokens.isLight ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.42)",
          shadowColor: "#182848",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        <GlassBackdrop
          blurRadius={18}
          tintColor={tokens.isLight ? "rgba(248,250,252,0.45)" : "rgba(28,30,38,0.45)"}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View className="absolute left-5 right-5 top-0 h-px" style={{ backgroundColor: tokens.isLight ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.42)" }} />
      </View>
    ) : (
      <View
        className="absolute inset-0 overflow-hidden rounded-[38px] border"
        style={{
          backgroundColor: tokens.isLight ? "rgba(226,234,248,0.20)" : "rgba(18,26,42,0.44)",
          borderColor: tokens.isLight ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.38)",
          shadowColor: "#182848",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        <BlurView intensity={72} tint={tokens.isLight ? "light" : "dark"} className="absolute inset-0" />
        <View className="absolute inset-0" style={{ backgroundColor: tokens.isLight ? "rgba(220,230,247,0.22)" : "rgba(25,34,54,0.20)" }} />
        <View className="absolute left-5 right-5 top-0 h-px" style={{ backgroundColor: "rgba(255,255,255,0.92)" }} />
      </View>
    )}
    <View className="absolute bottom-1.5 left-1.5 right-1.5 top-1.5" onLayout={onContentLayout} {...panResponder.panHandlers}>
      {tabWidth ? <LensPosition position={position} tabWidth={tabWidth} /> : null}
      <View pointerEvents="box-none" className="flex-1 flex-row">
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          const focus = position.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });
          const scale = focus.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
          const opacity = focus.interpolate({ inputRange: [0, 1], outputRange: [0.52, 1] });
          return (
            <Pressable key={tab.key} className="flex-1 items-center justify-center" onPress={() => switchTo(index)}>
              <Animated.View className="h-[60px] items-center justify-center" style={{ opacity, transform: [{ scale }] }}>
                <Text style={{ color: active ? tokens.text : tokens.mutedText, fontSize: 21, fontWeight: "800" }}>{tab.symbol}</Text>
                <Text className="mt-0.5" style={{ color: active ? tokens.text : tokens.mutedText, fontSize: 10, fontWeight: "800" }}>{t(tab.key)}</Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  </View>
</Animated.View>;
}

function LensPosition({ position, tabWidth }: { position: Animated.Value; tabWidth: number }): React.JSX.Element {
  const { tokens } = useTheme();
  const pillInsetX = Math.max(4, tabWidth * 0.08);
  const pillWidth = Math.max(48, tabWidth - pillInsetX * 2);
  const translateX = position.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [pillInsetX, tabWidth + pillInsetX, tabWidth * 2 + pillInsetX, tabWidth * 3 + pillInsetX],
  });

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute overflow-hidden"
      style={{
        top: 4,
        bottom: 4,
        width: pillWidth,
        borderRadius: 999,
        backgroundColor: tokens.isLight ? "rgba(226,234,248,0.20)" : "rgba(18,26,42,0.44)",
        borderWidth: 1,
        borderColor: tokens.isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
        shadowColor: tokens.isLight ? "#94a3b8" : "#93c5fd",
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 0,
        transform: [{ translateX }],
      }}
    >
      <BlurView intensity={88} tint={tokens.isLight ? "light" : "dark"} className="absolute inset-0" />
      <View className="absolute inset-0" style={{ backgroundColor: tokens.isLight ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)" }} />
      <View className="absolute left-3 right-3 top-0 h-px" style={{ backgroundColor: "rgba(255,255,255,0.96)" }} />
    </Animated.View>
  );
}

function MiuixTabBar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { tokens } = useTheme();
  const activeIndex = pathname.includes("/search") ? 1 : pathname.includes("/library") ? 2 : pathname.includes("/profile") ? 3 : 0;
  const position = useRef(new Animated.Value(activeIndex)).current;
  const slideY = useRef(new Animated.Value(80)).current;
  const activeIndexRef = useRef(activeIndex);
  const tabWidthRef = useRef(0);
  const [contentWidth, setContentWidth] = useState(0);
  const tabWidth = contentWidth / tabs.length;

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    if (!tabWidth) return;
    Animated.parallel([
      Animated.spring(position, { toValue: activeIndex, useNativeDriver: true, stiffness: 280, damping: 22, mass: 0.65 }),
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, stiffness: 280, damping: 22, mass: 0.65 }),
    ]).start();
  }, [activeIndex, position, slideY, tabWidth]);

  const switchTo = (index: number): void => {
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, index));
    if (nextIndex === activeIndexRef.current) {
      Animated.spring(position, { toValue: activeIndexRef.current, useNativeDriver: true, stiffness: 280, damping: 22, mass: 0.65 }).start();
      return;
    }
    router.replace(tabs[nextIndex].route);
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => position.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      if (!tabWidthRef.current) return;
      const next = Math.max(0, Math.min(tabs.length - 1, activeIndexRef.current + gesture.dx / tabWidthRef.current));
      position.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      if (!tabWidthRef.current) return;
      const distance = gesture.dx / tabWidthRef.current;
      const velocity = gesture.vx;
      const offset = Math.abs(velocity) > 0.45 ? (velocity > 0 ? 1 : -1) : Math.round(distance);
      switchTo(activeIndexRef.current + offset);
    },
    onPanResponderTerminate: () => {
      Animated.spring(position, { toValue: activeIndexRef.current, useNativeDriver: true, stiffness: 280, damping: 22, mass: 0.65 }).start();
    },
  })).current;

  const onContentLayout = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width;
    tabWidthRef.current = width / tabs.length;
    setContentWidth(width);
  };

  // 滑动渐隐：fadeAnim 由各 tab 页面滚动事件驱动（滑动时→0，停止后→1）
  const fadeOpacity = fadeAnim;
  const fadeTranslate = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0], extrapolate: "clamp" });

  return <Animated.View pointerEvents="box-none" style={{ opacity: fadeOpacity, transform: [{ translateY: fadeTranslate }] }}>
    <Animated.View pointerEvents="box-none" style={{ transform: [{ translateY: slideY }] }}>
    <View className="absolute bottom-16 left-3 right-3 h-[70px]">
      <View className="absolute inset-0 overflow-hidden rounded-[34px] border" style={{ backgroundColor: tokens.isLight ? "#fdfdff" : "#202124", borderColor: `${tokens.accent}35`, shadowColor: "#111827", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 14 }}>
        <View className="absolute left-0 right-0 top-0 h-px" style={{ backgroundColor: `${tokens.accent}25` }} />
      </View>
      <View className="absolute bottom-1.5 left-1.5 right-1.5 top-1.5" onLayout={onContentLayout} {...panResponder.panHandlers}>
        {tabWidth ? <MiuixLensPosition position={position} tabWidth={tabWidth} tokens={tokens} /> : null}
        <View pointerEvents="box-none" className="flex-1 flex-row">
          {tabs.map((tab, index) => {
            const active = index === activeIndex;
            const focus = position.interpolate({ inputRange: [index - 1, index, index + 1], outputRange: [0, 1, 0], extrapolate: "clamp" });
            const scale = focus.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.18] });
            const opacity = focus.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
            const colorShift = focus.interpolate({ inputRange: [0, 1], outputRange: [tokens.mutedText, tokens.accent] });
            return <Pressable key={tab.key} className="flex-1 items-center justify-center" onPress={() => switchTo(index)}>
              <Animated.View className="h-[56px] items-center justify-center" style={{ opacity, transform: [{ scale }] }}>
                <Text style={{ color: active ? tokens.accent : tokens.mutedText, fontSize: 20, fontWeight: "800" }}>{tab.symbol}</Text>
                <Text className="mt-0.5" style={{ color: active ? tokens.accent : tokens.mutedText, fontSize: 10, fontWeight: "800" }}>{t(tab.key)}</Text>
              </Animated.View>
            </Pressable>;
          })}
        </View>
      </View>
    </View>
    </Animated.View>
  </Animated.View>;
}

function MiuixLensPosition({ position, tabWidth, tokens }: { position: Animated.Value; tabWidth: number; tokens: ReturnType<typeof useTheme>["tokens"] }): React.JSX.Element {
  const translateX = position.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3] });
  return <Animated.View pointerEvents="none" className="absolute bottom-0 top-0 overflow-hidden rounded-[28px]" style={{ width: tabWidth, backgroundColor: tokens.isLight ? "#f0f4ff" : "#1a1a2e", shadowColor: tokens.accent, shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, transform: [{ translateX }] }} />;
}

export default function TabsLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { preferences, tokens } = useTheme();
  const isLiquid = preferences.uiStyle === "liquid";
  const isMiuix = preferences.uiStyle === "miuix";
  return <View className="flex-1"><Tabs screenOptions={{
    headerShown: false,
    animation: "shift",
    transitionSpec: {
      animation: "spring",
      config: { stiffness: 320, damping: 28, mass: 0.78, overshootClamping: false },
    },
    sceneStyle: { backgroundColor: tokens.background },
    tabBarStyle: {
      display: isLiquid || isMiuix ? "none" : "flex",
      position: isMiuix ? "absolute" : "relative",
      left: isMiuix ? 12 : 0,
      right: isMiuix ? 12 : 0,
      bottom: isMiuix ? 18 : 0,
      height: isMiuix ? 70 : 62,
      paddingTop: isMiuix ? 8 : 7,
      paddingBottom: isMiuix ? 8 : 7,
      borderRadius: isMiuix ? 34 : 0,
      backgroundColor: isMiuix ? (tokens.isLight ? "#fdfdff" : "#202124") : tokens.surfaceStrong,
      borderColor: isMiuix ? `${tokens.accent}35` : tokens.surfaceBorder,
      borderTopWidth: isMiuix ? 0 : 1,
      borderWidth: isMiuix ? 1 : 0,
      elevation: isMiuix ? 14 : 0,
      shadowColor: isMiuix ? "#111827" : "#000000",
      shadowOpacity: isMiuix ? 0.2 : 0,
      shadowRadius: isMiuix ? 20 : 10,
      shadowOffset: { width: 0, height: isMiuix ? 10 : 7 },
      overflow: isMiuix ? "hidden" : "visible",
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
    tabBarActiveTintColor: isMiuix ? tokens.accent : tokens.accent,
    tabBarInactiveTintColor: tokens.mutedText,
  }}>
    <Tabs.Screen name="index" options={{ title: t("home"), tabBarIcon: ({ color }) => <TabIcon symbol="⌂" color={color} /> }} />
    <Tabs.Screen name="search" options={{ title: t("search"), tabBarIcon: ({ color }) => <TabIcon symbol="⌕" color={color} /> }} />
    <Tabs.Screen name="library" options={{ title: t("library"), tabBarIcon: ({ color }) => <TabIcon symbol="♫" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: t("profile"), tabBarIcon: ({ color }) => <TabIcon symbol="◉" color={color} /> }} />
  </Tabs>{isLiquid ? <LiquidTabBar /> : null}{isMiuix ? <MiuixTabBar /> : null}</View>;
}