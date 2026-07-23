import { create } from "zustand";
import type { User } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const authStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("hyacine_admin_token") : null,
  user: null,
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("hyacine_admin_token", token);
      } else {
        localStorage.removeItem("hyacine_admin_token");
      }
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hyacine_admin_token");
    }
    set({ token: null, user: null });
  },
}));