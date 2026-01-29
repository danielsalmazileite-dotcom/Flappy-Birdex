import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Play, Settings, ChevronLeft, ChevronRight, Lock, Flame } from "lucide-react";
import { GlossyButton } from "./GlossyButton";
import { 
  CharacterType, 
  CHARACTERS, 
  getPlayerStats, 
  addFlaps, 
  updateBestScore,
  PlayerStats 
} from "@/lib/playerStats";

interface GameCanvasProps {
  onExit: () => void;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export function GameCanvas({ onExit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const normalMusicRef = useRef<HTMLAudioElement | null>(null);
  const hardcoreMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [score, setScore] = useState(0);
  const [character, setCharacter] = useState<CharacterType>("bird");
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 640 });
  const [isHardcore, setIsHardcore] = useState(false);
  const [characterPage, setCharacterPage] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(getPlayerStats());
  const [sessionFlaps, setSessionFlaps] = useState(0);
  const fireAnimationRef = useRef(0);

  // Load audio files
  useEffect(() => {
    normalMusicRef.current = new Audio("/audio/jumper.mp3");
    normalMusicRef.current.loop = true;
    normalMusicRef.current.volume = 0.5;
    
    hardcoreMusicRef.current = new Audio("/audio/deadlocked.mp3");
    hardcoreMusicRef.current.loop = true;
    hardcoreMusicRef.current.volume = 0.6;
    
    return () => {
      normalMusicRef.current?.pause();
      hardcoreMusicRef.current?.pause();
    };
  }, []);

  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const BIRD_RADIUS = 18;

  const gameState = useRef({
    birdY: 320,
    velocity: 0,
    gravity: 0.4,
    jumpStrength: -6,
    isGameRunning: false,
    pipes: [] as Pipe[],
    frameCount: 0,
    score: 0,
    pipeSpeed: 3,
    flapsThisGame: 0
  });

  const requestRef = useRef<number>();

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
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

  useEffect(() => {
    const img = new Image();
    img.src = "/images/game-background.jpeg";
    img.onload = () => {
      backgroundImageRef.current = img;
    };
  }, []);

  const stopAllMusic = () => {
    normalMusicRef.current?.pause();
    hardcoreMusicRef.current?.pause();
    if (normalMusicRef.current) normalMusicRef.current.currentTime = 0;
    if (hardcoreMusicRef.current) hardcoreMusicRef.current.currentTime = 0;
  };

  const startGame = (hardcoreMode: boolean) => {
    setIsHardcore(hardcoreMode);
    // Hardcore mode is slightly slower now: speed 6 vs original 8
    const speed = hardcoreMode ? 6 : 3;
    
    // Start appropriate music
    stopAllMusic();
    if (hardcoreMode) {
      hardcoreMusicRef.current?.play().catch(() => {});
    } else {
      normalMusicRef.current?.play().catch(() => {});
    }
    
    gameState.current = {
      birdY: canvasSize.height / 2,
      velocity: 0,
      gravity: hardcoreMode ? 0.5 : 0.4,
      jumpStrength: hardcoreMode ? -7 : -6,
      isGameRunning: true,
      pipes: [],
      frameCount: 0,
      score: 0,
      pipeSpeed: speed,
      flapsThisGame: 0
    };
    setIsGameOver(false);
    setIsPlaying(true);
    setScore(0);
    setShowCharacterSelect(false);
    setSessionFlaps(0);
  };

  const endGame = () => {
    // Stop music
    stopAllMusic();
    // Save stats
    addFlaps(gameState.current.flapsThisGame);
    updateBestScore(gameState.current.score, isHardcore);
    setPlayerStats(getPlayerStats());
  };

  const handleJump = useCallback(() => {
    if (gameState.current.isGameRunning) {
      gameState.current.velocity = gameState.current.jumpStrength;
      gameState.current.flapsThisGame++;
      setSessionFlaps(prev => prev + 1);
    }
  }, []);

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

