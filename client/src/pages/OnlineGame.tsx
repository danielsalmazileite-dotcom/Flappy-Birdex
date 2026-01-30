import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { GameCanvas } from "@/components/GameCanvas";
import { getPlayerStats, CharacterType } from "@/lib/playerStats";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlossyButton } from "@/components/GlossyButton";
import { Loader2 } from "lucide-react";

export default function OnlineGame() {
  const [, params] = useRoute("/online/game/:code");
  const [, setLocation] = useLocation();
  const code = params?.code;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const stats = getPlayerStats();
  const character = (localStorage.getItem("flappi_selected_char") as CharacterType) || "bird";
  const nickname = localStorage.getItem("flappi_nickname") || "Jogador";

  useEffect(() => {
    if (!code) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?code=${code}&nick=${nickname}&char=${character}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "sync") {
        setGameState(data);
        if (data.started && countdown === null) {
          // Trigger countdown if game started on server
          startCountdown();
        }
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [code]);

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(0);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleStart = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "start" }));
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const isHost = gameState.players.find((p: any) => p.id === "host" && p.nick === nickname);

  if (countdown !== 0 && !gameState.started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <h2 className="text-3xl font-display font-black text-green-900 mb-6 uppercase tracking-widest">
            Sala de Espera
          </h2>
          <div className="bg-white/40 p-6 rounded-2xl mb-6 border border-white/60">
            <p className="text-green-800 font-bold mb-4 uppercase text-sm tracking-wider">Jogadores Conectados</p>
            <div className="flex flex-col gap-2">
              {gameState.players.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white/60 p-3 rounded-xl shadow-sm">
                  <span className="font-black text-green-900">{p.nick}</span>
                  <span className="text-[10px] bg-green-200 px-2 py-1 rounded-full font-bold text-green-700 uppercase">
                    {p.id === "host" ? "Líder" : "Jogador"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <GlossyButton onClick={handleStart} className="w-full text-xl py-6">
              COMEÇAR JOGO
            </GlossyButton>
          ) : (
            <div className="text-green-800 font-bold animate-pulse uppercase tracking-tighter">
              Aguardando o líder iniciar...
            </div>
          )}

          <GlossyButton onClick={() => setLocation("/online")} variant="secondary" className="w-full mt-4 opacity-50">
            Sair da Sala
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  if (countdown !== 0 && countdown !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="text-9xl font-display font-black text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce">
          {countdown}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <GameCanvas onExit={() => setLocation("/online")} />
      {/* TODO: Add multiplayer sync overlays here */}
    </div>
  );
}
