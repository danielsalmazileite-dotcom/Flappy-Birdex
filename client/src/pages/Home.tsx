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
          <>
            <p className="text-green-800 font-medium text-lg mb-4">
              Escolha seu Personagem
            </p>

            <div className="grid grid-cols-4 gap-2 mb-8">
              {CHARACTERS.map((char) => {
                const unlocked = char.isUnlocked(stats);
                return (
                  <button
                    key={char.type}
                    onClick={() => unlocked && setCharacter(char.type)}
                    className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center ${
                      character === char.type 
                        ? "border-lime-500 bg-lime-100/50" 
                        : "border-transparent bg-white/20"
                    } ${!unlocked && "opacity-50 grayscale cursor-not-allowed"}`}
                  >
                    <div className="text-2xl mb-1">{char.type === "bird" ? "🐤" : (char.type === "soccer" ? "⚽" : "🎾")}</div>
                    <div className="text-[10px] font-bold truncate w-full">{char.label}</div>
                  </button>
                );
              })}
            </div>
          </>
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
