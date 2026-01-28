import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Play } from "lucide-react";
import { GlossyButton } from "./GlossyButton";

interface GameCanvasProps {
  onExit: () => void;
}

export function GameCanvas({ onExit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // Game state refs to avoid closure staleness in animation loop
  const gameState = useRef({
    birdY: 320,
    velocity: 0,
    gravity: 0.5,
    jumpStrength: -8,
    isGameRunning: false
  });

  const requestRef = useRef<number>();

  const resetGame = () => {
    gameState.current = {
      birdY: 320,
      velocity: 0,
      gravity: 0.5,
      jumpStrength: -8,
      isGameRunning: true
    };
    setIsGameOver(false);
    setIsPlaying(true);
    setScore(0);
  };

  const handleJump = () => {
    if (gameState.current.isGameRunning) {
      gameState.current.velocity = gameState.current.jumpStrength;
    }
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    // Using simple gradient fill matching CSS to handle resize cleanly inside canvas if needed
    // but canvas has CSS bg already.
    
    // Physics
    if (gameState.current.isGameRunning) {
      gameState.current.velocity += gameState.current.gravity;
      gameState.current.birdY += gameState.current.velocity;

      // Floor collision
      if (gameState.current.birdY + 15 > canvas.height) {
        gameState.current.isGameRunning = false;
        setIsGameOver(true);
        setIsPlaying(false);
      }
      
      // Ceiling collision (optional, but good practice)
      if (gameState.current.birdY - 15 < 0) {
        gameState.current.birdY = 15;
        gameState.current.velocity = 0;
      }
    }

    // Draw Bird
    ctx.beginPath();
    ctx.arc(180, gameState.current.birdY, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffeb3b"; // Bright yellow
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.fill();
    ctx.strokeStyle = "#f57f17"; // Darker yellow/orange border
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0; // Reset shadow

    // Eye
    ctx.beginPath();
    ctx.arc(188, gameState.current.birdY - 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(190, gameState.current.birdY - 5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(192, gameState.current.birdY + 2);
    ctx.lineTo(200, gameState.current.birdY + 6);
    ctx.lineTo(192, gameState.current.birdY + 10);
    ctx.fillStyle = "#ff5722";
    ctx.fill();

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50"
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          onClick={handleJump}
          className="block bg-gradient-to-b from-[#9ee7ff] to-[#eaffff] cursor-pointer touch-manipulation"
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center">
            <GlossyButton onClick={resetGame} className="mb-4">
              <Play className="w-6 h-6" /> Start Game
            </GlossyButton>
            <button onClick={onExit} className="text-white hover:underline mt-4 font-bold drop-shadow-md">
              Back to Menu
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-display font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] mb-8 transform -rotate-2">
              GAME OVER
            </h2>
            <GlossyButton onClick={resetGame} className="mb-4">
              <RotateCcw className="w-5 h-5" /> Try Again
            </GlossyButton>
            <button onClick={onExit} className="text-white font-bold hover:underline mt-4 drop-shadow-md">
              Exit
            </button>
          </div>
        )}
        
        {/* Score Display (Simple for now since there are no pipes) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 font-display font-black text-5xl text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] stroke-black pointer-events-none select-none">
          {score}
        </div>
      </motion.div>
    </div>
  );
}
