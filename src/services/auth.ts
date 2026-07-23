import * as SecureStore from "expo-secure-store";
import { apiBase } from "@/utils/apiBase";

const TOKEN_KEY = "hyacine.auth.token";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function sendVerificationCode(
  backendUrl: string,
  email: string
): Promise<{ message: string }> {
  const base = apiBase(backendUrl);
  const response = await fetch(`${base}/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send code");
  }
  return data;
}

export async function register(
  backendUrl: string,
  username: string,
  email: string,
  password: string,
  code: string
): Promise<AuthResponse> {
  const base = apiBase(backendUrl);
  const response = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, code }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }
  return data;
}

export async function login(
  backendUrl: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const base = apiBase(backendUrl);
  const response = await fetch(`${base}/auth/login`, {
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

export async function getCurrentUser(
  backendUrl: string,
  token: string
): Promise<User> {
  const base = apiBase(backendUrl);
  const response = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Failed to get user info");
  }
  return response.json();
}
