"use client";

import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface UserAuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

export const useUserAuth = create<UserAuthState>((set) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { set({ user: null, loading: false }); return; }
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  setUser: (u) => set({ user: u }),
  logout: async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    set({ user: null });
  },
}));
