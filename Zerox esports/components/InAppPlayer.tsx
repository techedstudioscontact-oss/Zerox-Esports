import React, { useState, useRef, useEffect } from 'react';
import { X, SkipForward, List, ExternalLink, Lock, Unlock, PictureInPicture, FastForward, Rewind, Volume2, Maximize, Play, Pause } from 'lucide-react';
import { Button } from './Button';
import { toast } from 'sonner';

interface Episode {
    id: string;
    title: string;
    videoUrl: string;
    number: number;
}

declare global {
    interface Document {
        pictureInPictureElement: Element | null;
        readonly pictureInPictureEnabled: boolean;
        exitPictureInPicture(): Promise<void>;
    }
    interface HTMLVideoElement {
        requestPictureInPicture(): Promise<PictureInPictureWindow>;
    }
    interface Window {
        AndroidNative?: {
            enterPiP: () => void;
        };
    }
}

interface InAppPlayerProps {
    videoUrl: string;
    title: string;
    onClose: () => void;
    episodes?: Episode[];
    currentEpisodeIndex?: number;
    onEpisodeChange?: (index: number) => void;
    startTime?: number;
    onProgress?: (time: number, duration: number) => void;
    introStart?: number;
    introEnd?: number;
    outroStart?: number;
    outroEnd?: number;
}

