"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStore } from "@/store/auth";
import { getUsers, getStats, banUser, unbanUser, deleteUser, promoteUser, type User, type Stats } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = authStore();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const token = authStore.getState().token;
    if (!token) {
      router.push("/");
      return;
    }
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([getUsers(page), getStats()]);
      setUsers(usersData.users);
      setTotal(usersData.total);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: number, currentStatus: boolean) => {
    const reason = currentStatus ? "" : prompt("请输入封禁原因：") || "违反社区规范";
    if (!currentStatus && !reason) return;

    setActionLoading(userId);
    try {
      if (currentStatus) {
        await unbanUser(userId);
      } else {
        await banUser(userId, reason);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("确定要删除此用户吗？此操作不可恢复。")) return;

    setActionLoading(userId);
    try {
      await deleteUser(userId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`确定要将此用户${newRole === "admin" ? "提升为管理员" : "降为普通用户"}吗？`)) return;

    setActionLoading(userId);
    try {
      await promoteUser(userId, newRole);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">风堇音乐管理后台</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>欢迎，{user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            退出登录
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>总用户</p>
              <p className="text-3xl font-bold">{stats.users}</p>
            </div>
            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>管理员</p>
              <p className="text-3xl font-bold">{stats.admins}</p>
            </div>
            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>封禁用户</p>
              <p className="text-3xl font-bold">{stats.banned}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold">用户列表</h2>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>ID</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>用户名</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>邮箱</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>角色</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>状态</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>注册时间</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--muted)" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                  <td className="p-4">{u.id}</td>
                  <td className="p-4">{u.username}</td>
                  <td className="p-4" style={{ color: "var(--muted)" }}>{u.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: u.role === "admin" ? "var(--accent)" : "var(--border)" }}>
                      {u.role === "admin" ? "管理员" : "用户"}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.banned ? (
                      <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">已封禁</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">正常</span>
                    )}
                  </td>
                  <td className="p-4 text-sm" style={{ color: "var(--muted)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {u.role !== "admin" && (
                        <>
                          <button
                            onClick={() => handleBan(u.id, u.banned)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 rounded text-sm border disabled:opacity-50"
                            style={{ borderColor: u.banned ? "var(--accent)" : undefined }}
                          >
                            {u.banned ? "解封" : "封禁"}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 rounded text-sm border border-red-500/50 text-red-400 disabled:opacity-50"
                          >
                            删除
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handlePromote(u.id, u.role)}
                        disabled={actionLoading === u.id}
                        className="px-3 py-1 rounded text-sm border disabled:opacity-50"
                        style={{ borderColor: "var(--accent)" }}
                      >
                        {u.role === "admin" ? "降权" : "提权"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > 20 && (
            <div className="p-4 flex items-center justify-between border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                共 {total} 个用户
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}