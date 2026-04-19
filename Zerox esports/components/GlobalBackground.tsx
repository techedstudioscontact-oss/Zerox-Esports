import React, { useEffect, useRef } from 'react';
import { SystemSettings } from '../services/systemService';
import { User } from '../types';

interface GlobalBackgroundProps {
    settings: SystemSettings | null;
    user: User | null;
}

const BASE = import.meta.env.BASE_URL || '/';

const WALLPAPERS = [
    `${BASE}wallpapers/sakura-falls-arknights-endfield-moewalls-com.mp4`,
    `${BASE}wallpapers/gugu-gaga-sleepy-river-moewalls-com.mp4`,
    `${BASE}wallpapers/mint-sakura-street-view-neverness-to-everness-moewalls-com.mp4`,
    `${BASE}wallpapers/miyamoto-musashi-legendary-samurai-vagabond-moewalls-com.mp4`,
    `${BASE}wallpapers/mutsumi-under-the-cherry-blossoms-bang-dream-moewalls-com.mp4`,
    `${BASE}wallpapers/naruto-vs-sasuke-moewalls-com.mp4`,
];

// ─── Sakura (identical to TECHED Portal initSakura) ──────────────────────────
function initSakura(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    let petals: any[] = [], W = 0, H = 0, animId = 0;

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };

    const spawn = (scattered = false) => ({
        x: Math.random() * W, y: scattered ? Math.random() * H : -20,
        rx: 6 + Math.random() * 11, ry: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.022,
        flip: Math.random() * Math.PI * 2, flipV: 0.01 + Math.random() * 0.025,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.55 + Math.random() * 1.1,
        wave: Math.random() * Math.PI * 2, waveA: 0.25 + Math.random() * 0.65,
        alpha: 0.2 + Math.random() * 0.5,
    });

    const tick = () => {
        ctx.clearRect(0, 0, W, H);
        for (const p of petals) {
            p.y += p.vy; p.wave += 0.016;
            p.x += p.vx + Math.sin(p.wave) * p.waveA;
            p.rot += p.rotV; p.flip += p.flipV;
            if (p.y > H + 30) Object.assign(p, spawn(), { y: -20 });
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.alpha;
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.rx);
            g.addColorStop(0, '#ffe0e8'); g.addColorStop(0.6, '#ffb7c5'); g.addColorStop(1, 'rgba(255,150,185,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(0.1, p.rx * Math.abs(Math.cos(p.flip))), p.ry, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.restore();
        }
        animId = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 70; i++) petals.push(spawn(true));
    tick();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
}

// ─── Video cycler (100% imperative — identical pattern to TECHED Portal) ──────
function initVideo(container: HTMLDivElement, wallpapers: string[], forcedUrl?: string) {
    // Create video element fresh — React never touches it
    const vid = document.createElement('video');
    vid.muted       = true;
    vid.playsInline = true;
    vid.autoplay    = true;
    vid.style.cssText = `
        width:100%; height:100%; object-fit:cover; display:block;
        opacity:0; transition:opacity 1.2s ease; background:#020617;
    `;
    container.prepend(vid);

    let idx = 0;
    let alive = true;

    const fadeIn  = () => { if (alive) vid.style.opacity = '0.6'; };
    const fadeOut = () => { if (alive) vid.style.opacity = '0';   };

    const loadNext = () => {
        if (!alive) return;
        fadeOut();
        setTimeout(() => {
            if (!alive) return;
            vid.src = wallpapers[idx];
            vid.load();
            vid.play()
                .then(() => { setTimeout(fadeIn, 200); })
                .catch(() => {
                    // Browser blocked autoplay — retry on first click
                    document.addEventListener('click', () => {
                        vid.play().then(() => setTimeout(fadeIn, 200)).catch(() => {});
                    }, { once: true });
                    setTimeout(fadeIn, 200); // still show frame
                });
        }, 600);
    };

    vid.addEventListener('ended', () => {
        // Advance to next — wraps back to 0 after last video (infinite loop)
        idx = (idx + 1) % wallpapers.length;
        loadNext();
    });

    vid.addEventListener('error', () => {
        console.warn('[BG] video error, skipping to next');
        idx = (idx + 1) % wallpapers.length;
        setTimeout(loadNext, 500);
    });

    // Start first video immediately
    vid.src = forcedUrl || wallpapers[0];
    vid.play()
        .then(() => { setTimeout(fadeIn, 300); })
        .catch(() => {
            document.addEventListener('click', () => {
                vid.play().then(() => setTimeout(fadeIn, 200)).catch(() => {});
            }, { once: true });
            setTimeout(fadeIn, 300);
        });

    return () => {
        alive = false;
        vid.pause();
        vid.src = '';
        vid.remove();
    };
}

// ─── Component ───────────────────────────────────────────────────────────────
export const GlobalBackground: React.FC<GlobalBackgroundProps> = ({ settings, user }) => {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const wrapperRef   = useRef<HTMLDivElement>(null);
    const stopVideoRef = useRef<(() => void) | null>(null);

    const showLiveBg = user?.showLiveBg !== false;
    const adminUrl   = settings?.bgVideoUrl ?? '';

    // Sakura — once on mount
    useEffect(() => {
        if (!canvasRef.current) return;
        return initSakura(canvasRef.current);
    }, []);

    // Video — restart when toggle or admin URL changes
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        // Tear down existing video
        if (stopVideoRef.current) { stopVideoRef.current(); stopVideoRef.current = null; }

        if (!showLiveBg) return; // no video when user toggled off

        stopVideoRef.current = initVideo(
            wrapper,
            WALLPAPERS,
            adminUrl || undefined   // undefined = use local playlist cycling
        );

        return () => {
            if (stopVideoRef.current) { stopVideoRef.current(); stopVideoRef.current = null; }
        };
    }, [showLiveBg, adminUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* Video wrapper — React renders shell, JS owns the <video> inside */}
            <div
                ref={wrapperRef}
                style={{
                    position: 'fixed', inset: 0, zIndex: 0,
                    overflow: 'hidden', pointerEvents: 'none',
                    background: '#020617',
                }}
            >
                {/* Portal .video-gradient-bottom */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(to top, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.55) 40%, transparent 70%)',
                }} />
                {/* Portal .video-gradient-top */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, rgba(2,6,23,0.6) 0%, transparent 30%)',
                }} />
            </div>

            {/* Sakura canvas — above video */}
            <canvas
                ref={canvasRef}
                style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', width: '100%', height: '100%' }}
            />
        </>
    );
};
