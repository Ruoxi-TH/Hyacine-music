import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";
import { useTheme } from "@/theme";

const brandIcon = require("../../../assets/icon.png");

export function AppLoadingScreen(): React.JSX.Element {
  const { tokens } = useTheme();
  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const rotate = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }));
    pulse.start();
    rotate.start();
    Animated.timing(title, { toValue: 1, duration: 560, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => { pulse.stop(); rotate.stop(); };
  }, [breathe, spin, title]);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });
  const opacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const titleY = title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const titleScale = title.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#ffffff" }}>
    <Animated.View className="absolute h-40 w-40 rounded-full border-2" style={{ borderColor: `${tokens.accent}44`, transform: [{ rotate }] }} />
    <Animated.View className="absolute h-32 w-32 rounded-full border" style={{ borderColor: "#20211e18", transform: [{ scale }] }} />
    <Animated.View className="h-24 w-24 overflow-hidden rounded-[30px]" style={{ opacity, transform: [{ scale }], shadowColor: "#20211e", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
      <Image className="h-full w-full" source={brandIcon} resizeMode="cover" />
    </Animated.View>
    <Animated.View className="mt-7" style={{ opacity: title, transform: [{ translateY: titleY }, { scale: titleScale }] }}><Text style={{ color: "#20211e", fontSize: 22, fontWeight: "800", letterSpacing: 2 }}>风堇音乐</Text></Animated.View>
    <View className="mt-5 h-1 w-16 overflow-hidden rounded-full" style={{ backgroundColor: "#20211e16" }}><Animated.View className="h-full w-10 rounded-full" style={{ backgroundColor: tokens.accent, transform: [{ translateX: breathe.interpolate({ inputRange: [0, 1], outputRange: [-24, 28] }) }] }} /></View>
  </View>;
}