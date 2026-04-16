import React, { useEffect, useRef } from 'react';

export const BackgroundSlider: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5; // Small particles
        this.speedX = Math.random() * 0.5 - 0.25; // Slow horizontal movement
        this.speedY = Math.random() * 0.5 - 0.25; // Slow vertical movement
        this.opacity = Math.random() * 0.5 + 0.1;

        // Anime aesthetic colors: White, Soft Pink, Soft Purple
        const colors = ['255, 255, 255', '217, 70, 239', '244, 63, 94']; // White, Fuchsia, Rose
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around screen
        if (this.x > width) this.x = 0;
        if (this.x < 0) this.x = width;
        if (this.y > height) this.y = 0;
        if (this.y < 0) this.y = height;

        // Twinkle effect
        if (Math.random() > 0.99) {
          this.opacity = Math.random() * 0.5 + 0.1;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        // Removed expensive shadowBlur for performance
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(width * 0.05, 50); // Performance: Reduced from 0.1/150 to 0.05/50
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    let lastTime = 0;
    const fps = 30;
    const interval = 1000 / fps;

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = timestamp - lastTime;

      if (delta > interval) {
        lastTime = timestamp - (delta % interval);

        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
          p.update();
          p.draw();
        });
      }
    };

    initParticles();
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
      {/* Deep atmospheric gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#100b14] to-[#050505] opacity-100" />

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/80 pointer-events-none" />
    </div>
  );
};