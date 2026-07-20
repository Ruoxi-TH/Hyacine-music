import { type PropsWithChildren, useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native";

interface AnimatedScreenProps extends PropsWithChildren {
  enabled?: boolean;
}

/** Subtle global enter animation for major screens. */
export function AnimatedScreen({ children, enabled = true }: AnimatedScreenProps): React.JSX.Element {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, progress]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: 0.72 + progress.value * 0.28,
    transform: [
      { translateY: (1 - progress.value) * 10 },
      { scale: 0.985 + progress.value * 0.015 },
    ],
  }));

  if (!enabled) {
    return <>{children}</>;
  }

  return <Animated.View style={[styles.root, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
