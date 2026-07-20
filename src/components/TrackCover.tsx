import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme";

function normalizeCoverUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

export function TrackCover({
  uri,
  size = 56,
  radius = 16,
  title,
}: {
  uri?: string | null;
  size?: number;
  radius?: number;
  title?: string;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const cover = normalizeCoverUrl(uri);
  const initial = (title?.trim()?.[0] || "♪").toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: `${tokens.accent}18`,
        borderWidth: 1,
        borderColor: `${tokens.accent}33`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <Text style={{ color: tokens.accent, fontSize: Math.max(14, size * 0.34), fontWeight: "900" }}>
          {initial}
        </Text>
      )}
    </View>
  );
}
