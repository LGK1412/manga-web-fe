"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import axios from "axios";
import GameHistory from "@/components/GameHistory";
import Leaderboard from "@/components/Leaderboard";
import { RefreshCcw } from "lucide-react";
import { GamePointBadge } from "@/components/GamePointBadge";

type BallType = "good" | "bad" | "freeze" | "bonus" | "shrink" | "expand";

interface Ball {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  type: BallType;
  points: number;
  color: string;
  wobble: number;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  time: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function CatchGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [running, setRunning] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const [, setBasketX] = useState<number>(160);
  const basketXRef = useRef<number>(160);
  const targetXRef = useRef<number>(160);
  const canvasSize = useRef({ w: 800, h: 650 });

  const ballsRef = useRef<Ball[]>([]);
  const ballId = useRef(1);
  const particlesRef = useRef<Particle[]>([]);

  const [isFrozen, setIsFrozen] = useState(false);
  const freezeEndTime = useRef<number>(0);
  const bonusEndTime = useRef<number>(0);
  const [bonusActive, setBonusActive] = useState(false);
  const [basketWidth, setBasketWidth] = useState<number>(80);
  const basketWidthRef = useRef<number>(80);
  const shrinkEndTime = useRef<number>(0);
  const expandEndTime = useRef<number>(0);

  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const floatId = useRef(1);

