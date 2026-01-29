import { useLocation } from "wouter";
import { GameCanvas } from "@/components/GameCanvas";

export default function Game() {
  const [, setLocation] = useLocation();

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <GameCanvas onExit={() => setLocation("/")} />
    </div>
  );
}