  const drawCharacter = useCallback((ctx: CanvasRenderingContext2D, y: number, type: CharacterType, frame: number) => {
    const x = canvasSize.width * 0.25;
    const velocity = gameState.current.velocity;
    // Calculate rotation based on velocity (tilt)
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, velocity * 0.1));
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Character Body first
    if (type === "bird" || type === "birdglasses") {
      const birdGradient = ctx.createRadialGradient(-5, -8, 2, 0, 0, BIRD_RADIUS);
      birdGradient.addColorStop(0, "#fff8b3");
      birdGradient.addColorStop(0.3, "#ffeb3b");
      birdGradient.addColorStop(0.7, "#ffc107");
      birdGradient.addColorStop(1, "#ff9800");
      
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = birdGradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255,200,0,0.5)";
      ctx.fill();
      ctx.strokeStyle = "#e65100";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Highlight/Shine
      ctx.beginPath();
      ctx.ellipse(-5, -8, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      
      ctx.shadowBlur = 0;
      if (type === "bird") {
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(11, -6, 1, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
      } else {
        // Sunglasses
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.roundRect(2, -10, 14, 10, 2);
        ctx.fill();
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.roundRect(4, -8, 10, 6, 1);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(7, -6, 2, 1.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -5);
        ctx.lineTo(-8, -3);
        ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.moveTo(14, 2);
      ctx.lineTo(26, 5);
      ctx.lineTo(14, 10);
      ctx.fillStyle = "#ff5722";
      ctx.fill();
    } else if (type === "soccer") {
      const ballGradient = ctx.createRadialGradient(-6, -8, 3, 0, 0, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.5, "#f5f5f5");
      ballGradient.addColorStop(0.8, "#e0e0e0");
      ballGradient.addColorStop(1, "#c0c0c0");
      
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = Math.cos(angle) * 6;
        const py = Math.sin(angle) * 6;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      
      const outerAngles = [0, 72, 144, 216, 288];
      outerAngles.forEach((angle) => {
        const rad = (angle - 90) * Math.PI / 180;
        const cx = Math.cos(rad) * 13;
        const cy = Math.sin(rad) * 13;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = ((i * 72) + angle) * Math.PI / 180;
          const px = cx + Math.cos(a) * 4;
          const py = cy + Math.sin(a) * 4;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      });
      
      ctx.beginPath();
      ctx.ellipse(-7, -10, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    } else if (type === "baseball") {
      const ballGradient = ctx.createRadialGradient(-6, -8, 3, 0, 0, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.4, "#faf8f5");
      ballGradient.addColorStop(0.8, "#f0ebe3");
      ballGradient.addColorStop(1, "#e5ddd0");
      
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.strokeStyle = "#c9b99a";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#c41e3a";
      ctx.lineWidth = 2;
      
      // Fixed baseball lines
      ctx.beginPath();
      ctx.arc(-18, 0, 16, -0.6, 0.6);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        const angle = i * 0.18;
        const sx = -18 + Math.cos(angle) * 16;
        const sy = Math.sin(angle) * 16;
        ctx.beginPath(); ctx.moveTo(sx-2, sy-1); ctx.lineTo(sx+2, sy+1); ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.arc(18, 0, 16, Math.PI - 0.6, Math.PI + 0.6);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        const angle = Math.PI + i * 0.18;
        const sx = 18 + Math.cos(angle) * 16;
        const sy = Math.sin(angle) * 16;
        ctx.beginPath(); ctx.moveTo(sx-2, sy-1); ctx.lineTo(sx+2, sy+1); ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.ellipse(-6, -10, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fill();
    } else if (type === "tennis") {
      const ballGradient = ctx.createRadialGradient(-5, -8, 2, 0, 0, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#e8ff59");
      ballGradient.addColorStop(0.4, "#d4f034");
      ballGradient.addColorStop(0.7, "#c6dc00");
      ballGradient.addColorStop(1, "#a8c000");
      
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(200,220,0,0.5)";
      ctx.fill();
      ctx.strokeStyle = "#8a9c00";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2.5;
      
      // Fixed tennis lines
      ctx.beginPath();
      ctx.arc(-22, 0, 20, -0.5, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(22, 0, 20, Math.PI - 0.5, Math.PI + 0.5);
      ctx.stroke();
      
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * (BIRD_RADIUS - 2);
        ctx.beginPath(); ctx.arc(Math.cos(a)*d, Math.sin(a)*d, 0.6, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,255,200,0.3)"; ctx.fill();
      }
      
      ctx.beginPath();
      ctx.ellipse(-6, -10, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    } else if (type === "fireball") {
      const pulseScale = 1 + Math.sin(frame * 0.15) * 0.1;
      const flameOffset = Math.sin(frame * 0.2) * 2;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "rgba(255,100,0,0.8)";
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, BIRD_RADIUS * pulseScale);
      coreGradient.addColorStop(0, "#ffffff");
      coreGradient.addColorStop(0.2, "#ffff80");
      coreGradient.addColorStop(0.5, "#ffaa00");
      coreGradient.addColorStop(0.8, "#ff5500");
      coreGradient.addColorStop(1, "#cc2200");
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + frame * 3) * Math.PI / 180;
        const length = 8 + Math.sin(frame * 0.3 + i) * 4;
        const fx = Math.cos(angle) * BIRD_RADIUS;
        const fy = Math.sin(angle) * BIRD_RADIUS;
        const flameGradient = ctx.createLinearGradient(0, 0, fx + Math.cos(angle) * length, fy + Math.sin(angle) * length);
        flameGradient.addColorStop(0, "#ffaa00");
        flameGradient.addColorStop(0.5, "#ff5500");
        flameGradient.addColorStop(1, "rgba(200,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(fx - Math.sin(angle) * 4, fy + Math.cos(angle) * 4);
        ctx.lineTo(fx + Math.cos(angle) * length + flameOffset, fy + Math.sin(angle) * length);
        ctx.lineTo(fx + Math.sin(angle) * 4, fy - Math.cos(angle) * 4);
        ctx.fillStyle = flameGradient;
        ctx.fill();
      }
    } else if (type === "smiley") {
      const smileyGradient = ctx.createRadialGradient(-5, -8, 2, 0, 0, BIRD_RADIUS);
      smileyGradient.addColorStop(0, "#fff44f");
      smileyGradient.addColorStop(0.5, "#ffeb3b");
      smileyGradient.addColorStop(1, "#ffc107");
      ctx.beginPath(); ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = smileyGradient;
      ctx.shadowBlur = 12; ctx.shadowColor = "rgba(255,200,0,0.5)";
      ctx.fill(); ctx.strokeStyle = "#e6a800"; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.ellipse(-6, -4, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -4, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 2, 10, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (type === "golf") {
      const ballGradient = ctx.createRadialGradient(-6, -8, 3, 0, 0, BIRD_RADIUS);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(1, "#d0d0d0");
      ctx.beginPath(); ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient; ctx.fill(); ctx.strokeStyle = "#b0b0b0"; ctx.stroke();
      const dimples = [[0,0],[8,0],[-8,0],[4,7],[-4,7],[4,-7],[-4,-7]];
      dimples.forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fill();
      });
    }

    // Wings LAST (to be in front)
    const wingFrame = Math.floor(frame / 5) % 3;
    const wingRotation = wingFrame === 0 ? -0.3 : (wingFrame === 1 ? 0 : 0.3);
    
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Comic-style Wing (based on attached image)
    ctx.save();
    ctx.translate(5, 2); // Positioned slightly left (from 8 to 5)
    ctx.rotate(wingRotation - 0.4); // Tilted more
    ctx.scale(0.7, 0.7); // Smaller
    
    ctx.beginPath();
    // Top feather (longest)
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-5, -15, -25, -20, -35, -5);
    ctx.bezierCurveTo(-38, 0, -30, 5, -25, 2);
    
    // Middle feathers
    ctx.bezierCurveTo(-28, 8, -25, 12, -18, 10);
    ctx.bezierCurveTo(-20, 15, -15, 18, -10, 14);
    ctx.bezierCurveTo(-12, 20, -5, 22, 0, 15);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Internal feather lines
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-25, -8);
    ctx.moveTo(-8, 2);
    ctx.lineTo(-18, 3);
    ctx.moveTo(-5, 8);
    ctx.lineTo(-12, 9);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.restore();
    
    ctx.restore();
  }, [canvasSize.width]);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fireAnimationRef.current++;

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
      if (gameState.current.frameCount % (isHardcore ? 50 : 100) === 0) {
        const gapY = 150 + Math.random() * (canvas.height - 350);
        gameState.current.pipes.push({ x: canvas.width, gapY, passed: false });
      }