  const [soundOn, setSoundOn] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const spawnIntervalRef = useRef<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const submitScore = useCallback(async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/catch-game/submit-score`,
        { score },
        { withCredentials: true }
      );
    } catch (e) {
      console.error("Lưu điểm thất bại", e);
    }
  }, [score]);

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  };

  const playBeep = useCallback(
    (
      type: "good" | "bad" | "special" | "win" | "freeze" | "bonus" = "good"
    ) => {
      if (!soundOn) return;
      const ctx = ensureAudioCtx();
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case "good":
          o.type = "sine";
          o.frequency.value = 520;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          break;

        case "bad":
          o.type = "sawtooth";
          o.frequency.value = 150;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          break;

        case "freeze":
          o.type = "triangle";
          o.frequency.value = 300;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          break;

        case "bonus":
          o.type = "sine";
          o.frequency.value = 800;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          break;

        case "win":
          const freqs = [523, 659, 784, 1047];
          freqs.forEach((f, i) => {
            const t = now + i * 0.15;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
          });
          return;
      }

      o.start(now);
      o.stop(now + 0.5);
    },
    [soundOn]
  );

  const spawnBall = () => {
    const { w } = canvasSize.current;
    const r = Math.random() * 100;

    let type: BallType = "good";
    if (r > 98) type = "expand";
    else if (r > 96) type = "shrink";
    else if (r > 94) type = "bonus";
    else if (r > 91) type = "freeze";
    else if (r > 65) type = "bad";

    const sizeRand = Math.random();
    let radius = 14;
    let points = 3;
    let color = "#3B82F6";
    const baseSpeed = 2 + Math.random() * 2;

    if (type === "good") {
      if (sizeRand < 0.4) {
        radius = 12;
        points = 2;
        color = "#10B981";
      } else if (sizeRand < 0.8) {
        radius = 16;
        points = 5;
        color = "#3B82F6";
      } else {
        radius = 20;
        points = 10;
        color = "#F59E0B";
      }
    } else if (type === "bad") {
      if (sizeRand < 0.6) {
        radius = 16;
        points = -5;
        color = "#EF4444";
      } else {
        radius = 22;
        points = -10;
        color = "#991B1B";
      }
    } else if (type === "freeze") {
      radius = 20;
      points = 3;
      color = "#06B6D4";
    } else if (type === "bonus") {
      radius = 18;
      points = 5;
      color = "#8B5CF6";
    } else if (type === "shrink") {
      radius = 18;
      points = 0;
      color = "#F97316";
    } else if (type === "expand") {
      radius = 18;
      points = 0;
      color = "#14B8A6";
    }

    const x = Math.random() * (w - radius * 2) + radius;

    const b: Ball = {
      id: ballId.current++,
      x,
      y: -radius - 10,
      radius,
      speed: baseSpeed,
      baseSpeed,
      type,
      points,
      color,
      wobble: Math.random() * Math.PI * 2,
    };

    ballsRef.current.push(b);
  };

  const pushFloatText = (
    x: number,
    y: number,
    text: string,
    color = "#10B981"
  ) => {
    const id = floatId.current++;
    setFloatTexts((prev) => [
      ...prev,
      { id, x, y, text, color, time: Date.now() },
    ]);
    setTimeout(() => {
      setFloatTexts((prev) => prev.filter((t) => t.id !== id));
    }, 1200);
  };

  const createParticles = (x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 1,
        color,
      });
    }
  };

  const resetGame = () => {
    ballsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setTimeLeft(60);
    setGameOver(false);
    setRunning(false);
    setIsFrozen(false);
    setBonusActive(false);
    freezeEndTime.current = 0;
    bonusEndTime.current = 0;
    shrinkEndTime.current = 0;
    expandEndTime.current = 0;
    setBasketWidth(80);
    basketWidthRef.current = 80;
    basketXRef.current = canvasSize.current.w / 2 - 40;
    setBasketX(basketXRef.current);
    targetXRef.current = basketXRef.current;
  };

  const startGame = () => {
    if (running) return;
    resetGame();
    setRunning(true);
    setGameOver(false);

    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    spawnIntervalRef.current = window.setInterval(spawnBall, 600);

    const ctx = ensureAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
  };

  const endGame = useCallback(async () => {
    setRunning(false);
    setGameOver(true);

    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }

    ballsRef.current = [];

    playBeep("win");

    await submitScore();
    // await fetchGamePoint();
    setRefreshKey((prev) => prev + 1);
  }, [playBeep, submitScore]);

  useEffect(() => {
    const onMove = (clientX: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const localX = clientX - rect.left;
      targetXRef.current = Math.max(
        0,
        Math.min(
          canvasSize.current.w - basketWidthRef.current,
          localX - basketWidthRef.current / 2
        )
      );
    };

    const mouseMove = (e: MouseEvent) => onMove(e.clientX);
    const touchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("touchmove", touchMove);

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("touchmove", touchMove);
    };
  }, []);

  const keysPressed = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        keysPressed.current.left = true;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        keysPressed.current.right = true;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysPressed.current.left = false;
      if (e.key === "ArrowRight") keysPressed.current.right = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvasSize.current.w;
    const h = canvasSize.current.h;
    canvas.width = w;
    canvas.height = h;

    const basketHeight = 20;

    const draw = (time: number) => {
      const dt = Math.min(50, time - lastTimeRef.current);
      lastTimeRef.current = time;

      if (keysPressed.current.left) {
        targetXRef.current = Math.max(0, targetXRef.current - 8);
      }
      if (keysPressed.current.right) {
        targetXRef.current = Math.min(
          w - basketWidthRef.current,
          targetXRef.current + 8
        );
      }

      const now = Date.now();

      let targetWidth = 80;
      if (shrinkEndTime.current > now) {
        targetWidth = 50;
      } else if (expandEndTime.current > now) {
        targetWidth = 130;
      }

      const widthDiff = targetWidth - basketWidthRef.current;
      basketWidthRef.current += widthDiff * 0.15;
      setBasketWidth(basketWidthRef.current);

      const diff = targetXRef.current - basketXRef.current;
      basketXRef.current += diff * 0.25;
      setBasketX(basketXRef.current);

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0F172A");
      grad.addColorStop(1, "#1E293B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (isFrozen) {
        ctx.fillStyle = "rgba(6, 182, 212, 0.1)";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, w - 10, h - 10);

        for (let i = 0; i < 15; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const size = 2 + Math.random() * 4;
          ctx.fillStyle = `rgba(147, 197, 253, ${0.3 + Math.random() * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowColor = "rgba(74, 222, 128, 0.6)";
      ctx.shadowBlur = bonusActive ? 20 : 10;
      ctx.fillStyle = bonusActive ? "#8B5CF6" : "#4ADE80";
      roundRect(
        ctx,
        basketXRef.current,
        h - basketHeight - 15,
        basketWidthRef.current,
        basketHeight,
        10
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      const balls = ballsRef.current;

      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];

        b.x += Math.sin(time / 400 + b.wobble) * 0.3;
        b.y += b.speed * (dt / 16);

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(
          b.x + 3,
          b.y + b.radius + 4,
          b.radius * 0.7,
          b.radius * 0.3,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        const gradient = ctx.createRadialGradient(
          b.x - b.radius / 3,
          b.y - b.radius / 3,
          1,
          b.x,
          b.y,
          b.radius
        );
        gradient.addColorStop(0, lighten(b.color, 0.3));
        gradient.addColorStop(1, b.color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.ellipse(
          b.x - b.radius / 3,
          b.y - b.radius / 3,
          b.radius * 0.3,
          b.radius * 0.2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        if (b.type === "freeze") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(b.x - b.radius * 0.4, b.y - b.radius * 0.5);
          ctx.lineTo(b.x - b.radius * 0.4, b.y + b.radius * 0.5);
          ctx.moveTo(b.x + b.radius * 0.4, b.y - b.radius * 0.5);
          ctx.lineTo(b.x + b.radius * 0.4, b.y + b.radius * 0.5);
          ctx.stroke();
        } else if (b.type === "bonus") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", b.x, b.y);
        } else if (b.type === "shrink") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("◀▶", b.x, b.y);
        } else if (b.type === "expand") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("▶◀", b.x, b.y);
        }

        if (
          b.y + b.radius >= h - basketHeight - 15 &&
          b.x >= basketXRef.current &&
          b.x <= basketXRef.current + basketWidthRef.current
        ) {
          if (b.type === "freeze") {
            pushFloatText(b.x, b.y - 10, "FREEZE!", "#06B6D4");
            playBeep("freeze");
            setIsFrozen(true);
            freezeEndTime.current = now + 3000;

            setTimeout(() => {
              setIsFrozen(false);
            }, 3000);
          } else if (b.type === "bonus") {
            pushFloatText(b.x, b.y - 10, "+5 BONUS!", "#8B5CF6");
            playBeep("bonus");
            setScore((s) => s + 5);
            setBonusActive(true);
            bonusEndTime.current = now + 3000;

            setTimeout(() => {
              setBonusActive(false);
            }, 3000);
          } else if (b.type === "shrink") {
            pushFloatText(b.x, b.y - 10, "SHRINK!", "#F97316");
            playBeep("special");
            shrinkEndTime.current = now + 5000;
            expandEndTime.current = 0;
          } else if (b.type === "expand") {
            pushFloatText(b.x, b.y - 10, "EXPAND!", "#14B8A6");
            playBeep("special");
            expandEndTime.current = now + 5000;
            shrinkEndTime.current = 0;
          } else {
            let gain = b.points;

            if (bonusActive) {
              gain = gain * 2;
            }

            setScore((s) => Math.max(0, s + gain));

            pushFloatText(
              b.x,
              b.y - 10,
              gain > 0 ? `+${gain}` : `${gain}`,
              gain > 0 ? "#10B981" : "#EF4444"
            );

            playBeep(b.type === "good" ? "good" : "bad");
          }

          createParticles(b.x, b.y, b.color);
          balls.splice(i, 1);
          continue;
        }

        if (b.y - b.radius > h + 30) {
          balls.splice(i, 1);
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#F1F5F9";
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`⏱️ ${timeLeft}s`, 20, 35);

      ctx.textAlign = "right";
      ctx.fillText(`🏆 ${score}`, w - 20, 35);

      if (bonusActive) {
        const bonusTimeLeft = Math.ceil((bonusEndTime.current - now) / 1000);
        ctx.fillStyle = "#8B5CF6";
        ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`⭐ BONUS x2 (${bonusTimeLeft}s)`, w / 2, 35);
      }

      if (shrinkEndTime.current > now) {
        const shrinkTimeLeft = Math.ceil((shrinkEndTime.current - now) / 1000);
        ctx.fillStyle = "#F97316";
        ctx.font = "bold 14px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`◀▶ SHRINK (${shrinkTimeLeft}s)`, w / 2, 60);
      } else if (expandEndTime.current > now) {
        const expandTimeLeft = Math.ceil((expandEndTime.current - now) / 1000);
        ctx.fillStyle = "#14B8A6";
        ctx.font = "bold 14px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`▶◀ EXPAND (${expandTimeLeft}s)`, w / 2, 60);
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [timeLeft, score, isFrozen, bonusActive, basketWidth, playBeep]);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      endGame();
      return;
    }

