import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { touchLocalProgressUpdatedAt } from "./cloudProgress";

type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signOutNow: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "flappi_auth_token";

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "";

function buildApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

async function apiJson(path: string, init?: RequestInit) {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.message === "string" ? data.message : "Erro";
    throw new Error(msg);
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsReady(true);
      return;
    }

    apiJson("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        setUser(data.user ?? null);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isReady,
      register: async (name: string, email: string, password: string) => {
        const data = await apiJson("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });
        if (typeof data?.token === "string") {
          setToken(data.token);
        }
        if (data?.user) {
          setUser(data.user);
        }

        try {
          localStorage.setItem("flappi_nickname", name.trim().slice(0, 18));
          touchLocalProgressUpdatedAt();
        } catch {}
      },
      login: async (email: string, password: string) => {
        const data = await apiJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (typeof data?.token === "string") {
          setToken(data.token);
        }
        if (data?.user) {
          setUser(data.user);
        }
      },
      signOutNow: async () => {
        setToken(null);
        setUser(null);
      },
    };
  }, [user, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