export const InAppPlayer: React.FC<InAppPlayerProps> = ({
    videoUrl,
    title,
    onClose,
    episodes,
    currentEpisodeIndex = 0,
    onEpisodeChange,
    startTime = 0,
    onProgress,
    introStart = 0,
    introEnd = 0,
    outroStart = 0,
    outroEnd = 0
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showEpList, setShowEpList] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showAutoPlay, setShowAutoPlay] = useState(false);
    const [autoPlayTimer, setAutoPlayTimer] = useState(5);

    // UI State
    const [isLocked, setIsLocked] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [fallbackToIframe, setFallbackToIframe] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Fallback URL Helper
    const getFallbackUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            // Convert to /preview for iframe availability
            // Handle both /view /uc and /d/ formats
            let id = '';
            const idMatch = url.match(/\/d\/([^/]+)/);
            if (idMatch) id = idMatch[1];
            else {
                try {
                    const u = new URL(url);
                    id = u.searchParams.get('id') || '';
                } catch (e) { }
            }
            if (id) return `https://drive.google.com/file/d/${id}/preview`;
        }
        return url;
    };

    const isDirectVideo = !fallbackToIframe; // Derived state for UI logic

    // Gesture State
    const [seekOverlay, setSeekOverlay] = useState<'forward' | 'rewind' | null>(null);
    const lastTapRef = useRef<number>(0);
    const [skipAction, setSkipAction] = useState<'intro' | 'outro' | null>(null);



    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [isLoading]);

    // Reset controls timer
    const resetControls = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isLocked) setShowControls(false);
        }, 4000);
    };

    // Auto-Play
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (showAutoPlay && autoPlayTimer > 0) {
            interval = setInterval(() => setAutoPlayTimer(p => p - 1), 1000);
        } else if (showAutoPlay && autoPlayTimer === 0) {
            setShowAutoPlay(false);
            if (onEpisodeChange) onEpisodeChange(currentEpisodeIndex + 1);
        }
        return () => clearInterval(interval);
    }, [showAutoPlay, autoPlayTimer, onEpisodeChange, currentEpisodeIndex]);

    const hasNextEp = episodes && onEpisodeChange && currentEpisodeIndex < episodes.length - 1;

    // Direct Link Helper
    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            // Robust ID extraction for Direct Video Tag Usage
            let id = '';
            const idMatch = url.match(/\/d\/([^/]+)/); // Matches /d/ID
            if (idMatch) {
                id = idMatch[1];
            } else {
                try {
                    const idParam = new URL(url).searchParams.get('id'); // Matches ?id=ID
                    if (idParam) id = idParam;
                } catch (e) { /* ignore invalid url */ }
            }
            // If ID found, return direct stream format for <video> tag
            if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
        }
        return url;
    };

    const finalUrl = getEmbedUrl(videoUrl);
    // isDirectVideo is now derived from state above
    console.log("RENDER -> Player Mode:", isDirectVideo ? "Native" : "Iframe", finalUrl);

    // Handle Double Tap
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (isLocked) return;
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // It's a double tap
            const touchX = e.changedTouches[0].clientX;
            const screenWidth = window.innerWidth;

            if (touchX < screenWidth * 0.3) {
                // Left 30% -> Rewind
                if (videoRef.current) {
                    videoRef.current.currentTime -= 10;
                    setSeekOverlay('rewind');
                    setTimeout(() => setSeekOverlay(null), 600);
                }
            } else if (touchX > screenWidth * 0.7) {
                // Right 30% -> Forward
                if (videoRef.current) {
                    videoRef.current.currentTime += 10;
                    setSeekOverlay('forward');
                    setTimeout(() => setSeekOverlay(null), 600);
                }
            }
        } else {
            // Single tap: Toggle controls explicitly
            setShowControls(prev => !prev);
            resetControls(); // Start auto-hide timer if shown
        }
        lastTapRef.current = now;
    };

    // Seek & Auto-Play on Load
    useEffect(() => {
        if (videoRef.current) {
            // Force Play (Resolves "Not Starting" issue)
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Auto-play prevented:", error);
                    setIsPlaying(false); // Update UI to show Play button
                });
            }

            if (startTime > 0) {
                videoRef.current.currentTime = startTime;
            }
        }
    }, [startTime, finalUrl]);

    // Safety Timeout for Loading
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn("Video loading timed out", finalUrl);
                setIsLoading(false);
                toast.error("Video load timed out. Please check your connection.");
            }
        }, 15000); // 15s timeout
        return () => clearTimeout(timer);
    }, [isLoading, finalUrl]);

    // Debug URL & Version
    useEffect(() => {
        console.log("InAppPlayer mounted. VERSION: v2.0-Native. Raw:", videoUrl);
        toast.success("Player v2.0 Loaded"); // Proof of update
        if (!finalUrl) {
            toast.error("Error: No Video URL provided");
            setIsLoading(false);
        }
    }, [videoUrl, finalUrl]);


    // Custom Controls State
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) videoRef.current.currentTime = time;
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const t = videoRef.current.currentTime;
            const d = videoRef.current.duration;
            if (!isDragging) setCurrentTime(t);
            if (d) setDuration(d);

            // Watch Progress (existing)
            if (onProgress && Math.abs(t) % 5 < 1) { // roughly every 5 seconds
                onProgress(t, d);
            }

            // Skip Logic
            if (introEnd > 0 && t >= introStart && t < introEnd) {
                setSkipAction('intro');
            } else if (outroEnd > 0 && t >= outroStart && t < outroEnd) {
                setSkipAction('outro');
            } else {
                setSkipAction(null);
            }
        }
    };



    const togglePiP = async () => {
        // 1. Try Native Android Interface (Best for this user's request)
        if (window.AndroidNative) {
            console.log("Attempting Native PiP...");
            window.AndroidNative.enterPiP();
            return;
        } else {
            console.warn("AndroidNative interface not found");
        }

        // 2. Standard Web API Fallback

        // 2. Standard Web API Fallback
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Failed to toggle Picture-in-Picture:', error);
            toast.error('Picture-in-Picture failed');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black flex flex-col font-sans select-none"
            onTouchEnd={handleTouchEnd}
            onClick={resetControls}
        >
            {/* Seek Feedback Overlays */}
            {seekOverlay === 'rewind' && (
                <div className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-center z-40 bg-white/10 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center animate-seek-ping text-white">
                        <Rewind size={48} fill="white" />
                        <span className="font-bold">-10s</span>
                    </div>
                </div>
            )}
            {seekOverlay === 'forward' && (
                <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-center z-40 bg-white/10 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center animate-seek-ping text-white">
                        <FastForward size={48} fill="white" />
                        <span className="font-bold">+10s</span>
                    </div>
                </div>
            )}

            {/* Controls Overlay - Only show full controls if Direct Video or Locked */}
            <div className={`absolute inset-0 z-30 transition-opacity duration-300 pointer-events-none flex flex-col justify-between
                ${showControls || isLocked ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Header */}
                {!isLocked && (
                    <div className="p-4 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between pointer-events-auto">
                        <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20">
                            <X size={24} />
                        </button>
                        <div className="text-white font-bold truncate px-4 max-w-[60%] text-center">
                            {title}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Lock Button (Top Right Header) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsLocked(!isLocked); }}
                                className={`p-2 rounded-full transition-transform active:scale-90
                                    ${isLocked ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                            >
                                {isLocked ? <Lock size={20} /> : <Unlock size={24} />}
                            </button>

                            {isDirectVideo && document.pictureInPictureEnabled && (
                                <button onClick={togglePiP} className="p-2 text-white hover:bg-white/20 rounded-full">
                                    <PictureInPicture size={24} />
                                </button>
                            )}
                            <a href={finalUrl} target="_blank" className="p-2 text-white hover:bg-white/20 rounded-full">
                                <ExternalLink size={24} />
                            </a>
                        </div>
                    </div>
                )}
                {isLocked && (
                    <div className="absolute top-4 right-4 pointer-events-auto z-50">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsLocked(false); }}
                            className="p-3 rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse"
                        >
                            <Lock size={24} />
                        </button>
                    </div>
                )} {/* Locked Overlay */}

                {/* Center - Play Controls (Only for Direct Video) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {showControls && !isLoading && !isLocked && isDirectVideo && (
                        <div className="pointer-events-auto transform transition-transform hover:scale-110">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (videoRef.current) {
                                        if (videoRef.current.paused) {
                                            videoRef.current.play().catch(e => toast.error("Play Failed: " + e.message));
                                        } else {
                                            videoRef.current.pause();
                                        }
                                    } else {
                                        toast.error("Video element missing");
                                    }
                                }}
                                className="p-6 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 shadow-2xl z-50 cursor-pointer active:scale-95 transition-all"
                            >
                                {!isPlaying ? (
                                    <Play size={48} fill="white" className="ml-2" />
                                ) : (
                                    <Pause size={48} fill="white" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Lock Button Removed from here - Moved to Header */}

                {/* Footer (Custom Controls - Only for Direct Video) */}
                {!isLocked && isDirectVideo && (
                    <div className="absolute bottom-0 left-0 right-0 pb-[max(3rem,env(safe-area-inset-bottom))] pt-12 px-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                        <div className="pointer-events-auto w-full space-y-4 mb-8">

                            {/* Progress Bar Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gray-300 w-10 text-right">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); }}
                                    onMouseUp={() => setIsDragging(false)}
                                    onTouchEnd={() => setIsDragging(false)}
                                    className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full"
                                />
                                <span className="text-[10px] font-mono text-gray-300 w-10">{formatTime(duration)}</span>
                            </div>

                            {/* Bottom Controls Row */}
                            <div className="flex justify-between items-center px-1">
                                <div className="flex gap-4">
                                    {/* Left Side Placeholders (Volume/Settings could go here) */}
                                </div>

                                <div className="flex items-center gap-4">
                                    {hasNextEp && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEpisodeChange && onEpisodeChange(currentEpisodeIndex + 1); }}
                                            className="flex items-center gap-2 text-xs font-bold text-white/90 hover:text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/5"
                                        >
                                            Next Ep <SkipForward size={14} />
                                        </button>
                                    )}
                                    {episodes && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowEpList(true); }} className="text-white/80 hover:text-white p-1">
                                            <List size={22} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {isLocked && <div />}
            </div>

            {/* Skip Button Overlay */}
            {skipAction && !isLocked && (
                <div className="absolute bottom-40 right-5 z-[45] animate-fade-in pointer-events-auto">
                    <Button
                        variant="secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (videoRef.current) {
                                videoRef.current.currentTime = skipAction === 'intro' ? introEnd : outroEnd;
                                setSkipAction(null);
                                toast.success("Skipped");
                            }
                        }}
                        className="bg-white text-black hover:bg-gray-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.3)] font-bold px-6 py-3"
                    >
                        Skip {skipAction === 'intro' ? 'Intro' : 'Outro'} <SkipForward className="ml-2 w-4 h-4 fill-black" />
                    </Button>
                </div>
            )}

            {/* Video Player or Iframe Fallback */}
            <div className="flex-1 w-full h-full bg-black flex items-center justify-center relative">
                {isLoading && (
                    <div className="absolute inset-0 z-0 flex items-center justify-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                )}

                {isDirectVideo ? (
                    <video
                        ref={videoRef}
                        src={finalUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        playsInline
                        preload="auto"
                        onLoadedData={() => { setIsLoading(false); if (videoRef.current) setDuration(videoRef.current.duration); }}
                        onDurationChange={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
                        onError={(e) => {
                            const error = e.currentTarget.error;
                            console.error("Native Playback Failed. Switching to Iframe. Code:", error?.code);
                            toast.error("Native Player Failed. Switching to Drive Player...", { duration: 2000 });
                            setFallbackToIframe(true);
                            setIsLoading(false);
                            setIsPlaying(false);
                        }}
                        onEnded={() => hasNextEp && setShowAutoPlay(true)}
                        onPlay={() => { resetControls(); setIsPlaying(true); }}
                        onPause={() => { setShowControls(true); setIsPlaying(false); }}
                        onTimeUpdate={handleTimeUpdate}
                    />
                ) : (
                    <iframe
                        src={getFallbackUrl(videoUrl)}
                        className="w-full h-full border-0 z-10"
                        allowFullScreen
                        allow="autoplay; encrypted-media; fullscreen"
                        onLoad={() => {
                            setIsLoading(false);
                            // FALLBACK PROGRESS: Since specific time isn't available for iframes,
                            // we act as if the user just "started" or "continued".
                            // We can't track precise seconds, but we can update "Last Watched".
                            if (onProgress) onProgress(startTime || 1, 0); // 0 duration indicates unknown
                        }}
                    />
                )}
            </div>

            {/* Auto-Play & Ep List Overlays (Unchanged Logic, just re-rendering here to complete file) */}
            {showAutoPlay && hasNextEp && (
                <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-8 animate-fade-in">
                    <h2 className="text-2xl text-white font-bold mb-8">Next Episode in {autoPlayTimer}</h2>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setShowAutoPlay(false)}>Cancel</Button>
                        <Button onClick={() => { setShowAutoPlay(false); onEpisodeChange && onEpisodeChange(currentEpisodeIndex + 1); }}>Play Now</Button>
                    </div>
                </div>
            )}
            {showEpList && episodes && (
                <div className="absolute top-0 right-0 h-full w-80 bg-black/95 border-l border-white/10 z-[60] p-4 overflow-y-auto backdrop-blur-xl animate-slide-in-right">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-white">Episodes</h3>
                        <button onClick={() => setShowEpList(false)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {episodes.map((ep, idx) => (
                            <div
                                key={ep.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEpisodeChange) onEpisodeChange(idx);
                                    setShowEpList(false);
                                    setIsLoading(true);
                                }}
                                className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${idx === currentEpisodeIndex ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-gray-300'}`}
                            >
                                <span className="font-mono text-xs opacity-50">{ep.number}</span>
                                <span className="text-sm font-medium line-clamp-1">{ep.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}


        </div>
    );
};
