import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Gamepad2, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="py-12">
        <div className="mb-4 relative">
          <div className="absolute inset-0 bg-lime-400 blur-2xl opacity-30 rounded-full" />
          <div className="relative z-10 text-6xl drop-shadow-lg">
            <span role="img" aria-label="bird">&#x1F426;</span>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-lime-600 to-green-800 drop-shadow-sm pb-2">
          Flappi Birdex
        </h1>
        
        <p className="text-green-800 font-medium text-lg max-w-[280px]">
          A experiencia flappy mais glossy da web!
        </p>

        <div className="w-full flex flex-col gap-4 mt-4">
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
        
        <div className="mt-4 text-sm text-green-700 font-semibold">
          v1.1.0 - Lime Edition
        </div>
      </GlassCard>
    </div>
  );
}
