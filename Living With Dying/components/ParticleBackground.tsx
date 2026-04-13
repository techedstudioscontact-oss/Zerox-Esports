import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    alphaDir: number;
    color: string;
    glow: string;
    type: 'float' | 'star' | 'ember';
    life: number;
    maxLife: number;
    angle: number;
    rotSpeed: number;
}

const COLORS = [
    { base: 'rgba(220, 30, 30,', glow: 'rgba(255, 50, 50, 0.6)' }, // deep red
    { base: 'rgba(255, 60, 0,', glow: 'rgba(255, 80, 0, 0.6)' }, // red-orange
    { base: 'rgba(255, 185, 0,', glow: 'rgba(255, 200, 0, 0.7)' }, // golden
    { base: 'rgba(255, 215, 0,', glow: 'rgba(255, 230, 50, 0.7)' }, // bright gold
    { base: 'rgba(200, 160, 0,', glow: 'rgba(220, 180, 0, 0.5)' }, // dark gold
    { base: 'rgba(255, 100, 0,', glow: 'rgba(255, 130, 0, 0.5)' }, // ember orange
];

function createParticle(w: number, h: number): Particle {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const type: Particle['type'] = Math.random() < 0.5 ? 'float' : Math.random() < 0.5 ? 'star' : 'ember';
    const size = type === 'star'
        ? Math.random() * 2.5 + 0.5
        : type === 'ember'
            ? Math.random() * 1.5 + 0.5
            : Math.random() * 3 + 1;

    return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (type === 'ember' ? 1.5 : 0.6),
        vy: type === 'ember' ? -(Math.random() * 1.2 + 0.3) : (Math.random() - 0.5) * 0.4,
        size,
        alpha: Math.random() * 0.6 + 0.2,
        alphaDir: Math.random() > 0.5 ? 1 : -1,
        color: color.base,
        glow: color.glow,
        type,
        life: 0,
        maxLife: Math.random() * 300 + 150,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
    };
}

export const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let particles: Particle[] = [];
        const PARTICLE_COUNT = 90;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Seed particles spread across the canvas
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle(canvas.width, canvas.height));
            // Stagger life so they don't all expire at once
            particles[i].life = Math.random() * particles[i].maxLife;
        }

        const drawStar = (x: number, y: number, size: number, alpha: number, color: string) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = alpha;
            // draw a 4-point star
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = i % 2 === 0 ? size : size * 0.4;
                const a = (i * Math.PI) / 4;
                i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = color + ' 1)';
            ctx.fill();
            ctx.restore();
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                // Age and movement
                p.life++;
                p.x += p.vx;
                p.y += p.vy;
                p.angle += p.rotSpeed;
                p.alpha += p.alphaDir * 0.006;
                if (p.alpha >= 0.85) p.alphaDir = -1;
                if (p.alpha <= 0.05) p.alphaDir = 1;

                // Rebirth when particle expires or leaves canvas
                if (p.life > p.maxLife || p.y < -20 || p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
                    particles[i] = createParticle(canvas.width, canvas.height);
                    if (p.type === 'ember') particles[i].y = canvas.height + 5; // embers rise from bottom
                    return;
                }

                ctx.save();

                // Glow
                ctx.shadowBlur = p.type === 'star' ? 14 : 20;
                ctx.shadowColor = p.glow;

                if (p.type === 'star') {
                    drawStar(p.x, p.y, p.size, p.alpha, p.color);
                } else if (p.type === 'ember') {
                    // Ember: teardrop shape rising upward
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.globalAlpha = p.alpha;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color + ' 1)';
                    ctx.fill();
                } else {
                    // Float: soft glowing orb
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
                    grad.addColorStop(0, p.color + ' ' + p.alpha + ')');
                    grad.addColorStop(1, p.color + ' 0)');
                    ctx.globalAlpha = 1;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }

                ctx.restore();
            });

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};
