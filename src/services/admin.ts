import { apiBase } from "@/utils/apiBase";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export interface AdminStats {
  users: number;
  admins: number;
  banned: number;
}

export interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
}

async function adminFetch(backendUrl: string, token: string, path: string, init?: RequestInit): Promise<Response> {
  const base = apiBase(backendUrl);
  const response = await fetch(`${base}/admin${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || `HTTP ${response.status}`);
  }
  return response;
}

export async function listUsers(backendUrl: string, token: string, page = 1): Promise<ListUsersResponse> {
  const response = await adminFetch(backendUrl, token, `/users?page=${page}`);
  return response.json();
}

export async function getStats(backendUrl: string, token: string): Promise<AdminStats> {
  const response = await adminFetch(backendUrl, token, "/stats");
  return response.json();
}

export async function banUser(backendUrl: string, token: string, userId: number, reason?: string): Promise<void> {
  await adminFetch(backendUrl, token, "/users/ban", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, reason: reason || "" }),
  });
}

export async function unbanUser(backendUrl: string, token: string, userId: number): Promise<void> {
  await adminFetch(backendUrl, token, "/users/unban", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function deleteUser(backendUrl: string, token: string, userId: number): Promise<void> {
  await adminFetch(backendUrl, token, "/users/delete", {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function promoteUser(backendUrl: string, token: string, userId: number, role: string): Promise<void> {
  await adminFetch(backendUrl, token, "/users/promote", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
}
