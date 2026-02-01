export type CloudProgress = {
  updatedAt: number;
  stats?: any;
  selectedChar?: string;
  nickname?: string;
  soundPref?: string;
};

const LOCAL_PROGRESS_UPDATED_AT_KEY = "flappi_progress_updated_at";

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "";

function buildApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function getLocalProgressUpdatedAt(): number {
  const raw = localStorage.getItem(LOCAL_PROGRESS_UPDATED_AT_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function touchLocalProgressUpdatedAt(): number {
  const now = Date.now();
  localStorage.setItem(LOCAL_PROGRESS_UPDATED_AT_KEY, String(now));
  return now;
}

export function exportLocalProgress(): CloudProgress {
  const updatedAt = getLocalProgressUpdatedAt();
  const statsRaw = localStorage.getItem("flappi_birdex_stats");

  return {
    updatedAt,
    stats: statsRaw ? safeJsonParse(statsRaw) : undefined,
    selectedChar: localStorage.getItem("flappi_selected_char") || undefined,
    nickname: localStorage.getItem("flappi_nickname") || undefined,
    soundPref: localStorage.getItem("flappi_sound_pref") || undefined,
  };
}

export function applyProgressToLocalStorage(progress: CloudProgress) {
  if (progress.stats !== undefined) {
    localStorage.setItem("flappi_birdex_stats", JSON.stringify(progress.stats));
  }
  if (typeof progress.selectedChar === "string") {
    localStorage.setItem("flappi_selected_char", progress.selectedChar);
  }
  if (typeof progress.nickname === "string") {
    localStorage.setItem("flappi_nickname", progress.nickname);
  }
  if (typeof progress.soundPref === "string") {
    localStorage.setItem("flappi_sound_pref", progress.soundPref);
  }

  const remoteUpdatedAt = typeof progress.updatedAt === "number" ? progress.updatedAt : Date.now();
  localStorage.setItem(LOCAL_PROGRESS_UPDATED_AT_KEY, String(remoteUpdatedAt));
}

function getToken(): string | null {
  try {
    return localStorage.getItem("flappi_auth_token");
  } catch {
    return null;
  }
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

export async function fetchCloudProgress(): Promise<CloudProgress | null> {
  const token = getToken();
  if (!token) return null;
  const data = await apiJson("/api/progress", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return (data ?? null) as CloudProgress | null;
}

export async function pushCloudProgress(progress: CloudProgress) {
  const token = getToken();
  if (!token) return;
  await apiJson("/api/progress", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(progress),
  });
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
