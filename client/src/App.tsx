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

function ThemeSync() {
  useEffect(() => {
    const hexToRgb = (hex: string) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return null;
      return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
    };
    const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    const rgbToHex = (r: number, g: number, b: number) =>
      `#${clamp255(r).toString(16).padStart(2, "0")}${clamp255(g).toString(16).padStart(2, "0")}${clamp255(b).toString(16).padStart(2, "0")}`;
    const mix = (a: string, b: string, t: number) => {
      const ra = hexToRgb(a);
      const rb = hexToRgb(b);
      if (!ra || !rb) return a;
      return rgbToHex(
        ra.r + (rb.r - ra.r) * t,
        ra.g + (rb.g - ra.g) * t,
        ra.b + (rb.b - ra.b) * t,
      );
    };

    const apply = () => {
      const main = localStorage.getItem("flappi_bird_color") || "#ffeb3b";
      const accent = main;
      const accentDark = mix(main, "#000000", 0.55);
      const accentDarker = mix(main, "#000000", 0.72);
      const accentLight = mix(main, "#ffffff", 0.72);
      const bgTop = mix(main, "#ffffff", 0.82);
      const bgBottom = mix(main, "#ffffff", 0.62);

      const root = document.documentElement;
      root.style.setProperty("--theme-accent", accent);
      root.style.setProperty("--theme-accent-dark", accentDark);
      root.style.setProperty("--theme-accent-darker", accentDarker);
      root.style.setProperty("--theme-accent-light", accentLight);
      root.style.setProperty("--theme-bg-top", bgTop);
      root.style.setProperty("--theme-bg-bottom", bgBottom);
      root.style.setProperty("--theme-text", accentDarker);
    };

    apply();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "flappi_bird_color" || e.key == null) apply();
    };
    const onTheme = () => apply();
    window.addEventListener("storage", onStorage);
    window.addEventListener("flappi-theme-changed", onTheme as EventListener);
    window.addEventListener("focus", onTheme);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("flappi-theme-changed", onTheme as EventListener);
      window.removeEventListener("focus", onTheme);
    };
  }, []);

  return null;
}

function MenuBackground() {
  const [location] = useLocation();
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgBirdSeed = useRef(Math.random().toString(36).slice(2, 8));

  const show =
    location === "/" ||
    (location.startsWith("/online") && !location.startsWith("/online/game"));

  useEffect(() => {
    const body = document.body;
    if (show) body.classList.add("menu-mode");
    else body.classList.remove("menu-mode");
    return () => body.classList.remove("menu-mode");
  }, [show]);

  useEffect(() => {
    const body = document.body;
    const isOnlineMatch = location.startsWith("/online/game");
    if (isOnlineMatch) body.classList.add("online-mode");
    else body.classList.remove("online-mode");
    return () => body.classList.remove("online-mode");
  }, [location]);

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
      baseY: number;
      ampY: number;
      wobbleSpeed: number;
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

    const hexToRgb = (hex: string) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return null;
      return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
    };
    const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    const rgbToHex = (r: number, g: number, b: number) =>
      `#${clamp255(r).toString(16).padStart(2, "0")}${clamp255(g).toString(16).padStart(2, "0")}${clamp255(b).toString(16).padStart(2, "0")}`;
    const mix = (a: string, b: string, t: number) => {
      const ra = hexToRgb(a);
      const rb = hexToRgb(b);
      if (!ra || !rb) return a;
      return rgbToHex(
        ra.r + (rb.r - ra.r) * t,
        ra.g + (rb.g - ra.g) * t,
        ra.b + (rb.b - ra.b) * t,
      );
    };

    const getBirdPalette = () => {
      const main = localStorage.getItem("flappi_bird_color") || "#ffeb3b";
      const wing = localStorage.getItem("flappi_wing_color") || "#ffffff";
      const eye = localStorage.getItem("flappi_eye_color") || "#ffffff";
      const pupil = localStorage.getItem("flappi_pupil_color") || "#000000";
      const beak = localStorage.getItem("flappi_beak_color") || "#ff6a2a";
      return {
        main,
        light: mix(main, "#ffffff", 0.55),
        dark: mix(main, "#000000", 0.2),
        stroke: mix(main, "#000000", 0.45),
        wing,
        eye,
        pupil,
        beak,
      };
    };

    const spawnBird = (nowMs: number) => {
      if (birds.length >= 7) return;
      const id = `${bgBirdSeed.current}-${Date.now()}-${birds.length}`;

      const topLimit = rand(18, Math.max(70, window.innerHeight * 0.18));
      const bottomLimit = rand(window.innerHeight * 0.32, window.innerHeight * 0.78);
      const jumpStrength = JUMP * rand(0.88, 1.12);
      const gravityScale = rand(0.85, 1.2);

      const baseY = rand(window.innerHeight * 0.14, window.innerHeight * 0.62);
      const ampY = rand(10, 42);
      const wobbleSpeed = rand(0.0012, 0.0024);

      birds.push({
        id,
        x: -40,
        y: baseY,
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
        baseY,
        ampY,
        wobbleSpeed,
      });
    };

    const drawBgBird = (x: number, y: number, rotation: number, frame: number, isDead: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const baseBird = getBirdPalette();

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
      ctx.fillStyle = baseBird.eye;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = baseBird.pupil;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(12, 2);
      ctx.lineTo(22, 5);
      ctx.lineTo(12, 9);
      ctx.closePath();
      ctx.fillStyle = baseBird.beak;
      ctx.fill();

      const wingFrame = isDead ? 1 : Math.floor(frame / 5) % 3;
      const wingRotation = isDead ? 0 : wingFrame === 0 ? -0.3 : wingFrame === 1 ? 0 : 0.3;

      ctx.fillStyle = baseBird.wing;
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

        const targetY = b.baseY + Math.sin(now * b.wobbleSpeed + b.phase) * b.ampY;
        const dy = targetY - b.y;
        b.y += dy * Math.min(1, dt * 3.5);

        const targetRot = Math.max(-0.6, Math.min(0.6, dy * 0.02));
        b.rotation += (targetRot - b.rotation) * Math.min(1, dt * 10);

        drawBgBird(b.x, b.y, b.rotation, Math.floor(now / 16), b.isDead);
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
    <div
      className="fixed inset-0 z-0 pointer-events-none relative"
      aria-hidden="true"
    >
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

    // Try to autoplay muted on any route (allowed in most browsers)
    if (!unlocked) {
      audio.muted = true;
      audio.play().catch(() => {});
      return;
    }

    // Once unlocked, keep the same track playing continuously across the app.
    audio.muted = false;
    audio.play().catch(() => {});
  }, [location, unlocked, soundPref]);

  const shouldPrompt = !unlocked && soundPref === "ask" && (location === "/" || location.startsWith("/online"));

  if (!shouldPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md p-5 text-center">
        <div className="text-sky-950 font-black text-lg">Enable sound?</div>
        <div className="text-sky-900 font-bold text-sm mt-1">Your browser needs an interaction to play music.</div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={startNow}
            className="w-full rounded-xl bg-sky-600 text-white font-black py-3 hover:bg-sky-700 transition-colors"
          >
            Enable sound
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
          <ThemeSync />
          <MenuBackground />
          <MenuMusic />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
