import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Play, Settings } from "lucide-react";
import { GlossyButton } from "./GlossyButton";

interface GameCanvasProps {
  onExit: () => void;
}

type CharacterType = "bird" | "soccer" | "baseball" | "tennis";

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export function GameCanvas({ onExit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [score, setScore] = useState(0);
  const [character, setCharacter] = useState<CharacterType>("bird");
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 640 });

  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const PIPE_SPEED = 3;
  const BIRD_RADIUS = 18;

  const gameState = useRef({
    birdY: 320,
    velocity: 0,
    gravity: 0.4,
    jumpStrength: -6,
    isGameRunning: false,
    pipes: [] as Pipe[],
    frameCount: 0,
    score: 0
  });

  const requestRef = useRef<number>();

  // Resize canvas to fit screen
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Keep aspect ratio close to 9:16 for mobile feel
      const aspectRatio = 9 / 16;
      let canvasWidth = width;
      let canvasHeight = height;
      
      if (width / height > aspectRatio) {
        canvasWidth = height * aspectRatio;
      } else {
        canvasHeight = width / aspectRatio;
      }
      
      setCanvasSize({ width: Math.floor(canvasWidth), height: Math.floor(canvasHeight) });
      gameState.current.birdY = Math.floor(canvasHeight / 2);
    };
    
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.src = "/images/game-background.jpeg";
    img.onload = () => {
      backgroundImageRef.current = img;
    };
  }, []);

  const resetGame = () => {
    gameState.current = {
      birdY: canvasSize.height / 2,
      velocity: 0,
      gravity: 0.4,
      jumpStrength: -6,
      isGameRunning: true,
      pipes: [],
      frameCount: 0,
      score: 0
    };
    setIsGameOver(false);
    setIsPlaying(true);
    setScore(0);
    setShowCharacterSelect(false);
  };

  const handleJump = useCallback(() => {
    if (gameState.current.isGameRunning) {
      gameState.current.velocity = gameState.current.jumpStrength;
    }
  }, []);

  // Touch/click handler with zero delay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      handleJump();
    };

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("mousedown", handleClick);

    return () => {
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("mousedown", handleClick);
    };
  }, [handleJump]);

  const drawGlossyPipe = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isTop: boolean) => {
    const capHeight = 25;
    const capOverhang = 8;

    const pipeGradient = ctx.createLinearGradient(x, 0, x + width, 0);
    pipeGradient.addColorStop(0, "#3d7a22");
    pipeGradient.addColorStop(0.2, "#5cb336");
    pipeGradient.addColorStop(0.4, "#7dd650");
    pipeGradient.addColorStop(0.5, "#8ae85c");
    pipeGradient.addColorStop(0.6, "#7dd650");
    pipeGradient.addColorStop(0.8, "#5cb336");
    pipeGradient.addColorStop(1, "#3d7a22");

    ctx.fillStyle = pipeGradient;
    if (isTop) {
      ctx.fillRect(x, y, width, height - capHeight);
    } else {
      ctx.fillRect(x, y + capHeight, width, height - capHeight);
    }

    const capGradient = ctx.createLinearGradient(x - capOverhang, 0, x + width + capOverhang, 0);
    capGradient.addColorStop(0, "#2d6018");
    capGradient.addColorStop(0.15, "#4a9c2a");
    capGradient.addColorStop(0.35, "#6abf40");
    capGradient.addColorStop(0.5, "#8cd660");
    capGradient.addColorStop(0.65, "#6abf40");
    capGradient.addColorStop(0.85, "#4a9c2a");
    capGradient.addColorStop(1, "#2d6018");

    ctx.fillStyle = capGradient;
    if (isTop) {
      ctx.fillRect(x - capOverhang, height - capHeight, width + capOverhang * 2, capHeight);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(x - capOverhang + 5, height - capHeight + 3, width + capOverhang * 2 - 10, 6);
    } else {
      ctx.fillRect(x - capOverhang, y, width + capOverhang * 2, capHeight);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(x - capOverhang + 5, y + 3, width + capOverhang * 2 - 10, 6);
    }

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    if (isTop) {
      ctx.fillRect(x + 8, y, 12, height - capHeight);
    } else {
      ctx.fillRect(x + 8, y + capHeight, 12, height - capHeight);
    }
  }, []);

  const drawCharacter = useCallback((ctx: CanvasRenderingContext2D, y: number, type: CharacterType) => {
    const x = canvasSize.width * 0.25;
    ctx.save();
    
    if (type === "bird") {
      const birdGradient = ctx.createRadialGradient(x - 5, y - 8, 2, x, y, BIRD_RADIUS);
      birdGradient.addColorStop(0, "#fff8b3");
      birdGradient.addColorStop(0.3, "#ffeb3b");
      birdGradient.addColorStop(0.7, "#ffc107");
      birdGradient.addColorStop(1, "#ff9800");
      
      ctx.beginPath();
      ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = birdGradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255,200,0,0.5)";
      ctx.fill();
      ctx.strokeStyle = "#e65100";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 8, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x + 8, y - 5, 6, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 10, y - 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 11, y - 6, 1, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 2);
      ctx.lineTo(x + 26, y + 5);
      ctx.lineTo(x + 14, y + 10);
      ctx.fillStyle = "#ff5722";
      ctx.fill();
    } else if (type === "soccer") {
      const ballGradient = ctx.createRadialGradient(x - 5, y - 8, 2, x, y, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.7, "#e0e0e0");
      ballGradient.addColorStop(1, "#bdbdbd");
      
      ctx.beginPath();
      ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.fill();
      ctx.strokeStyle = "#424242";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = "#212121";
      const angles = [0, 72, 144, 216, 288];
      angles.forEach((angle) => {
        const rad = (angle * Math.PI) / 180;
        const px = x + Math.cos(rad) * 10;
        const py = y + Math.sin(rad) * 10;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(x - 6, y - 10, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    } else if (type === "baseball") {
      const ballGradient = ctx.createRadialGradient(x - 5, y - 8, 2, x, y, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.6, "#f5f5f5");
      ballGradient.addColorStop(1, "#e8e8e8");
      
      ctx.beginPath();
      ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.fill();
      ctx.strokeStyle = "#bdbdbd";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.strokeStyle = "#c62828";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x - 10, y, 12, -0.8, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 10, y, 12, Math.PI - 0.8, Math.PI + 0.8);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(x - 6, y - 10, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    } else if (type === "tennis") {
      const ballGradient = ctx.createRadialGradient(x - 5, y - 8, 2, x, y, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#e8ff59");
      ballGradient.addColorStop(0.5, "#c6dc00");
      ballGradient.addColorStop(1, "#9eb700");
      
      ctx.beginPath();
      ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(200,220,0,0.5)";
      ctx.fill();
      ctx.strokeStyle = "#7c8c00";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - 14, y, 18, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 14, y, 18, Math.PI - 0.6, Math.PI + 0.6);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(x - 6, y - 10, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
    }
    
    ctx.restore();
  }, [canvasSize.width]);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, "#4a90d9");
      bgGradient.addColorStop(0.5, "#87ceeb");
      bgGradient.addColorStop(1, "#90ee90");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const birdX = canvas.width * 0.25;

    if (gameState.current.isGameRunning) {
      gameState.current.velocity += gameState.current.gravity;
      gameState.current.birdY += gameState.current.velocity;

      gameState.current.frameCount++;
      if (gameState.current.frameCount % 100 === 0) {
        const gapY = 150 + Math.random() * (canvas.height - 350);
        gameState.current.pipes.push({ x: canvas.width, gapY, passed: false });
      }

      gameState.current.pipes = gameState.current.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);
      gameState.current.pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
          pipe.passed = true;
          gameState.current.score++;
          setScore(gameState.current.score);
        }

        const birdLeft = birdX - BIRD_RADIUS;
        const birdRight = birdX + BIRD_RADIUS;
        const birdTop = gameState.current.birdY - BIRD_RADIUS;
        const birdBottom = gameState.current.birdY + BIRD_RADIUS;

        if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
          if (birdTop < pipe.gapY - PIPE_GAP / 2 || birdBottom > pipe.gapY + PIPE_GAP / 2) {
            gameState.current.isGameRunning = false;
            setIsGameOver(true);
            setIsPlaying(false);
          }
        }
      });

      if (gameState.current.birdY + BIRD_RADIUS > canvas.height || gameState.current.birdY - BIRD_RADIUS < 0) {
        gameState.current.isGameRunning = false;
        setIsGameOver(true);
        setIsPlaying(false);
      }
    }

    gameState.current.pipes.forEach(pipe => {
      drawGlossyPipe(ctx, pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2, true);
      drawGlossyPipe(ctx, pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, canvas.height - (pipe.gapY + PIPE_GAP / 2), false);
    });

    drawCharacter(ctx, gameState.current.birdY, character);

    requestRef.current = requestAnimationFrame(loop);
  }, [character, canvasSize, drawGlossyPipe, drawCharacter]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  const characterOptions: { type: CharacterType; label: string }[] = [
    { type: "bird", label: "Passarinho" },
    { type: "soccer", label: "Futebol" },
    { type: "baseball", label: "Baseball" },
    { type: "tennis", label: "Tennis" },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="block cursor-pointer touch-manipulation select-none"
          style={{ touchAction: "none" }}
        />

        {!isPlaying && !isGameOver && !showCharacterSelect && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center">
            <GlossyButton onClick={resetGame} className="mb-4" data-testid="button-start-game">
              <Play className="w-6 h-6" /> Jogar
            </GlossyButton>
            <GlossyButton onClick={() => setShowCharacterSelect(true)} className="mb-4" data-testid="button-character">
              <Settings className="w-5 h-5" /> Personagem
            </GlossyButton>
            <button onClick={onExit} className="text-white hover:underline mt-4 font-bold drop-shadow-md" data-testid="button-back-menu">
              Voltar ao Menu
            </button>
          </div>
        )}

        {showCharacterSelect && !isPlaying && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-display font-black text-white drop-shadow-lg mb-6">
              Escolha seu Personagem
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {characterOptions.map((opt) => (
                <motion.button
                  key={opt.type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCharacter(opt.type)}
                  className={`px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                    character === opt.type
                      ? "bg-gradient-to-b from-lime-300 to-lime-500 text-green-900 shadow-lg border-2 border-white"
                      : "bg-white/80 text-gray-700 hover:bg-white"
                  }`}
                  data-testid={`button-character-${opt.type}`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
            <GlossyButton onClick={() => setShowCharacterSelect(false)} data-testid="button-back-character">
              Voltar
            </GlossyButton>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-display font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] mb-4 transform -rotate-2">
              FIM DE JOGO
            </h2>
            <p className="text-2xl text-white font-bold mb-8 drop-shadow-md">
              Pontos: {score}
            </p>
            <GlossyButton onClick={resetGame} className="mb-4" data-testid="button-try-again">
              <RotateCcw className="w-5 h-5" /> Tentar de Novo
            </GlossyButton>
            <button onClick={onExit} className="text-white font-bold hover:underline mt-4 drop-shadow-md" data-testid="button-exit">
              Sair
            </button>
          </div>
        )}
        
        {isPlaying && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 font-display font-black text-5xl text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] pointer-events-none select-none">
            {score}
          </div>
        )}
      </motion.div>
    </div>
  );
}
