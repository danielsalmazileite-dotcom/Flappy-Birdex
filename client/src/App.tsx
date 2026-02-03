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

function MenuBackground() {
  const [location] = useLocation();
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgBirdSeed = useRef(Math.random().toString(36).slice(2, 8));

  const show =
    location === "/" ||
    (location.startsWith("/online") && !location.startsWith("/online/game"));

  useEffect(() => {
    if (!show) return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BIRD_RADIUS = 14;
    const GRAVITY = 0.38;
    const JUMP = -6.2;

    type BgBird = {
      id: string;
      x: number;
      y: number;
      v: number;
      speedX: number;
      nextJumpAt: number;
      isDead: boolean;
      rotation: number;
      topLimit: number;
      bottomLimit: number;
      jumpStrength: number;
      gravityScale: number;
      phase: number;
    };

    const birds: BgBird[] = [];
    let raf = 0;
    let last = performance.now();
    let mounted = true;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const scheduleNextJump = (nowMs: number) => nowMs + rand(350, 1550);

    const spawnBird = (nowMs: number) => {
      if (birds.length >= 7) return;
      const id = `${bgBirdSeed.current}-${Date.now()}-${birds.length}`;

      const topLimit = rand(40, 90);
      const bottomLimit = rand(window.innerHeight * 0.55, window.innerHeight * 0.78);
      const jumpStrength = JUMP * rand(0.88, 1.12);
      const gravityScale = rand(0.85, 1.2);

      birds.push({
        id,
        x: -40,
        y: rand(window.innerHeight * 0.14, window.innerHeight * 0.34),
        v: rand(-1, 1),
        speedX: rand(70, 115),
        nextJumpAt: nowMs + rand(150, 1400),
        isDead: false,
        rotation: 0,
        topLimit,
        bottomLimit,
        jumpStrength,
        gravityScale,
        phase: rand(0, Math.PI * 2),
      });
    };

    const drawBgBird = (x: number, y: number, rotation: number, frame: number, isDead: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const baseBird = {
        light: "#fff8b3",
        main: "#ffeb3b",
        dark: "#ffc107",
        stroke: "#e65100",
      };

      const grad = ctx.createRadialGradient(-5, -8, 2, 0, 0, BIRD_RADIUS);
      grad.addColorStop(0, baseBird.light);
      grad.addColorStop(0.35, baseBird.main);
      grad.addColorStop(0.75, baseBird.dark);
      grad.addColorStop(1, baseBird.stroke);

      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = baseBird.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-5, -8, 7, 4, -0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(7, -4, 5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(12, 2);
      ctx.lineTo(22, 5);
      ctx.lineTo(12, 9);
      ctx.closePath();
      ctx.fillStyle = "#ff6a2a";
      ctx.fill();

      const wingFrame = isDead ? 1 : Math.floor(frame / 5) % 3;
      const wingRotation = isDead ? 0 : wingFrame === 0 ? -0.3 : wingFrame === 1 ? 0 : 0.3;

      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.save();
      ctx.translate(2, 2);
      ctx.rotate(wingRotation - 0.4);
      ctx.scale(0.7, 0.7);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -15, -25, -20, -35, -5);
      ctx.bezierCurveTo(-38, 0, -30, 5, -25, 2);
      ctx.bezierCurveTo(-28, 8, -25, 12, -18, 10);
      ctx.bezierCurveTo(-20, 15, -15, 18, -10, 14);
      ctx.bezierCurveTo(-12, 20, -5, 22, 0, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-25, -8);
      ctx.moveTo(-8, 2);
      ctx.lineTo(-18, 3);
      ctx.moveTo(-5, 8);
      ctx.lineTo(-12, 9);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    let nextSpawnAt = performance.now() + rand(120, 650);

    const tick = () => {
      if (!mounted) return;
      const now = performance.now();
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;

      if (now >= nextSpawnAt) {
        spawnBird(now);
        nextSpawnAt = now + rand(250, 950);
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      birds.forEach((b) => {
        if (b.isDead) return;

        b.x += b.speedX * dt;

        if (now >= b.nextJumpAt) {
          b.v = b.jumpStrength;
          b.nextJumpAt = scheduleNextJump(now);
        }

        b.v += GRAVITY * b.gravityScale;
        b.y += b.v;

        if (b.y < b.topLimit) {
          b.y = b.topLimit;
          b.v = Math.abs(b.v) * 0.3;
        }

        if (b.y > b.bottomLimit) {
          b.y = b.bottomLimit;
          b.v = -Math.abs(b.v) * 0.35;
        }

        const targetRot = Math.max(-0.7, Math.min(1.0, b.v * 0.08));
        b.rotation += (targetRot - b.rotation) * Math.min(1, dt * 10);

        const float = Math.sin(now / 600 + b.phase) * 0.4;
        drawBgBird(b.x, b.y + float, b.rotation, Math.floor(now / 16), b.isDead);
      });

      for (let i = birds.length - 1; i >= 0; i--) {
        if (birds[i].x > window.innerWidth + 80) {
          birds.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none relative" aria-hidden="true">
      <div className="home-sky">
        <div className="home-cloud home-cloud-1" />
        <div className="home-cloud home-cloud-2" />
        <div className="home-cloud home-cloud-3" />
        <div className="home-cloud home-cloud-4" />
      </div>
      <canvas ref={bgCanvasRef} className="home-birds-canvas" />
    </div>
  );
}

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
    const audio = new Audio("/audio/OMFGJR-omfg-hello-2d4b127f.mp3");
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

    const isMenu = location === "/" || location.startsWith("/online");
    const isInMatch = location.startsWith("/online/game");
    const shouldPlay = isMenu && !isInMatch;

    // Try to autoplay muted while on Home (allowed in most browsers)
    if (shouldPlay && !unlocked) {
      audio.muted = true;
      audio.play().catch(() => {});
    }

    if (!unlocked) {
      // Can't autoplay; wait for first user interaction.
      if (!shouldPlay) {
        audio.pause();
      }
      return;
    }

    if (shouldPlay) {
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      // Pause but keep currentTime so it resumes where it stopped.
      audio.pause();
    }
  }, [location, unlocked, soundPref]);

  const shouldPrompt = !unlocked && soundPref === "ask" && (location === "/" || location.startsWith("/online"));

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
          <MenuBackground />
          <MenuMusic />
          <CloudProgressSync />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
