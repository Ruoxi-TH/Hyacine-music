import { authStore } from "@/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export interface Stats {
  users: number;
  admins: number;
  banned: number;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authStore.getState().token;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetchWithAuth(`${API_BASE}/auth/me`);
  if (!response.ok) {
    throw new Error("Failed to get user info");
  }
  return response.json();
}

export async function getUsers(page: number = 1): Promise<{ users: User[]; total: number }> {
  const response = await fetchWithAuth(`${API_BASE}/admin/users?page=${page}`);
  if (!response.ok) {
    throw new Error("Failed to get users");
  }
  return response.json();
}

export async function getStats(): Promise<Stats> {
  const response = await fetchWithAuth(`${API_BASE}/admin/stats`);
  if (!response.ok) {
    throw new Error("Failed to get stats");
  }
  return response.json();
}

export async function banUser(userId: number, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/admin/users/ban`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, reason }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to ban user");
  }
}

export async function unbanUser(userId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/admin/users/unban`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to unban user");
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/admin/users/delete`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to delete user");
  }
}

export async function promoteUser(userId: number, role: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/admin/users/promote`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to promote user");
  }
}