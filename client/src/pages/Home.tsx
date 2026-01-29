import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Gamepad2, Globe, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { CharacterType, CHARACTERS, getPlayerStats } from "@/lib/playerStats";

export default function Home() {
  const [character, setCharacter] = useState<CharacterType>(() => {
    return (localStorage.getItem("flappi_selected_char") as CharacterType) || "bird";
  });
  const [stats] = useState(getPlayerStats());

  useEffect(() => {
    localStorage.setItem("flappi_selected_char", character);
  }, [character]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="py-8">
        <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-lime-600 to-green-800 drop-shadow-sm pb-2">
          Flappi Birdex
        </h1>
        
        <p className="text-green-800 font-medium text-lg mb-6">
          Escolha seu Personagem
        </p>

        <div className="grid grid-cols-4 gap-2 mb-8">
          {CHARACTERS.map((char) => {
            const unlocked = char.isUnlocked(stats);
            return (
              <button
                key={char.type}
                onClick={() => unlocked && setCharacter(char.type)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  character === char.type 
                    ? "border-lime-500 bg-lime-100/50" 
                    : "border-transparent bg-white/20"
                } ${!unlocked && "opacity-50 grayscale cursor-not-allowed"}`}
              >
                <div className="text-2xl mb-1">{char.type === "bird" ? "🐤" : "⚽"}</div>
                <div className="text-[10px] font-bold truncate">{char.label}</div>
              </button>
            );
          })}
        </div>

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