    let countdown: number;
    if (!isFrozen) {
      countdown = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    }

    return () => {
      if (countdown) clearTimeout(countdown);
    };
  }, [timeLeft, running, isFrozen, endGame]);

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function lighten(hex: string, amount = 0.15) {
    const c = hex.replace("#", "");
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round(255 * amount);
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * amount);
    let b = (num & 0x0000ff) + Math.round(255 * amount);
    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-50">
          {/* Nút quay về */}
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-600 shadow-md transition-all flex items-center gap-2"
          >
            <span className="font-semibold">Quay về</span>
          </button>

          {/* Hiển thị điểm */}
          <GamePointBadge refreshKey={refreshKey} />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Bóng Rơi - Hứng Điểm
          </h1>
          <p className="text-slate-300 text-lg">
            Bắt quả tốt, tránh quả xấu, thu thập bonus!
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          <div className="flex-shrink-0">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded-2xl border-4 border-slate-700 shadow-2xl block"
                style={{
                  width: canvasSize.current.w,
                  height: canvasSize.current.h,
                }}
              />

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: canvasSize.current.w,
                  height: canvasSize.current.h,
                }}
              >
                {floatTexts.map((ft) => (
                  <FloatingText
                    key={ft.id}
                    x={ft.x}
                    y={ft.y}
                    text={ft.text}
                    color={ft.color}
                  />
                ))}
              </div>

              {!running && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Sẵn sàng chơi?</h2>
                    <button
                      onClick={startGame}
                      className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <Play size={24} />
                      Bắt đầu
                    </button>
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl backdrop-blur-sm">
                  <div className="text-center bg-slate-800 p-8 rounded-xl border-4 border-green-500 shadow-2xl">
                    <h2 className="text-4xl font-bold mb-4 text-green-400">
                      🎉 Chúc mừng!
                    </h2>
                    <p className="text-2xl mb-2">Điểm của bạn</p>
                    <p className="text-6xl font-bold mb-6 text-yellow-400">
                      {score}
                    </p>
                    <button
                      onClick={startGame}
                      className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <RotateCcw size={20} />
                      Chơi lại
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4 justify-center">
              {running ? (
                <button
                  onClick={endGame}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  <Pause size={20} />
                  Kết thúc
                </button>
              ) : !gameOver ? (
                <>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                  >
                    <Play size={20} />
                    Bắt đầu
                  </button>
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                  >
                    <RotateCcw size={20} />
                    Làm mới
                  </button>
                </>
              ) : null}

              <button
                onClick={() => setSoundOn(!soundOn)}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
              >
                {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
            <div className="mt-10">
              <GameHistory refreshKey={refreshKey} />
            </div>
            <div className="mt-10">
              <Leaderboard refreshKey={refreshKey} />
            </div>
          </div>

          <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 w-full lg:w-80 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center">Thông tin</h2>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-lg">⏱️ Thời gian</span>
                  <span className="text-3xl font-bold text-blue-400">
                    {timeLeft}s
                  </span>
                </div>
              </div>

              <div className="bg-slate-700 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-lg">🏆 Điểm</span>
                  <span className="text-3xl font-bold text-yellow-400">
                    {score}
                  </span>
                </div>
              </div>

              <div className="bg-slate-700 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-lg">⚪ Bóng</span>
                  <span className="text-3xl font-bold text-green-400">
                    {ballsRef.current.length}
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-slate-600 my-4" />

            <div>
              <h3 className="text-xl font-bold mb-3 text-center">Loại bóng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-5 h-5 bg-green-400 rounded-full shadow-lg"></span>
                  <span className="flex-1">Bóng tốt nhỏ</span>
                  <span className="font-bold text-green-400">+2</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-blue-400 rounded-full shadow-lg"></span>
                  <span className="flex-1">Bóng tốt vừa</span>
                  <span className="font-bold text-blue-400">+5</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-7 h-7 bg-yellow-400 rounded-full shadow-lg"></span>
                  <span className="flex-1">Bóng tốt lớn</span>
                  <span className="font-bold text-yellow-400">+10</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-red-500 rounded-full shadow-lg"></span>
                  <span className="flex-1">Bóng xấu</span>
                  <span className="font-bold text-red-500">-5/-10</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-cyan-400 rounded-full shadow-lg"></span>
                  <span className="flex-1">Đóng băng</span>
                  <span className="font-bold text-cyan-400">3s</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-purple-500 rounded-full shadow-lg"></span>
                  <span className="flex-1">Bonus x2</span>
                  <span className="font-bold text-purple-500">+5 & 3s</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-orange-500 rounded-full shadow-lg"></span>
                  <span className="flex-1">Thu nhỏ thanh</span>
                  <span className="font-bold text-orange-500">5s</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg">
                  <span className="w-6 h-6 bg-teal-500 rounded-full shadow-lg"></span>
                  <span className="flex-1">Mở rộng thanh</span>
                  <span className="font-bold text-teal-500">5s</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-600 my-4" />

            <div className="text-xs text-slate-400 space-y-1">
              <p>💡 Di chuyển: chuột hoặc phím mũi tên</p>
              <p>🎯 Bonus: +5 điểm và nhân đôi x2 trong 3s</p>
              <p>❄️ Freeze: Dừng thời gian trong 3s</p>
              <p>🔻 Shrink: Thu nhỏ thanh hứng trong 5s</p>
              <p>🔺 Expand: Mở rộng thanh hứng trong 5s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingText({
  x,
  y,
  text,
  color,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
}) {
  return (
    <div
      className="absolute animate-float-up pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="text-2xl font-bold"
        style={{
          color,
          textShadow:
            "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.5)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