      gameState.current.pipes = gameState.current.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);
      gameState.current.pipes.forEach(pipe => {
        pipe.x -= gameState.current.pipeSpeed;

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
            endGame();
            setIsGameOver(true);
            setIsPlaying(false);
          }
        }
      });

      if (gameState.current.birdY + BIRD_RADIUS > canvas.height || gameState.current.birdY - BIRD_RADIUS < 0) {
        gameState.current.isGameRunning = false;
        endGame();
        setIsGameOver(true);
        setIsPlaying(false);
      }
    }

    gameState.current.pipes.forEach(pipe => {
      drawGlossyPipe(ctx, pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2, true);
      drawGlossyPipe(ctx, pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, canvas.height - (pipe.gapY + PIPE_GAP / 2), false);
    });

    drawCharacter(ctx, gameState.current.birdY, character, fireAnimationRef.current);

    requestRef.current = requestAnimationFrame(loop);
  }, [character, canvasSize, drawGlossyPipe, drawCharacter, isHardcore]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  const currentPageCharacters = CHARACTERS.filter(c => c.page === characterPage);

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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <GlossyButton onClick={() => startGame(false)} data-testid="button-start-game">
              <Play className="w-6 h-6" /> Jogar
            </GlossyButton>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => startGame(true)}
              className="relative overflow-hidden px-8 py-4 rounded-lg font-display font-bold text-lg text-white tracking-wide transition-all duration-200 flex items-center justify-center gap-2 min-w-[200px]"
              style={{
                background: "linear-gradient(180deg, #ff6b6b 0%, #ee2222 49%, #cc0000 51%, #aa0000 100%)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.2), 0 8px 20px rgba(200, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
                border: "2px solid rgba(255, 100, 100, 0.5)"
              }}
              data-testid="button-hardcore"
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent opacity-50 rounded-t-lg pointer-events-none" />
              <Flame className="w-5 h-5" /> HARDCORE MODE
            </motion.button>
            <GlossyButton onClick={() => setShowCharacterSelect(true)} data-testid="button-character">
              <Settings className="w-5 h-5" /> Personagem
            </GlossyButton>
            <button onClick={onExit} className="text-white hover:underline mt-2 font-bold drop-shadow-md" data-testid="button-back-menu">
              Voltar ao Menu
            </button>
          </div>
        )}

        <AnimatePresence>
          {showCharacterSelect && !isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            >
              <h2 className="text-2xl font-display font-black text-white drop-shadow-lg mb-2">
                Escolha seu Personagem
              </h2>
              <p className="text-white/70 text-sm mb-4">Página {characterPage}/2</p>
              
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setCharacterPage(1)}
                  disabled={characterPage === 1}
                  className="p-2 rounded-lg bg-white/20 disabled:opacity-30 hover:bg-white/30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setCharacterPage(2)}
                  disabled={characterPage === 2}
                  className="p-2 rounded-lg bg-white/20 disabled:opacity-30 hover:bg-white/30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-xs">
                {currentPageCharacters.map((opt) => {
                  const isUnlocked = opt.isUnlocked(playerStats);
                  const isSelected = character === opt.type;
                  
                  return (
                    <motion.button
                      key={opt.type}
                      whileHover={isUnlocked ? { scale: 1.05 } : {}}
                      whileTap={isUnlocked ? { scale: 0.95 } : {}}
                      onClick={() => isUnlocked && setCharacter(opt.type)}
                      disabled={!isUnlocked}
                      className={`relative px-3 py-3 rounded-lg font-bold text-sm transition-all ${
                        isSelected && isUnlocked
                          ? "bg-gradient-to-b from-lime-300 to-lime-500 text-green-900 shadow-lg border-2 border-white"
                          : isUnlocked
                          ? "bg-white/80 text-gray-700 hover:bg-white"
                          : "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                      }`}
                      data-testid={`button-character-${opt.type}`}
                    >
                      {!isUnlocked && (
                        <Lock className="absolute top-1 right-1 w-4 h-4 text-gray-400" />
                      )}
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {isUnlocked ? "Desbloqueado" : opt.unlockRequirement}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              <div className="text-white/60 text-xs mb-4 text-center">
                Flaps: {playerStats.totalFlaps} | Recorde: {playerStats.bestScore} | Hardcore: {playerStats.bestHardcoreScore}
              </div>
              
              <GlossyButton onClick={() => setShowCharacterSelect(false)} data-testid="button-back-character">
                Voltar
              </GlossyButton>
            </motion.div>
          )}
        </AnimatePresence>

        {isGameOver && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-display font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] mb-2 transform -rotate-2">
              FIM DE JOGO
            </h2>
            {isHardcore && (
              <span className="text-red-400 font-bold text-sm mb-2 flex items-center gap-1">
                <Flame className="w-4 h-4" /> HARDCORE
              </span>
            )}
            <p className="text-2xl text-white font-bold mb-2 drop-shadow-md">
              Pontos: {score}
            </p>
            <p className="text-white/70 text-sm mb-6">
              Flaps: {sessionFlaps}
            </p>
            <GlossyButton onClick={() => startGame(isHardcore)} className="mb-4" data-testid="button-try-again">
              <RotateCcw className="w-5 h-5" /> Tentar de Novo
            </GlossyButton>
            <button onClick={onExit} className="text-white font-bold hover:underline mt-2 drop-shadow-md" data-testid="button-exit">
              Sair
            </button>
          </div>
        )}
        
        {isPlaying && (
          <>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 font-display font-black text-5xl text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] pointer-events-none select-none">
              {score}
            </div>
            {isHardcore && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 text-red-400 font-bold text-sm">
                <Flame className="w-4 h-4" /> HARDCORE
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
