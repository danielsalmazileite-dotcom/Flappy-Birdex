import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { GameCanvas } from "@/components/GameCanvas";
import { CharacterType, recordOnlineMatch } from "@/lib/playerStats";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlossyButton } from "@/components/GlossyButton";
import { Loader2 } from "lucide-react";

export default function OnlineGame() {
  const [, params] = useRoute("/online/game/:code");
  const [, setLocation] = useLocation();
  const code = params?.code;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const pendingStartRef = useState(() => ({ value: false }))[0];
  const [gameState, setGameState] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerSlot, setPlayerSlot] = useState<number | null>(null);

  const recordedMatchKeyRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  
  const character = (localStorage.getItem("flappi_selected_char") as CharacterType) || "bird";
  const nickname = (localStorage.getItem("flappi_nickname") || "Player").trim() || "Player";

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    if (!code) return;
    setWsReady(false);

    const envWsBase = ((import.meta as any).env?.VITE_WS_BASE_URL as string | undefined) || "";
    const wsBase = envWsBase.trim()
      ? envWsBase.trim().replace(/\/$/, "")
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

    const ws = new WebSocket(
      `${wsBase}/ws?code=${code}&nick=${encodeURIComponent(nickname)}&char=${encodeURIComponent(character)}`
    );

    ws.onopen = () => {
      setWsReady(true);
      if (pendingStartRef.value) {
        pendingStartRef.value = false;
        try {
          ws.send(JSON.stringify({ type: "start" }));
        } catch {}
      }
    };

    ws.onclose = () => {
      setWsReady(false);
      pendingStartRef.value = false;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "error" && data.reason === "nick_taken") {
        const next = window.prompt("This nickname is already taken in this room. Choose another:", nickname) || "";
        const cleaned = next.trim().slice(0, 18);
        if (cleaned) {
          localStorage.setItem("flappi_nickname", cleaned);
          ws.close();
          setTimeout(() => window.location.reload(), 50);
        } else {
          ws.close();
          setLocation("/online");
        }
        return;
      }
      if (data.type === "welcome") {
        setPlayerId(data.playerId);
        playerIdRef.current = data.playerId;
        setPlayerSlot(typeof data.slot === "number" ? data.slot : null);
      }

      if (data.type === "sync") {
        setGameState(data);

        if (data.roundOver && playerIdRef.current) {
          const key = `${data.startTime ?? ""}-${data.seed ?? ""}`;
          if (key && recordedMatchKeyRef.current !== key) {
            recordedMatchKeyRef.current = key;
            recordOnlineMatch(Boolean(data.winnerId && data.winnerId === playerIdRef.current));
          }
        }

        if (data.startTime && countdown === null) {
          startCountdown(data.startTime);
        }

        if (!data.starting && !data.started) {
          setIsReady(false);
          setCountdown(null);
        }
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [code]);

  const startCountdown = (startTimeMs: number) => {
    const tick = () => {
      const remainingMs = startTimeMs - Date.now();
      const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      setCountdown(remaining);
      if (remaining <= 0) return;
      setTimeout(tick, 200);
    };

    tick();
  };

  const handleStart = () => {
    if (!socket) return;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "start" }));
      return;
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      pendingStartRef.value = true;
    }
  };

  const handleReady = (nextReady: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "ready",
          ready: nextReady,
        }),
      );
      setIsReady(nextReady);
    }
  };

  const handlePositionUpdate = (y: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "update_position",
        y
      }));
    }
  };

  const handlePlayerDead = () => {
    try {
      const key = `${gameState?.startTime ?? ""}-${gameState?.seed ?? ""}`;
      if (key && recordedMatchKeyRef.current !== key) {
        recordedMatchKeyRef.current = key;
        recordOnlineMatch(false);
      }
    } catch {}
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "dead" }));
    }
    setLocation("/online");
  };

  const handleRestart = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "restart" }));
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const isHost = Boolean(playerId && gameState.hostId && playerId === gameState.hostId);
  const players = Array.isArray(gameState.players)
    ? [...gameState.players].sort((a: any, b: any) => (a.slot ?? 999) - (b.slot ?? 999))
    : [];
  const isRoundOver = Boolean(gameState.roundOver);
  const winner = isRoundOver ? players.find((p: any) => p.id === gameState.winnerId) : null;
  const readyCount = players.filter((p: any) => p.ready).length;
  const totalPlayers = players.length;

  if (gameState.starting && !gameState.started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <h2 className="text-3xl font-display font-black text-sky-950 mb-6 uppercase tracking-widest">
            Match Starting...
          </h2>
          <div className="bg-white/40 p-6 rounded-2xl mb-6 border border-white/60">
            <p className="text-sky-900 font-bold mb-2 uppercase text-sm tracking-wider">
              {readyCount}/{totalPlayers} players ready...
            </p>
            <div className="flex flex-col gap-2 mt-4">
              {players.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl shadow-sm">
                  <span className="font-black text-sky-950">{p.nick}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${p.ready ? "bg-sky-200 text-sky-900" : "bg-yellow-200 text-yellow-800"}`}>
                    {p.ready ? "Ready" : "Waiting"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <GlossyButton onClick={() => handleReady(!isReady)} className="w-full text-xl py-6">
            {isReady ? "CANCEL" : "READY!"}
          </GlossyButton>

          <GlossyButton onClick={() => setLocation("/online")} className="w-full mt-4 opacity-50">
            Leave Room
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  if (countdown !== 0 && !gameState.started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <h2 className="text-3xl font-display font-black text-sky-950 mb-6 uppercase tracking-widest">
            Lobby
          </h2>
          <div className="bg-white/40 p-6 rounded-2xl mb-6 border border-white/60">
            <p className="text-sky-900 font-bold mb-4 uppercase text-sm tracking-wider">Connected Players</p>
            <div className="flex flex-col gap-2">
              {players.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl shadow-sm">
                  <span className="font-black text-sky-950">{p.nick}</span>
                  <span className="text-[10px] bg-sky-200 px-2 py-1 rounded-full font-bold text-sky-900 uppercase">
                    {gameState.hostId && p.id === gameState.hostId ? "Leader" : "Player"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <GlossyButton onClick={handleStart} className="w-full text-xl py-6" disabled={!wsReady}>
              START GAME
            </GlossyButton>
          ) : (
            <div className="text-sky-900 font-bold animate-pulse uppercase tracking-tighter">
              Waiting for the leader to start...
            </div>
          )}

          <GlossyButton onClick={() => setLocation("/online")} className="w-full mt-4 opacity-50">
            Leave Room
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

  if (isRoundOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <h2 className="text-3xl font-display font-black text-sky-950 mb-4 uppercase tracking-widest">
            Round Over
          </h2>
          <p className="text-sky-900 font-bold mb-6">
            Winner: {winner?.nick ?? "-"}
          </p>
          {isHost && (
            <GlossyButton onClick={handleRestart} className="w-full text-xl py-6">
              RESTART ROUND
            </GlossyButton>
          )}
          <GlossyButton onClick={() => setLocation("/online")} className="w-full mt-4 opacity-50">
            Exit
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <GameCanvas 
        onExit={() => setLocation("/online")} 
        isMultiplayer={true}
        onPositionUpdate={handlePositionUpdate}
        onPlayerDead={handlePlayerDead}
        seed={gameState.seed}
        startTime={gameState.startTime}
        playerSlot={playerSlot ?? undefined}
        remotePlayers={players
          .filter((p: any) => !playerId || p.id !== playerId)
          .map((p: any) => ({ id: p.id, slot: p.slot, y: p.y, char: p.char, nick: p.nick, alive: p.alive }))}
      />
    </div>
  );
}
