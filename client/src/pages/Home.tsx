import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Gamepad2, Globe, Settings, User } from "lucide-react";
import { useState, useEffect } from "react";
import { CharacterType, CHARACTERS, getPlayerStats } from "@/lib/playerStats";

export default function Home() {
  const [character, setCharacter] = useState<CharacterType>(() => {
    return (localStorage.getItem("flappi_selected_char") as CharacterType) || "bird";
  });
  const [stats] = useState(getPlayerStats());
  const [showStats, setShowStats] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  useEffect(() => {
    localStorage.setItem("flappi_selected_char", character);
  }, [character]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="py-8">
        <div className="w-full flex justify-between items-center mb-4">
           <div />
           <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-lime-600 to-green-800 drop-shadow-sm">
            Flappi Birdex
          </h1>
          <GlossyButton size="icon" variant="ghost" onClick={() => setShowStats(!showStats)}>
            <User className="w-6 h-6" />
          </GlossyButton>
        </div>
        
        {showStats ? (
          <div className="w-full text-left space-y-2 mb-6 bg-white/30 p-4 rounded-xl">
            <h3 className="font-bold text-green-900 mb-2">Suas Estatísticas</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Flaps: <strong>{stats.totalFlaps}</strong></div>
              <div>Melhor (C): <strong>{stats.bestScore}</strong></div>
              <div>Melhor (H): <strong>{stats.bestHardcoreScore}</strong></div>
              <div>Online: <strong>{stats.onlineMatchesPlayed}</strong></div>
              <div>Vitórias: <strong>{stats.onlineMatchesWon}</strong></div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4 mb-6">
            <div 
              className="flex flex-col items-center gap-2 p-4 bg-white/30 rounded-xl border border-white/50 relative cursor-pointer hover:bg-white/40 transition-colors"
              onClick={() => setShowCharacterSelect(!showCharacterSelect)}
            >
              <span className="text-sm font-bold text-green-800 uppercase tracking-wider">Personagem Atual</span>
              <span className="text-xl font-black text-green-900">{CHARACTERS.find(c => c.type === character)?.label}</span>
            </div>

            {showCharacterSelect && (
              <div className="grid grid-cols-2 gap-2 mt-4 p-2 bg-white/20 rounded-xl border border-white/30 animate-in fade-in slide-in-from-top-2">
                {CHARACTERS.map((char) => {
                  const unlocked = char.isUnlocked(stats);
                  return (
                    <button
                      key={char.type}
                      onClick={() => unlocked && setCharacter(char.type)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        character === char.type 
                          ? "border-lime-500 bg-lime-100/50" 
                          : "border-transparent bg-white/20 hover:bg-white/40"
                      } ${!unlocked && "opacity-50 grayscale cursor-not-allowed"}`}
                    >
                      <div className="text-xs font-black uppercase tracking-tight text-green-900">{char.label}</div>
                      {!unlocked && <div className="text-[8px] mt-1 text-red-600 font-bold uppercase">{char.unlockRequirement}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <Link href="/play" className="w-full">
            <GlossyButton className="w-full text-xl py-6" data-testid="button-play">
              <Gamepad2 className="w-6 h-6" /> Jogar Solo
            </GlossyButton>
          </Link>
          
          <Link href="/online" className="w-full">
            <GlossyButton className="w-full text-xl py-6" data-testid="button-online">
              <Globe className="w-6 h-6" /> Partida Online
            </GlossyButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
