import { type PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import { Animated, Dimensions, PanResponder, StyleSheet, View } from "react-native";

const routes = ["/(tabs)", "/(tabs)/search", "/(tabs)/library", "/(tabs)/profile"] as const;
const SCREEN_WIDTH = Dimensions.get("window").width;

function routeIndex(pathname: string): number {
  if (pathname.includes("/search")) return 1;
  if (pathname.includes("/library")) return 2;
  if (pathname.includes("/profile")) return 3;
  return 0;
}

/**
 * Uses only React Native's built-in Animated and PanResponder APIs. This keeps
 * tab swiping available even when a release APK does not contain Reanimated's
 * JSI/worklets native runtime.
 */
export function TabSwipeSurface({ children }: PropsWithChildren): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const index = routeIndex(pathname);
  const indexRef = useRef(index);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    indexRef.current = index;
    translateX.stopAnimation();
    translateX.setValue(0);
  }, [index, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const atStart = indexRef.current === 0 && gesture.dx > 0;
          const atEnd = indexRef.current === routes.length - 1 && gesture.dx < 0;
          translateX.setValue(gesture.dx * (atStart || atEnd ? 0.22 : 0.42));
        },
        onPanResponderRelease: (_, gesture) => {
          const switchTab = Math.abs(gesture.dx) > SCREEN_WIDTH * 0.18 || Math.abs(gesture.vx) > 0.7;
          const direction = gesture.dx < 0 ? 1 : -1;
          const next = Math.max(0, Math.min(routes.length - 1, indexRef.current + direction));
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240 }).start();
          if (switchTab && next !== indexRef.current) router.replace(routes[next]);
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240 }).start();
        },
      }),
    [router, translateX],
  );

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
