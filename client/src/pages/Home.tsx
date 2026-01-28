import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Gamepad2, Globe, Bird } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="py-12">
        <div className="mb-4 relative">
          <div className="absolute inset-0 bg-yellow-300 blur-2xl opacity-20 rounded-full" />
          <Bird className="w-24 h-24 text-sky-600 drop-shadow-lg relative z-10" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-sky-600 to-blue-800 drop-shadow-sm pb-2">
          Flappi Birdex
        </h1>
        
        <p className="text-slate-600 font-medium text-lg max-w-[280px]">
          The glossiest flappy experience on the web.
        </p>

        <div className="w-full flex flex-col gap-4 mt-4">
          <Link href="/play" className="w-full">
            <GlossyButton className="w-full text-xl py-6" variant="primary">
              <Gamepad2 className="w-6 h-6" /> Play Solo
            </GlossyButton>
          </Link>
          
          <Link href="/online" className="w-full">
            <GlossyButton className="w-full text-xl py-6" variant="secondary">
              <Globe className="w-6 h-6" /> Online Match
            </GlossyButton>
          </Link>
        </div>
        
        <div className="mt-4 text-sm text-slate-400 font-semibold">
          v1.0.0 • Frutiger Edition
        </div>
      </GlassCard>
    </div>
  );
}
