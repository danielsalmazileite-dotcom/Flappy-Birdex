import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Gamepad2, Globe, Settings, User } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { CharacterType, CHARACTERS, getPlayerStats } from "@/lib/playerStats";
import { useAuth } from "@/lib/auth";
import {
  applyProgressToLocalStorage,
  exportLocalProgress,
  fetchCloudProgress,
  pushCloudProgress,
  touchLocalProgressUpdatedAt,
} from "@/lib/cloudProgress";

type HomeRunner = {
  id: string;
  topPct: number;
  size: number;
  runDurationSec: number;
  bounceDurationSec: number;
};

export default function Home() {
  const { user, isReady, register, login, signOutNow } = useAuth();
  const [character, setCharacter] = useState<CharacterType>(() => {
    return (localStorage.getItem("flappi_selected_char") as CharacterType) || "bird";
  });
  const [stats] = useState(getPlayerStats());
  const [showStats, setShowStats] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [authMode, setAuthMode] = useState<"none" | "register" | "login">("none");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgBirdSeed = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  useEffect(() => {
    localStorage.setItem("flappi_selected_char", character);
    touchLocalProgressUpdatedAt();
  }, [character]);

  useEffect(() => {
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
      const id = `${bgBirdSeed}-${Date.now()}-${birds.length}`;

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

      // shine
      ctx.beginPath();
      ctx.ellipse(-5, -8, 7, 4, -0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();

      // eye
      ctx.beginPath();
      ctx.arc(7, -4, 5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();

      // beak
      ctx.beginPath();
      ctx.moveTo(12, 2);
      ctx.lineTo(22, 5);
      ctx.lineTo(12, 9);
      ctx.closePath();
      ctx.fillStyle = "#ff6a2a";
      ctx.fill();

      // wing (same shape style as GameCanvas)
      const wingFrame = isDead ? 1 : (Math.floor(frame / 5) % 3);
      const wingRotation = isDead ? 0 : (wingFrame === 0 ? -0.3 : (wingFrame === 1 ? 0 : 0.3));

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

      const frame = Math.floor(now / (1000 / 60));

      // spawn with random cadence (timestamp-based to avoid synchronized bursts)
      if (birds.length < 7 && now >= nextSpawnAt) {
        spawnBird(now);
        nextSpawnAt = now + rand(220, 900);
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];

        if (!b.isDead) {
          b.x += b.speedX * dt;
        }

        b.v += GRAVITY * b.gravityScale * 60 * dt;

        // small per-bird vertical "wind" so they don't line up
        if (!b.isDead) {
          b.v += Math.sin((now / 1000) * rand(1.2, 1.9) + b.phase) * 0.012 * 60 * dt;
        }
        b.y += b.v * 60 * dt;

        if (!b.isDead && now >= b.nextJumpAt) {
          b.v = b.jumpStrength;
          b.nextJumpAt = scheduleNextJump(now);
        }

        // Keep birds on-screen without a "hard" invisible floor.
        // When approaching the bottom, auto-jump more aggressively.
        if (!b.isDead && b.y > b.bottomLimit) {
          b.v = Math.min(b.v, 0);
          b.v = b.jumpStrength * rand(0.95, 1.12);
          b.nextJumpAt = now + rand(280, 900);
        }
        // When too close to the top, damp upward velocity to avoid flying off-screen.
        if (!b.isDead && b.y < b.topLimit) {
          b.v = Math.max(b.v, rand(1.0, 1.6));
          b.y = b.topLimit;
        }

        if (b.isDead) {
          b.rotation = Math.min(Math.PI / 2, b.rotation + 3.2 * dt);
        } else {
          b.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, b.v * 0.08));
        }
        drawBgBird(b.x, b.y, b.rotation, frame, b.isDead);

        if (b.x > window.innerWidth + 60 || b.y > window.innerHeight + 80) {
          birds.splice(i, 1);
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-home-ui]")) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // hit-test from topmost (last) to first
      for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];
        if (b.isDead) continue;
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy <= (BIRD_RADIUS + 10) * (BIRD_RADIUS + 10)) {
          b.isDead = true;
          b.speedX = 0; // fall in a straight line
          b.nextJumpAt = Number.POSITIVE_INFINITY;
          b.v = Math.max(b.v, 0);
          break;
        }
      }
    };

    window.addEventListener("pointerdown", onPointerDown);

    // ensure at least one bird appears quickly
    spawnBird(performance.now());

    raf = window.requestAnimationFrame(tick);

    return () => {
      mounted = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [bgBirdSeed]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="home-sky" aria-hidden="true">
        <div className="home-cloud home-cloud-1" />
        <div className="home-cloud home-cloud-2" />
        <div className="home-cloud home-cloud-3" />
        <div className="home-cloud home-cloud-4" />
      </div>

      <canvas ref={bgCanvasRef} className="home-birds-canvas" aria-hidden="true" />

      <GlassCard className="py-8 z-10" data-home-ui>
        <div className="w-full flex justify-between items-center mb-4">
           <div />
           <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-sky-600 to-sky-950 drop-shadow-sm">
            Flappi Birdex
          </h1>
          <GlossyButton onClick={() => setShowStats(!showStats)} className="w-auto min-w-0 px-3 py-3 rounded-full">
            <User className="w-6 h-6" />
          </GlossyButton>
        </div>
        
        {showStats ? (
          <div className="w-full text-left space-y-2 mb-6 bg-white/30 p-4 rounded-xl">
            <h3 className="font-bold text-sky-950 mb-2">Suas Estatísticas</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Flaps: <strong>{stats.totalFlaps}</strong></div>
              <div>Melhor (C): <strong>{stats.bestScore}</strong></div>
              <div>Melhor (H): <strong>{stats.bestHardcoreScore}</strong></div>
              <div>Online: <strong>{stats.onlineMatchesPlayed}</strong></div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/40">
              <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Conta</div>
              {!isReady ? (
                <div className="text-xs text-sky-900 font-bold">Carregando conta...</div>
              ) : user ? (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-sky-950">Logado</div>
                  <div className="text-xs text-sky-900 font-bold break-all">{user.email}</div>
                  <button
                    onClick={async () => {
                      try {
                        setAuthError(null);
                        setAuthInfo(null);
                        const remote = await fetchCloudProgress();
                        if (!remote) {
                          setAuthError("Sem dados salvos na nuvem.");
                          return;
                        }
                        applyProgressToLocalStorage(remote);
                        setAuthInfo("Stats carregados da conta!");
                        window.location.reload();
                      } catch (e: any) {
                        setAuthError(e?.message || "Erro ao carregar");
                      }
                    }}
                    className="w-full rounded-xl bg-white/60 border border-white/70 text-sky-950 font-black py-2 hover:bg-white/70 transition-colors"
                  >
                    Load stats
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setAuthError(null);
                        setAuthInfo(null);
                        const now = touchLocalProgressUpdatedAt();
                        const local = exportLocalProgress();
                        await pushCloudProgress({
                          ...local,
                          updatedAt: local.updatedAt || now,
                        });
                        setAuthInfo("Stats salvos na conta!");
                      } catch (e: any) {
                        setAuthError(e?.message || "Erro ao salvar");
                      }
                    }}
                    className="w-full rounded-xl bg-sky-600 text-white font-black py-2 hover:bg-sky-700 transition-colors"
                  >
                    Salvar stats
                  </button>
                  <button
                    onClick={() => {
                      signOutNow().catch(() => {});
                    }}
                    className="w-full rounded-xl bg-white/60 border border-white/70 text-sky-950 font-black py-2 hover:bg-white/70 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {authError ? <div className="text-xs font-bold text-red-700">{authError}</div> : null}
                  {authInfo ? <div className="text-xs font-bold text-sky-900">{authInfo}</div> : null}

                  {authMode === "none" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setAuthError(null);
                          setAuthInfo(null);
                          setAuthMode("register");
                        }}
                        className="w-full rounded-xl bg-sky-600 text-white font-black py-2 hover:bg-sky-700 transition-colors"
                      >
                        Criar conta
                      </button>
                      <button
                        onClick={() => {
                          setAuthError(null);
                          setAuthInfo(null);
                          setAuthMode("login");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-sky-950 font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Entrar
                      </button>
                    </div>
                  ) : null}

                  {authMode === "register" ? (
                    <div className="space-y-2">
                      <input
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Nome"
                      />
                      <input
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Email"
                      />
                      <input
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        type="password"
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Senha (mín. 6)"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setAuthError(null);
                            setAuthInfo(null);
                            await register(authName, authEmail, authPassword);
                            setAuthMode("none");
                            setAuthInfo("Conta criada e logada!");
                          } catch (e: any) {
                            setAuthError(e?.message || "Erro");
                          }
                        }}
                        className="w-full rounded-xl bg-sky-600 text-white font-black py-2 hover:bg-sky-700 transition-colors"
                      >
                        Criar conta
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("none");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-sky-950 font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Voltar
                      </button>
                    </div>
                  ) : null}

                  {authMode === "login" ? (
                    <div className="space-y-2">
                      <input
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Email"
                      />
                      <input
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        type="password"
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Senha"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setAuthError(null);
                            setAuthInfo(null);
                            await login(authEmail, authPassword);
                            setAuthMode("none");
                            setAuthInfo("Logado!");
                          } catch (e: any) {
                            setAuthError(e?.message || "Erro");
                          }
                        }}
                        className="w-full rounded-xl bg-sky-600 text-white font-black py-2 hover:bg-sky-700 transition-colors"
                      >
                        Entrar
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("none");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-sky-950 font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Voltar
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full mb-6">
            <div
              className="flex flex-col items-center gap-2 p-4 bg-white/30 rounded-xl border border-white/50 relative cursor-pointer hover:bg-white/40 transition-colors"
              onClick={() => setShowCharacterSelect(!showCharacterSelect)}
            >
              <span className="text-sm font-bold text-sky-900 uppercase tracking-wider">Personagem Atual</span>
              <span className="text-xl font-black text-sky-950">{CHARACTERS.find(c => c.type === character)?.label}</span>
            </div>

            {showCharacterSelect && (
              <div className="w-full grid grid-cols-2 gap-2 mt-4">
                {CHARACTERS.map((char) => {
                  const unlocked = char.isUnlocked(stats);
                  const isSelected = character === char.type;
                  return (
                    <button
                      key={char.type}
                      onClick={() => unlocked && setCharacter(char.type)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? "border-sky-500 bg-sky-100/50"
                          : "border-transparent bg-white/20 hover:bg-white/40"
                      } ${!unlocked && "opacity-50 grayscale cursor-not-allowed"}`}
                    >
                      <div className="text-xs font-black uppercase tracking-tight text-sky-950">{char.label}</div>
                      {!unlocked && (
                        <div className="text-[8px] mt-1 text-red-600 font-bold uppercase">{char.unlockRequirement}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <Link href="/play" className="w-full block">
            <GlossyButton className="w-full md:w-full min-w-0 text-xl py-6" data-testid="button-play">
              <Gamepad2 className="w-6 h-6" /> Jogar Solo
            </GlossyButton>
          </Link>
          
          <Link href="/online" className="w-full block">
            <GlossyButton className="w-full md:w-full min-w-0 text-xl py-6" data-testid="button-online">
              <Globe className="w-6 h-6" /> Partida Online
            </GlossyButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
