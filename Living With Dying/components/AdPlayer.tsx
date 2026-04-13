import React, { useState, useEffect, useRef } from 'react';
import { AdCampaign } from '../types';
import { trackAdView, trackAdClick } from '../services/adService';
import { X, ExternalLink, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from './Button';
import { Browser } from '@capacitor/browser';

interface AdPlayerProps {
    ad: AdCampaign;
    onComplete: () => void;
}

export const AdPlayer: React.FC<AdPlayerProps> = ({ ad, onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [duration, setDuration] = useState(0);
    const [canSkip, setCanSkip] = useState(false);
    const [skipCountdown, setSkipCountdown] = useState(ad.skipAfter || 5);
    const [muted, setMuted] = useState(false);

    // Helper: Convert Drive View Link -> Direct Stream Link
    const getDirectUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            // Robust ID extraction
            let id = '';
            const idMatch = url.match(/\/d\/([^/]+)/);
            if (idMatch) {
                id = idMatch[1];
            } else {
                try {
                    const idParam = new URL(url).searchParams.get('id');
                    if (idParam) id = idParam;
                } catch (e) { /* ignore */ }
            }
            if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
        }
        return url;
    };

    const finalVideoUrl = getDirectUrl(ad.videoUrl);

    useEffect(() => {
        // Track view on mount
        trackAdView(ad.id);

        // Timer for skip button
        if (ad.isSkippable) {
            const timer = setInterval(() => {
                setSkipCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanSkip(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [ad.id, ad.isSkippable]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setTimeLeft(Math.ceil(videoRef.current.duration - videoRef.current.currentTime));
            setDuration(videoRef.current.duration);
        }
    };

    const handleAdClick = async () => {
        if (ad.linkUrl) {
            trackAdClick(ad.id);
            videoRef.current?.pause();
            await Browser.open({ url: ad.linkUrl });
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center font-sans">
            {/* Video Layer */}
            <video
                ref={videoRef}
                src={finalVideoUrl}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted={muted}
                onTimeUpdate={handleTimeUpdate}
                onEnded={onComplete}
                onError={(e) => {
                    console.error("Ad Playback Error", e);
                    onComplete(); // Fail safe: skip ad if error
                }}
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

            {/* Top Bar: Ad Badge + Timer */}
            <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-white text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-2 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    Ad • {timeLeft > 0 ? timeLeft : 0}s
                </div>
            </div>

            {/* Mute toggle */}
            <button
                onClick={() => setMuted(!muted)}
                className="absolute top-6 left-6 p-3 bg-white/10 backdrop-blur-md rounded-full text-white z-20 hover:bg-white/20 border border-white/5 transition-colors"
            >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Bottom Bar: Call to Action + Skip */}
            <div className="absolute bottom-12 left-0 w-full px-6 md:px-12 flex justify-between items-end z-20">

                {/* CTA */}
                {ad.linkUrl ? (
                    <div className="space-y-3 animate-fade-in-up">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Sponsored Content</p>
                        <button
                            onClick={handleAdClick}
                            className="bg-primary hover:bg-primary/80 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transform transition-all active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-primary/50"
                        >
                            <span className="text-lg">Learn More</span> <ExternalLink size={20} />
                        </button>
                    </div>
                ) : <div />}

                {/* Skip Button */}
                <div>
                    {ad.isSkippable ? (
                        canSkip ? (
                            <button
                                onClick={onComplete}
                                className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-gray-200 transition-all animate-bounce-in shadow-xl hover:scale-105"
                            >
                                <span className="text-lg">Skip Ad</span> <SkipForward size={20} className="fill-black" />
                            </button>
                        ) : (
                            <div className="bg-black/40 backdrop-blur-xl text-gray-200 px-6 py-3 rounded-xl font-mono text-sm border border-white/10 flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Skip in {skipCountdown}s
                            </div>
                        )
                    ) : (
                        <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-white/5">
                            <span className="text-white/50 text-xs uppercase tracking-widest font-mono">Ad ends soon</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
