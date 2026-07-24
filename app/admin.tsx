import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ThemedScreen } from "@/components/ui/ThemedScreen";
import { LiquidControlSurface } from "@/components/ui/LiquidControlSurface";
import { useAccount } from "@/account";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { apiBase } from "@/utils/apiBase";
import { getLogText } from "@/utils/logger";
import { loadListeningHistory } from "@/services/listeningHistory";
import { loadFavorites } from "@/services/favorites";
import { getStoredToken } from "@/services/auth";
import {
  listUsers,
  getStats,
  banUser,
  unbanUser,
  deleteUser,
  promoteUser,
  type AdminUser,
  type AdminStats,
} from "@/services/admin";

interface HealthState {
  ok: boolean;
  status: string;
  latencyMs: number;
  checkedAt: string;
  direct?: boolean;
  capabilities?: Record<string, boolean>;
  error?: string;
}

function StatusDot({ ok }: { ok: boolean }): React.JSX.Element {
  return <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: ok ? "#22c55e" : "#ef4444" }} />;
}

export default function AdminScreen(): React.JSX.Element {
  const { profile, serverUser, getSourceCredential } = useAccount();
  const { t } = useI18n();
  const { tokens } = useTheme();

  useEffect(() => {
    if (serverUser && serverUser.role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [serverUser]);

  if (!serverUser || serverUser.role !== "admin") {
    return (
      <ThemedScreen>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: "800", textAlign: "center" }}>
            {t("adminPermissionDenied")}
          </Text>
          <Text className="mt-3 text-center" style={{ color: tokens.mutedText }}>
            {t("adminPermissionHint")}
          </Text>
          <Pressable
            className="mt-6 rounded-full px-6 py-3"
            style={{ backgroundColor: tokens.accent }}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{t("back")}</Text>
          </Pressable>
        </View>
      </ThemedScreen>
    );
  }

  const [loading, setLoading] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [credentials, setCredentials] = useState({ netease: false, bilibili: false });
  const [health, setHealth] = useState<HealthState | null>(null);
  const [logs, setLogs] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [banReason, setBanReason] = useState("");
  const [banTarget, setBanTarget] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const token = await getStoredToken();
    const [history, favorites, netease, bilibili, logText] = await Promise.all([
      loadListeningHistory(), loadFavorites(), getSourceCredential("netease"), getSourceCredential("bilibili"), getLogText(),
    ]);
    setHistoryCount(history.length);
    setFavoriteCount(favorites.length);
    setCredentials({ netease: Boolean(netease), bilibili: Boolean(bilibili) });
    setLogs(logText.split("\n").slice(-120).join("\n"));

    if (profile?.backendUrl && token) {
      const started = Date.now();
      try {
        const [healthRes, statsRes, usersRes] = await Promise.all([
          fetch(`${apiBase(profile.backendUrl)}/health`, { signal: AbortSignal.timeout(10000) }),
          getStats(profile.backendUrl, token),
          listUsers(profile.backendUrl, token, 1),
        ]);
        const body = await healthRes.json() as { status?: string; netease?: { direct?: boolean; capabilities?: Record<string, boolean> } };
        setHealth({ ok: healthRes.ok, status: body.status ?? `HTTP ${healthRes.status}`, latencyMs: Date.now() - started, checkedAt: new Date().toLocaleString(), direct: body.netease?.direct, capabilities: body.netease?.capabilities });
        setStats(statsRes);
        setUsers(usersRes.users);
        setUsersTotal(usersRes.total);
        setUsersPage(1);
      } catch (reason) {
        setHealth({ ok: false, status: t("unavailable"), latencyMs: Date.now() - started, checkedAt: new Date().toLocaleString(), error: reason instanceof Error ? reason.message : String(reason) });
      }
    } else {
      setHealth({ ok: false, status: t("notConfigured"), latencyMs: 0, checkedAt: new Date().toLocaleString(), error: t("noServerConfigured") });
    }
    setLoading(false);
  }, [getSourceCredential, profile?.backendUrl]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadUsersPage = useCallback(async (page: number) => {
    if (!profile?.backendUrl) return;
    const token = await getStoredToken();
    if (!token) return;
    try {
      const res = await listUsers(profile.backendUrl, token, page);
      setUsers(res.users);
      setUsersTotal(res.total);
      setUsersPage(page);
    } catch (e) {
      Alert.alert(t("adminError"), e instanceof Error ? e.message : String(e));
    }
  }, [profile?.backendUrl]);

  const handleBan = useCallback(async (userId: number) => {
    if (!profile?.backendUrl) return;
    const token = await getStoredToken();
    if (!token) return;
    const reason = banReason.trim() || t("defaultBanReason");
    try {
      await banUser(profile.backendUrl, token, userId, reason);
      setBanTarget(null);
      setBanReason("");
      void loadUsersPage(usersPage);
      const s = await getStats(profile.backendUrl, token);
      setStats(s);
    } catch (e) {
      Alert.alert(t("adminError"), e instanceof Error ? e.message : String(e));
    }
  }, [profile?.backendUrl, usersPage, banReason]);

  const handleUnban = useCallback(async (userId: number) => {
    if (!profile?.backendUrl) return;
    const token = await getStoredToken();
    if (!token) return;
    try {
      await unbanUser(profile.backendUrl, token, userId);
      void loadUsersPage(usersPage);
      const s = await getStats(profile.backendUrl, token);
      setStats(s);
    } catch (e) {
      Alert.alert(t("adminError"), e instanceof Error ? e.message : String(e));
    }
  }, [profile?.backendUrl, usersPage]);

  const handleDelete = useCallback(async (userId: number, username: string) => {
    Alert.alert(t("confirmDeleteUser"), `${t("confirmDeleteUserHint").replace("{{username}}", username)}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          if (!profile?.backendUrl) return;
          const token = await getStoredToken();
          if (!token) return;
          try {
            await deleteUser(profile.backendUrl, token, userId);
            void loadUsersPage(usersPage);
            const s = await getStats(profile.backendUrl, token);
            setStats(s);
          } catch (e) {
            Alert.alert(t("adminError"), e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, [profile?.backendUrl, usersPage]);

  const handlePromote = useCallback(async (userId: number, currentRole: string) => {
    if (!profile?.backendUrl) return;
    const token = await getStoredToken();
    if (!token) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    const label = newRole === "admin" ? t("promoteToAdmin") : t("demoteToUser");
    Alert.alert(label, `${t("confirmRoleChange").replace("{{role}}", newRole)}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        onPress: async () => {
          try {
            await promoteUser(profile.backendUrl!, token, userId, newRole);
            void loadUsersPage(usersPage);
            const s = await getStats(profile.backendUrl!, token);
            setStats(s);
          } catch (e) {
            Alert.alert(t("adminError"), e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, [profile?.backendUrl, usersPage]);

  const capabilityEntries = Object.entries(health?.capabilities ?? {});
  const totalPages = Math.ceil(usersTotal / 20);

  return (
    <ThemedScreen>
      <ScrollView
        contentContainerClassName="px-5 pb-12 pt-14"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={tokens.accent} />}
      >
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: tokens.accent, fontWeight: "900" }}>‹ {t("back")}</Text>
          </Pressable>
          <View className="items-end">
            <Text style={{ color: tokens.text, fontSize: 25, fontWeight: "900" }}>{t("adminTitle")}</Text>
            <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("adminSubtitle")}</Text>
          </View>
        </View>

        {/* Stats */}
        <Text className="mb-3 mt-8 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
          {t("adminStats")}
        </Text>
        <LiquidControlSurface className="p-5" style={{ borderRadius: 28 }}>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: `${tokens.accent}12` }}>
              <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("totalUsers")}</Text>
              <Text className="mt-1" style={{ color: tokens.text, fontSize: 24, fontWeight: "900" }}>{stats?.users ?? "-"}</Text>
            </View>
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: `${tokens.accent}12` }}>
              <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("adminUsers")}</Text>
              <Text className="mt-1" style={{ color: tokens.text, fontSize: 24, fontWeight: "900" }}>{stats?.admins ?? "-"}</Text>
            </View>
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: `${tokens.accent}12` }}>
              <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("bannedUsers")}</Text>
              <Text className="mt-1" style={{ color: tokens.text, fontSize: 24, fontWeight: "900" }}>{stats?.banned ?? "-"}</Text>
            </View>
          </View>
        </LiquidControlSurface>

        {/* User Management */}
        <Text className="mb-3 mt-8 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
          {t("userManagement")}
        </Text>
        {users.map((u) => (
          <LiquidControlSurface key={u.id} className="mb-3 p-4" style={{ borderRadius: 20 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "800" }}>{u.username}</Text>
                  {u.role === "admin" ? (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${tokens.accent}22` }}>
                      <Text style={{ color: tokens.accent, fontSize: 10, fontWeight: "800" }}>ADMIN</Text>
                    </View>
                  ) : null}
                  {u.banned ? (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#ef444422" }}>
                      <Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "800" }}>BANNED</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-1" style={{ color: tokens.mutedText, fontSize: 12 }}>{u.email}</Text>
                <Text style={{ color: tokens.mutedText, fontSize: 11 }}>{u.created_at}</Text>
                {u.ban_reason ? (
                  <Text className="mt-1" style={{ color: "#ef4444", fontSize: 11 }}>{u.ban_reason}</Text>
                ) : null}
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {u.banned ? (
                <Pressable
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: "#22c55e18" }}
                  onPress={() => void handleUnban(u.id)}
                >
                  <Text style={{ color: "#22c55e", fontSize: 12, fontWeight: "800" }}>{t("unban")}</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: "#ef444418" }}
                  onPress={() => { setBanTarget(u.id); setBanReason(""); }}
                >
                  <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "800" }}>{t("ban")}</Text>
                </Pressable>
              )}
              <Pressable
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: `${tokens.accent}18` }}
                onPress={() => void handlePromote(u.id, u.role)}
              >
                <Text style={{ color: tokens.accent, fontSize: 12, fontWeight: "800" }}>
                  {u.role === "admin" ? t("demoteToUser") : t("promoteToAdmin")}
                </Text>
              </Pressable>
              <Pressable
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: "#ef444418" }}
                onPress={() => void handleDelete(u.id, u.username)}
              >
                <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "800" }}>{t("delete")}</Text>
              </Pressable>
            </View>
            {banTarget === u.id ? (
              <View className="mt-3">
                <View className="h-10 justify-center rounded-xl px-3" style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}>
                  <TextInput
                    value={banReason}
                    onChangeText={setBanReason}
                    placeholder={t("banReasonPlaceholder")}
                    placeholderTextColor={tokens.mutedText}
                    style={{ color: tokens.text, fontSize: 13, paddingVertical: 0 }}
                  />
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: "#ef4444" }}
                    onPress={() => void handleBan(u.id)}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{t("confirmBan")}</Text>
                  </Pressable>
                  <Pressable
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder }}
                    onPress={() => { setBanTarget(null); setBanReason(""); }}
                  >
                    <Text style={{ color: tokens.text, fontSize: 12, fontWeight: "800" }}>{t("cancel")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </LiquidControlSurface>
        ))}

        {/* Pagination */}
        {totalPages > 1 ? (
          <View className="mt-2 flex-row items-center justify-center gap-3">
            <Pressable
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: usersPage <= 1 ? `${tokens.surface}88` : tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder, opacity: usersPage <= 1 ? 0.4 : 1 }}
              disabled={usersPage <= 1}
              onPress={() => void loadUsersPage(usersPage - 1)}
            >
              <Text style={{ color: tokens.text, fontWeight: "800" }}>‹</Text>
            </Pressable>
            <Text style={{ color: tokens.mutedText, fontSize: 13 }}>
              {usersPage} / {totalPages}
            </Text>
            <Pressable
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: usersPage >= totalPages ? `${tokens.surface}88` : tokens.surface, borderWidth: 1, borderColor: tokens.surfaceBorder, opacity: usersPage >= totalPages ? 0.4 : 1 }}
              disabled={usersPage >= totalPages}
              onPress={() => void loadUsersPage(usersPage + 1)}
            >
              <Text style={{ color: tokens.text, fontWeight: "800" }}>›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* User Data */}
        <Text className="mb-3 mt-8 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
          {t("userData")}
        </Text>
        <LiquidControlSurface className="p-5" style={{ borderRadius: 28 }}>
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: "900" }}>{profile?.displayName || t("notLoggedInUser")}</Text>
          <Text className="mt-2" style={{ color: tokens.mutedText }}>{profile?.musicSources ? `${t("currentMusicSource")}：${profile.musicSources}` : t("noMusicSourceSelected")}</Text>
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: `${tokens.accent}12` }}>
              <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("listeningHistory")}</Text>
              <Text className="mt-1" style={{ color: tokens.text, fontSize: 24, fontWeight: "900" }}>{historyCount}</Text>
            </View>
            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: `${tokens.accent}12` }}>
              <Text style={{ color: tokens.mutedText, fontSize: 12 }}>{t("localFavorites")}</Text>
              <Text className="mt-1" style={{ color: tokens.text, fontSize: 24, fontWeight: "900" }}>{favoriteCount}</Text>
            </View>
          </View>
          <View className="mt-4 flex-row gap-4">
            <View className="flex-row items-center gap-2"><StatusDot ok={credentials.netease} /><Text style={{ color: tokens.text }}>{t("neteaseCredential")}</Text></View>
            <View className="flex-row items-center gap-2"><StatusDot ok={credentials.bilibili} /><Text style={{ color: tokens.text }}>{t("bilibiliCredential")}</Text></View>
          </View>
        </LiquidControlSurface>

        {/* Backend Status */}
        <Text className="mb-3 mt-8 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
          {t("backendStatus")}
        </Text>
        <LiquidControlSurface className="p-5" style={{ borderRadius: 28 }}>
          {loading && !health ? <Text style={{ color: tokens.mutedText }}>...</Text> : (
            <>
              <View className="flex-row items-center gap-3">
                <StatusDot ok={Boolean(health?.ok)} />
                <Text style={{ color: tokens.text, fontSize: 18, fontWeight: "900" }}>{health?.status ?? t("checking")}</Text>
              </View>
              <Text className="mt-2" selectable style={{ color: tokens.mutedText }}>{profile?.backendUrl || t("noServerConfigured")}</Text>
              <Text className="mt-2" style={{ color: tokens.mutedText }}>{t("latency")} {health?.latencyMs ?? 0} ms · {health?.checkedAt ?? "-"}</Text>
              <Text className="mt-1" style={{ color: tokens.mutedText }}>{t("neteaseMode")}：{health?.direct ? t("goDirect") : t("upstreamCompatible")}</Text>
              {health?.error ? <Text className="mt-3" style={{ color: "#ef4444" }}>{health.error}</Text> : null}
              {capabilityEntries.length ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {capabilityEntries.map(([name, enabled]) => (
                    <View key={name} className="flex-row items-center gap-1 rounded-full px-3 py-2" style={{ backgroundColor: `${enabled ? "#22c55e" : "#ef4444"}18` }}>
                      <StatusDot ok={enabled} />
                      <Text style={{ color: tokens.text, fontSize: 11 }}>{name}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </LiquidControlSurface>

        {/* Client Logs */}
        <Text className="mb-3 mt-8 text-xs font-bold tracking-[2px]" style={{ color: tokens.mutedText }}>
          {t("clientLogs")}
        </Text>
        <LiquidControlSurface className="overflow-hidden p-4" style={{ borderRadius: 28 }}>
          <Text selectable style={{ color: tokens.mutedText, fontFamily: "monospace", fontSize: 10, lineHeight: 15 }}>{logs || t("noLogs")}</Text>
        </LiquidControlSurface>
      </ScrollView>
    </ThemedScreen>
  );
}
