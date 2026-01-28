import { useLocation } from "wouter";
import { GameCanvas } from "@/components/GameCanvas";

export default function Game() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black/10 flex items-center justify-center">
      <GameCanvas onExit={() => setLocation("/")} />
    </div>
  );
}
