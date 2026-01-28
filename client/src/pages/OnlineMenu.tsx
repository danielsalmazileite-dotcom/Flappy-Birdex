import { Link } from "wouter";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PlusCircle, LogIn, ArrowLeft } from "lucide-react";

export default function OnlineMenu() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard>
        <div className="w-full flex justify-start -mb-4">
          <Link href="/" className="text-slate-500 hover:text-sky-600 transition-colors">
            <ArrowLeft className="w-8 h-8 drop-shadow-sm" />
          </Link>
        </div>

        <h2 className="text-3xl font-display font-bold text-slate-700">
          Online Match
        </h2>
        <p className="text-slate-500">
          Compete with friends in real-time.
        </p>

        <div className="w-full flex flex-col gap-4 mt-2">
          <Link href="/online/create" className="w-full">
            <GlossyButton className="w-full" variant="primary">
              <PlusCircle className="w-5 h-5" /> Create Room
            </GlossyButton>
          </Link>
          
          <Link href="/online/join" className="w-full">
            <GlossyButton className="w-full" variant="secondary">
              <LogIn className="w-5 h-5" /> Enter Room
            </GlossyButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
