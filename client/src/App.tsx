import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  applyProgressToLocalStorage,
  exportLocalProgress,
  fetchCloudProgress,
  getLocalProgressUpdatedAt,
  pushCloudProgress,
  touchLocalProgressUpdatedAt,
} from "@/lib/cloudProgress";

// Pages
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import OnlineMenu from "@/pages/OnlineMenu";
import CreateRoom from "@/pages/CreateRoom";
import JoinRoom from "@/pages/JoinRoom";
import OnlineGame from "@/pages/OnlineGame";
import NotFound from "@/pages/not-found";

function MenuMusic() {
  const [location] = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [soundPref, setSoundPref] = useState<"ask" | "enabled">(() => {
    const saved = localStorage.getItem("flappi_sound_pref");
    if (saved === "enabled") return saved;
    return "ask";
  });

  useEffect(() => {
    const audio = new Audio("/audio/cant-let-go.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "auto";
    audio.muted = true;
    audioRef.current = audio;
    audio.load();

    const unlock = () => {
      setUnlocked(true);
    };

    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });

    return () => {
      audio.pause();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  const startNow = () => {
    setUnlocked(true);
    setSoundPref("enabled");
    localStorage.setItem("flappi_sound_pref", "enabled");
    touchLocalProgressUpdatedAt();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const isHome = location === "/";

    // Try to autoplay muted while on Home (allowed in most browsers)
    if (isHome && !unlocked) {
      audio.muted = true;
      audio.play().catch(() => {});
    }

    if (!unlocked) {
      // Can't autoplay; wait for first user interaction.
      if (!isHome) {
        audio.pause();
      }
      return;
    }

    if (isHome) {
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      // Pause but keep currentTime so it resumes where it stopped.
      audio.pause();
    }
  }, [location, unlocked, soundPref]);

  const shouldPrompt = location === "/" && !unlocked && soundPref === "ask";

  if (!shouldPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md p-5 text-center">
        <div className="text-sky-950 font-black text-lg">Ativar som?</div>
        <div className="text-sky-900 font-bold text-sm mt-1">O navegador precisa de uma interação para tocar música.</div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={startNow}
            className="w-full rounded-xl bg-sky-600 text-white font-black py-3 hover:bg-sky-700 transition-colors"
          >
            Ativar som
          </button>
        </div>
      </div>
    </div>
  );
}

function CloudProgressSync() {
  const { user, isReady } = useAuth();
  const didInitialSyncRef = useRef<string | null>(null);
  const lastPushedLocalUpdatedAtRef = useRef<number>(0);

  // Initial sync on login
  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      didInitialSyncRef.current = null;
      return;
    }

    if (didInitialSyncRef.current === user.id) return;
    didInitialSyncRef.current = user.id;

    (async () => {
      const local = exportLocalProgress();
      const localUpdatedAt = typeof local.updatedAt === "number" ? local.updatedAt : 0;

      const remote = await fetchCloudProgress();
      const remoteUpdatedAt = remote?.updatedAt ?? 0;

      if (!remote) {
        await pushCloudProgress({
          ...local,
          updatedAt: localUpdatedAt || Date.now(),
        });
        lastPushedLocalUpdatedAtRef.current = localUpdatedAt;
        return;
      }

      if (remoteUpdatedAt > localUpdatedAt) {
        applyProgressToLocalStorage(remote);
        lastPushedLocalUpdatedAtRef.current = remoteUpdatedAt;
      } else if (localUpdatedAt > remoteUpdatedAt) {
        await pushCloudProgress(local);
        lastPushedLocalUpdatedAtRef.current = localUpdatedAt;
      }
    })().catch(() => {
      // ignore sync failures
    });
  }, [user, isReady]);

  // Periodic push if local updatedAt changes
  useEffect(() => {
    if (!isReady || !user) return;
    const interval = window.setInterval(() => {
      const localUpdatedAt = getLocalProgressUpdatedAt();
      if (!localUpdatedAt) return;
      if (localUpdatedAt <= lastPushedLocalUpdatedAtRef.current) return;

      const local = exportLocalProgress();
      pushCloudProgress(local)
        .then(() => {
          lastPushedLocalUpdatedAtRef.current = localUpdatedAt;
        })
        .catch(() => {
          // ignore
        });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [user, isReady]);

  return null;
}

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/play" component={Game} />
        <Route path="/online" component={OnlineMenu} />
        <Route path="/online/create" component={CreateRoom} />
        <Route path="/online/join" component={JoinRoom} />
        <Route path="/online/game/:code" component={OnlineGame} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <MenuMusic />
          <CloudProgressSync />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
