import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

const COLORS = ['#fbbf24', '#10b981', '#06b6d4', '#22d3ee', '#a78bfa', '#38bdf8'];

export function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const completedWords = useGameStore((s) => s.completedWords);
  const prevCountRef = useRef(0);

  // Spawn particles when a word is completed
  useEffect(() => {
    if (completedWords.length > prevCountRef.current) {
      spawnBurst();
    }
    prevCountRef.current = completedWords.length;
  }, [completedWords.length]);

  function spawnBurst() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.current.push({
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      particles.current = particles.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life -= 0.016;

        if (p.life <= 0) return false;

        const alpha = p.life / p.maxLife;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx!.fill();

        return true;
      });

      ctx!.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
    />
  );
}
