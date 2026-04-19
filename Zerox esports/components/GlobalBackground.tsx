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

// ─── Sakura ───────────────────────────────────────────────────────────────────
function initSakura(canvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 768;
    const ctx = canvas.getContext('2d')!;
    let petals: any[] = [], W = 0, H = 0, animId = 0;
    // Throttle: mobile = 30fps, desktop = 60fps
    let lastTime = 0;
    const FPS_INTERVAL = isMobile ? 1000 / 30 : 1000 / 60;
    // Fewer petals on mobile to keep GPU free, but still show them
    const PETAL_COUNT = isMobile ? 35 : 70;

    // KEY FIX: use screen.height to match the --app-height CSS variable.
    // If we used window.innerHeight, it shrinks/grows as the URL bar slides,
    // causing the canvas to resize every scroll → petals reset → rewind effect.
    const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = isMobile ? window.screen.height : window.innerHeight;
    };

    const spawn = (scattered = false) => ({
        x: Math.random() * W, y: scattered ? Math.random() * H : -20,
        rx: 6 + Math.random() * 11, ry: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.022,
        flip: Math.random() * Math.PI * 2, flipV: 0.01 + Math.random() * 0.025,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.55 + Math.random() * 1.1,
        wave: Math.random() * Math.PI * 2, waveA: 0.25 + Math.random() * 0.65,
        alpha: 0.2 + Math.random() * 0.5,
    });

    const tick = (timestamp: number) => {
        animId = requestAnimationFrame(tick);
        const elapsed = timestamp - lastTime;
        if (elapsed < FPS_INTERVAL) return; // throttle
        lastTime = timestamp - (elapsed % FPS_INTERVAL);

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
    };

    resize();

    if (isMobile) {
        // On mobile, window 'resize' fires every time the URL bar slides in/out
        // during scroll — this resets canvas dimensions and teleports petals (rewind bug).
        // Only listen to orientation change instead (true screen rotation).
        window.addEventListener('orientationchange', resize);
    } else {
        window.addEventListener('resize', resize);
    }

    for (let i = 0; i < PETAL_COUNT; i++) petals.push(spawn(true));
    animId = requestAnimationFrame(tick);

    return () => {
        cancelAnimationFrame(animId);
        if (isMobile) {
            window.removeEventListener('orientationchange', resize);
        } else {
            window.removeEventListener('resize', resize);
        }
    };
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

    // ── MOBILE URL-BAR ZOOM FIX ─────────────────────────────────────────────
    // Capture the REAL screen height once on mount (before the URL bar hides).
    // Store it in a CSS variable. Use that variable for the wrapper height
    // so the browser URL bar appearing/disappearing never resizes our fixed bg.
    useEffect(() => {
        const setHeight = () => {
            document.documentElement.style.setProperty(
                '--app-height', `${window.screen.height}px`
            );
        };
        setHeight();
        // Only update on true orientation change, NOT on scroll
        window.addEventListener('orientationchange', setHeight);
        return () => window.removeEventListener('orientationchange', setHeight);
    }, []);

    // Sakura — once on mount
    useEffect(() => {
        if (!canvasRef.current) return;
        return initSakura(canvasRef.current);
    }, []);

    // Video — restart when toggle or admin URL changes
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        if (stopVideoRef.current) { stopVideoRef.current(); stopVideoRef.current = null; }

        if (!showLiveBg) return;

        stopVideoRef.current = initVideo(
            wrapper,
            WALLPAPERS,
            adminUrl || undefined
        );

        return () => {
            if (stopVideoRef.current) { stopVideoRef.current(); stopVideoRef.current = null; }
        };
    }, [showLiveBg, adminUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* Video wrapper
                KEY FIX: height uses --app-height (captured from window.screen.height on mount)
                NOT 100vh — this means the browser URL bar showing/hiding NEVER
                resizes this element, permanently fixing the zoom-on-scroll bug.
            */}
            <div
                ref={wrapperRef}
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100%',
                    height: 'var(--app-height, 100vh)',
                    zIndex: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    background: '#020617',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    willChange: 'transform',
                }}
            >
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(to top, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.55) 40%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, rgba(2,6,23,0.6) 0%, transparent 30%)',
                }} />
            </div>

            {/* Sakura canvas — uses same height pin */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100%',
                    height: 'var(--app-height, 100vh)',
                    zIndex: 2,
                    pointerEvents: 'none',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                }}
            />
        </>
    );
};
