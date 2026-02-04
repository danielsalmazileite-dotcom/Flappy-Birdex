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
  const [birdColor, setBirdColor] = useState(() => localStorage.getItem("flappi_bird_color") || "#ffeb3b");
  const [wingColor, setWingColor] = useState(() => localStorage.getItem("flappi_wing_color") || "#ffffff");
  const [eyeColor, setEyeColor] = useState(() => localStorage.getItem("flappi_eye_color") || "#ffffff");
  const [pupilColor, setPupilColor] = useState(() => localStorage.getItem("flappi_pupil_color") || "#000000");
  const [beakColor, setBeakColor] = useState(() => localStorage.getItem("flappi_beak_color") || "#ff5722");
  const [stats] = useState(getPlayerStats());
  const [showStats, setShowStats] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [authMode, setAuthMode] = useState<"none" | "register" | "login">("none");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("flappi_selected_char", character);
    touchLocalProgressUpdatedAt();
  }, [character]);

  useEffect(() => {
    localStorage.setItem("flappi_bird_color", birdColor);
    touchLocalProgressUpdatedAt();
    window.dispatchEvent(new Event("flappi-theme-changed"));
  }, [birdColor]);

  useEffect(() => {
    localStorage.setItem("flappi_wing_color", wingColor);
    touchLocalProgressUpdatedAt();
  }, [wingColor]);

  useEffect(() => {
    localStorage.setItem("flappi_eye_color", eyeColor);
    touchLocalProgressUpdatedAt();
  }, [eyeColor]);

  useEffect(() => {
    localStorage.setItem("flappi_pupil_color", pupilColor);
    touchLocalProgressUpdatedAt();
  }, [pupilColor]);

  useEffect(() => {
    localStorage.setItem("flappi_beak_color", beakColor);
    touchLocalProgressUpdatedAt();
  }, [beakColor]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <GlassCard className="py-8 z-10" data-home-ui>
        <div className="w-full flex justify-between items-center mb-4">
          <div />
          <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--theme-accent,#51c8ff)] to-[var(--theme-accent-darker,#0b2a5a)] drop-shadow-sm">
            Flappi Birdex
          </h1>
          <GlossyButton onClick={() => setShowStats(!showStats)} className="w-auto min-w-0 px-3 py-3 rounded-full">
            <User className="w-6 h-6" />
          </GlossyButton>
        </div>
        
        {showStats ? (
          <div className="w-full text-left space-y-2 mb-6 bg-white/30 p-4 rounded-xl">
            <h3 className="font-bold text-[color:var(--theme-text,#0b2a5a)] mb-2">Your Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Flaps: <strong>{stats.totalFlaps}</strong></div>
              <div>Best (C): <strong>{stats.bestScore}</strong></div>
              <div>Best (H): <strong>{stats.bestHardcoreScore}</strong></div>
              <div>Online: <strong>{stats.onlineMatchesPlayed}</strong></div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/40">
              <div className="text-xs font-black uppercase tracking-wide text-[color:var(--theme-accent-dark,#1b4d7a)] mb-2">Account</div>
              {!isReady ? (
                <div className="text-xs text-[color:var(--theme-accent-dark,#1b4d7a)] font-bold">Loading account...</div>
              ) : user ? (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-[color:var(--theme-text,#0b2a5a)]">Signed in</div>
                  <div className="text-xs text-[color:var(--theme-accent-dark,#1b4d7a)] font-bold break-all">{user.email}</div>
                  <button
                    onClick={async () => {
                      try {
                        setAuthError(null);
                        setAuthInfo(null);
                        const remote = await fetchCloudProgress();
                        if (!remote) {
                          setAuthError("No cloud data found.");
                          return;
                        }
                        applyProgressToLocalStorage(remote);
                        setAuthInfo("Progress loaded from your account!");
                        window.location.reload();
                      } catch (e: any) {
                        setAuthError(e?.message || "Failed to load");
                      }
                    }}
                    className="w-full rounded-xl bg-white/60 border border-white/70 text-[color:var(--theme-text,#0b2a5a)] font-black py-2 hover:bg-white/70 transition-colors"
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
                        setAuthInfo("Progress saved to your account!");
                      } catch (e: any) {
                        setAuthError(e?.message || "Failed to save");
                      }
                    }}
                    className="w-full rounded-xl theme-primary-button font-black py-2 transition-colors"
                  >
                    Save progress
                  </button>
                  <button
                    onClick={() => {
                      signOutNow().catch(() => {});
                    }}
                    className="w-full rounded-xl bg-white/60 border border-white/70 text-[color:var(--theme-text,#0b2a5a)] font-black py-2 hover:bg-white/70 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {authError ? <div className="text-xs font-bold text-red-700">{authError}</div> : null}
                  {authInfo ? <div className="text-xs font-bold text-[color:var(--theme-accent-dark,#1b4d7a)]">{authInfo}</div> : null}

                  {authMode === "none" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setAuthError(null);
                          setAuthInfo(null);
                          setAuthMode("register");
                        }}
                        className="w-full rounded-xl theme-primary-button font-black py-2 transition-colors"
                      >
                        Create account
                      </button>
                      <button
                        onClick={() => {
                          setAuthError(null);
                          setAuthInfo(null);
                          setAuthMode("login");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-[color:var(--theme-text,#0b2a5a)] font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Sign in
                      </button>
                    </div>
                  ) : null}

                  {authMode === "register" ? (
                    <div className="space-y-2">
                      <input
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-sky-950 font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Name"
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
                        placeholder="Password (min. 6)"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setAuthError(null);
                            setAuthInfo(null);
                            await register(authName, authEmail, authPassword);
                            setAuthMode("none");
                            setAuthInfo("Account created and signed in!");
                          } catch (e: any) {
                            setAuthError(e?.message || "Erro");
                          }
                        }}
                        className="w-full rounded-xl theme-primary-button font-black py-2 transition-colors"
                      >
                        Create account
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("none");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-[color:var(--theme-text,#0b2a5a)] font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Back
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
                        placeholder="Password"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setAuthError(null);
                            setAuthInfo(null);
                            await login(authEmail, authPassword);
                            setAuthMode("none");
                            setAuthInfo("Signed in!");
                          } catch (e: any) {
                            setAuthError(e?.message || "Erro");
                          }
                        }}
                        className="w-full rounded-xl theme-primary-button font-black py-2 transition-colors"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("none");
                        }}
                        className="w-full rounded-xl bg-white/60 border border-white/70 text-[color:var(--theme-text,#0b2a5a)] font-black py-2 hover:bg-white/70 transition-colors"
                      >
                        Back
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
              <span className="text-sm font-bold text-sky-900 uppercase tracking-wider">Current Character</span>
              <span className="text-xl font-black text-sky-950">{CHARACTERS.find(c => c.type === character)?.label}</span>
            </div>

            {(character === "bird" || character === "birdglasses") && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-white/30 rounded-xl border border-white/50 p-3 text-left">
                  <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Bird Color</div>
                  <input
                    type="color"
                    value={birdColor}
                    onChange={(e) => setBirdColor(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/60 border border-white/70"
                  />
                </div>
                <div className="bg-white/30 rounded-xl border border-white/50 p-3 text-left">
                  <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Wing Color</div>
                  <input
                    type="color"
                    value={wingColor}
                    onChange={(e) => setWingColor(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/60 border border-white/70"
                  />
                </div>
                <div className="bg-white/30 rounded-xl border border-white/50 p-3 text-left">
                  <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Eye Color</div>
                  <input
                    type="color"
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/60 border border-white/70"
                  />
                </div>
                <div className="bg-white/30 rounded-xl border border-white/50 p-3 text-left">
                  <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Pupil Color</div>
                  <input
                    type="color"
                    value={pupilColor}
                    onChange={(e) => setPupilColor(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/60 border border-white/70"
                  />
                </div>
                <div className="bg-white/30 rounded-xl border border-white/50 p-3 text-left">
                  <div className="text-xs font-black uppercase tracking-wide text-sky-900 mb-2">Beak Color</div>
                  <input
                    type="color"
                    value={beakColor}
                    onChange={(e) => setBeakColor(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/60 border border-white/70"
                  />
                </div>
              </div>
            )}

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
              <Gamepad2 className="w-6 h-6" /> Solo Play
            </GlossyButton>
          </Link>
          
          <Link href="/online" className="w-full block">
            <GlossyButton className="w-full md:w-full min-w-0 text-xl py-6" data-testid="button-online">
              <Globe className="w-6 h-6" /> Online Match
            </GlossyButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
