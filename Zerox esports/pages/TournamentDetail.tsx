import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, User, AdCampaign } from '../types';
import { Button } from '../components/Button';
import { Play, Share2, Info, ShieldAlert, Plus, Check, List, Download, Lock, Users } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CommentSection } from '../components/CommentSection';
import { addToHistory, updateUserInDb } from '../services/authService';
import { InAppPlayer } from '../components/InAppPlayer';
import { getActiveAds } from '../services/adService';
import { AdPlayer } from '../components/AdPlayer';
import { getUserRegistrations, registerForTournament, unregisterFromTournament } from '../services/registrationService';
import { toast } from 'sonner';

interface TournamentDetailProps {
    user: User | null;
    contentList: Tournament[];
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({ user, contentList }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [updatingList, setUpdatingList] = useState(false);

    // Player State
    const [showPlayer, setShowPlayer] = useState(false);
    const [currentEpIndex, setCurrentEpIndex] = useState<number | null>(null);

    // Ad System State
    const [showingAd, setShowingAd] = useState(false);
    const [currentAd, setCurrentAd] = useState<AdCampaign | null>(null);
    const [prefetchedAds, setPrefetchedAds] = useState<AdCampaign[]>([]);
    const [pendingEpIndex, setPendingEpIndex] = useState<number | null>(null);

    // Registration State
    const [hasRegistered, setHasRegistered] = useState(false);
    const [isSubmittingReg, setIsSubmittingReg] = useState(false);

    useEffect(() => {
        // Prefetch ads on mount to avoid delay when clicking play
        const fetchAds = async () => {
            try {
                const ads = await getActiveAds();
                setPrefetchedAds(ads);
            } catch (e) {
                console.error("Failed to prefetch ads", e);
            }
        };
        fetchAds();
    }, []);

    useEffect(() => {
        const found = contentList.find(c => c.id === id);
        if (found) {
            setContent(found);
            if (user) {
                addToHistory(user, found.id).catch(err => console.error("Error updating history:", err));
                // Check Registration Status
                getUserRegistrations(user.uid).then(registrations => {
                    if (registrations.some(r => r.tournamentId === found.id)) {
                        setHasRegistered(true);
                    }
                }).catch(err => console.error("Failed to check reg status:", err));
            }
            setIsFavorite(user?.savedTournaments?.includes(found.id) || false);
            setLoading(false);
        } else {
            // Wait for list to load or redirect if truly not found
            if (contentList.length > 0) navigate('/');
        }
    }, [id, contentList, navigate, user]);

    const handleToggleFavorite = async () => {
        if (!user || !content) return;
        setUpdatingList(true);
        try {
            let newFavorites = [...(user.savedTournaments || [])];
            if (isFavorite) {
                newFavorites = newFavorites.filter(id => id !== content.id);
            } else {
                newFavorites.push(content.id);
            }
            await updateUserInDb({ ...user, savedTournaments: newFavorites });
            setIsFavorite(!isFavorite);
        } catch (error) {
            console.error("Failed to update favorites", error);
        } finally {
            setUpdatingList(false);
        }
    };

    // Watch Progress Logic
    const [initialTime, setInitialTime] = useState(0);

    const handleProgressUpdate = async (time: number, duration: number) => {
        if (user && content) {
            import('../services/authService').then(({ updateMatchProgress }) => {
                updateMatchProgress(user, content.id, {
                    matchIndex: currentEpIndex || 0,
                    timestamp: time,
                    duration: duration
                });
            });
        }
    };

    useEffect(() => {
        if (user && content && user.recentMatches && user.recentMatches[content.id]) {
            const progress = user.recentMatches[content.id];
            // If it's the same match, set initial time
            if (progress.matchIndex === (currentEpIndex || 0)) {
                setInitialTime(progress.timestamp);
            }
        }
    }, [user, content, currentEpIndex]);

    const handleShare = async () => {
        // Updated URL as requested
        const storeUrl = `https://techedstudioscontact-oss.github.io/aniryx/?watch=${id}`;
        try {
            await Share.share({
                title: content?.title || 'Zerox eSports',
                // Updated text format
                text: `Watch ${content?.title} on Zerox eSports!`,
                url: storeUrl,
                dialogTitle: 'Share with friends',
            });
        } catch (error) {
            console.error('Error sharing:', error);
            navigator.clipboard.writeText(storeUrl).then(() => toast.success("Link copied to clipboard!"));
        }
    };

    // Main Play Logic with Ad Interception
    const handlePlay = async (episodeIndex?: number) => {
        if (!content) return;

        // No paywall logic, everyone has access to view Match VODs
        const isUnlocked = true;

        // Logic to determine if we should show an ad
        let shouldPlayAd = true;

        if (user?.paidUser || user?.role === 'admin' || user?.role === 'superadmin') {
            console.log("Skipping ads: User is premium/admin");
            shouldPlayAd = false;
        } else {
            const lastAdTime = localStorage.getItem('lastAdSeen');
            if (lastAdTime) {
                const diff = Date.now() - parseInt(lastAdTime);
                // 15 Minutes Cap (Restored)
                if (diff < 15 * 60 * 1000) {
                    console.log("Skipping ads: Frequency cap active");
                    shouldPlayAd = false;
                }
            }
        }

        if (shouldPlayAd) {
            let adsToPlay = prefetchedAds;

            // Fallback: If prefetch hasn't finished yet, fetch now
            if (adsToPlay.length === 0) {
                try {
                    console.log("Ad Prefetch miss, fetching live...");
                    adsToPlay = await getActiveAds();
                } catch (e) {
                    console.error("Ad fetch failed", e);
                }
            }

            if (adsToPlay.length > 0) {
                const ad = adsToPlay[0];
                setCurrentAd(ad);
                setShowingAd(true);

                // Store intended destination to resume after ad
                if (episodeIndex !== undefined) {
                    setPendingEpIndex(episodeIndex);
                } else if (content.episodes?.length) {
                    setPendingEpIndex(0);
                }
                return; // Stop here, wait for ad to finish
            }
        }

        // No ad or skipped -> Start Content
        console.log("Starting Content directly (No ads found or skipped)");
        if (episodeIndex !== undefined) {
            setCurrentEpIndex(episodeIndex);
        } else if (content.episodes?.length) {
            setCurrentEpIndex(0);
        }
        setShowPlayer(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onAdComplete = () => {
        setShowingAd(false);
        setCurrentAd(null);
        localStorage.setItem('lastAdSeen', Date.now().toString());

        // Commit the pending index
        if (pendingEpIndex !== null) {
            setCurrentEpIndex(pendingEpIndex);
            setPendingEpIndex(null);
        }

        setShowPlayer(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <div className="bg-black min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    // Check for content existence and status
    if (!content) {
        return <div className="text-white text-center mt-20">Content not found</div>;
    }

    // Access Control: Allow Admins/Managers to preview regardless of status
    const isPrivileged = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'superadmin';
    if (!content.published && content.status !== 'published' && !isPrivileged) {
        return <div className="text-white text-center mt-20">Content is pending approval.</div>;
    }

    // Paywall Check (Privileged users bypass)
    if (content.isPremium && !user?.paidUser && !isPrivileged) {
        // Redirect or show paywall
        // (Logic handled in Home usually, but good safeguard here)
    }

    // Smart Recommendations: Sort by similar tags
    const safeTags = content.tags || [];
    const recommendations = contentList
        .filter(c => c.id !== content.id)
        .map(c => ({
            ...c,
            score: (c.tags || []).filter(t => safeTags.includes(t)).length
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    const isUnlocked = user?.paidUser || user?.role === 'superadmin' || !content.isPremium;

    const isUnregisterLocked = (() => {
        if (!content.startDate) return false;
        const now = new Date().getTime();
        const startTime = new Date(content.startDate).getTime();
        const timeUntilStart = startTime - now;
        return startTime > 0 && timeUntilStart <= 10 * 60 * 1000;
    })();

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* AD PLAYER OVERLAY */}
            {showingAd && currentAd && (
                <AdPlayer ad={currentAd} onComplete={onAdComplete} />
            )}

            {/* Main Video Player */}
            {showPlayer && (
                <InAppPlayer
                    videoUrl={content.matches && content.matches.length > 0
                        ? content.matches[currentEpIndex || 0].videoUrl
                        : content.videoUrl || ''}
                    title={content.matches && content.matches.length > 0
                        ? `${content.title} - ${content.matches[currentEpIndex || 0].title}`
                        : content.title}
                    onClose={() => setShowPlayer(false)}
                    /* removed unknown props */
                    episodes={content.matches}
                    currentEpisodeIndex={currentEpIndex}
                    onEpisodeChange={(idx) => handlePlay(idx)}
                    startTime={initialTime}
                    onProgress={handleProgressUpdate}
                    introStart={Number(content.introStart) || 0}
                    introEnd={Number(content.introEnd) || 0}
                    outroStart={Number(content.outroStart) || 0}
                    outroEnd={Number(content.outroEnd) || 0}
                />
            )}

            {/* Hero Section */}
            <div className="relative h-[55vh] md:h-[65vh] w-full bg-[#0a0a0c]">
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        src={content.coverUrl || content.thumbnailUrl}
                        className="w-full h-full object-cover opacity-60 scale-105"
                        style={{ filter: 'brightness(0.7) contrast(1.1)' }}
                        alt="cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0a0a0c]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/90 via-[#0a0a0c]/40 to-transparent" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 z-10 pb-32 md:pb-40 lg:pb-48">
                    <div className="container mx-auto">
                        <div className="flex gap-2 mb-4">
                            {(content.tags || []).map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-black text-primary border border-primary/30 uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(235,27,36,0.2)]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] max-w-5xl uppercase" style={{ textShadow: '0 0 40px rgba(235,27,36,0.3)' }}>
                            {content.title}
                        </h1>
                        <p className="text-gray-300 text-sm md:text-lg max-w-3xl line-clamp-2 mt-4 font-medium leading-relaxed drop-shadow-md">
                            {content.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container mx-auto px-4 md:px-6 relative z-20 -mt-24 md:-mt-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Details & Registration) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Ultra-Glass Action Bar */}
                        <div className="bg-black/40 backdrop-blur-3xl border border-white/[0.08] p-2 md:p-3 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-wrap gap-2 items-center relative z-30">
                            {hasRegistered ? (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    isLoading={isSubmittingReg}
                                    disabled={isUnregisterLocked || isSubmittingReg}
                                    onClick={async () => {
                                        setIsSubmittingReg(true);
                                        try {
                                            await unregisterFromTournament(user!.uid, content.id);
                                            setHasRegistered(false);
                                            toast.success("Successfully unregistered. Coins refunded.");
                                        } catch (error: any) {
                                            toast.error(error.message || "Failed to unregister.");
                                        } finally {
                                            setIsSubmittingReg(false);
                                        }
                                    }}
                                    className="flex-[2] min-w-[200px] bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black tracking-widest uppercase transition-all rounded-[24px] py-4 shadow-inner"
                                >
                                    {isUnregisterLocked ? "Locked (Starts Soon)" : "Cancel Ticket"}
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    isLoading={isSubmittingReg}
                                    onClick={async () => {
                                        if (!user) return toast.error("Please log in to register");
                                        if ((user.coins || 0) < (content.entryFee || 0)) {
                                            return toast.error(`Insufficient balance. You need ${content.entryFee} coins.`);
                                        }

                                        setIsSubmittingReg(true);
                                        try {
                                            await registerForTournament({
                                                tournamentId: content.id,
                                                userId: user.uid,
                                                userEmail: user.email,
                                                players: [],
                                                contactNumber: ''
                                            }, content.entryFee || 0);

                                            setHasRegistered(true);
                                            toast.success("Successfully registered!");
                                        } catch (error: any) {
                                            toast.error(error.message || "Registration failed.");
                                        } finally {
                                            setIsSubmittingReg(false);
                                        }
                                    }}
                                    className="flex-[2] min-w-[200px] bg-gradient-to-r from-primary to-[#ff4e00] hover:scale-[1.02] text-white border-none font-black tracking-widest uppercase shadow-[0_0_40px_rgba(235,27,36,0.5)] transition-all duration-300 rounded-[24px] py-4"
                                >
                                    <Check className="mr-2 h-5 w-5" />
                                    {content.entryFee && content.entryFee > 0 ? `Register (${content.entryFee} Coins)` : `Register (Free)`}
                                </Button>
                            )}

                            {(content.videoUrl || content.matches?.length > 0) && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => handlePlay()}
                                    className="bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/5 flex-1 md:flex-none rounded-[24px] py-4 font-black tracking-widest uppercase shadow-inner"
                                >
                                    <Play className="mr-2 h-5 w-5 fill-white" /> Watch
                                </Button>
                            )}

                            {user && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={handleToggleFavorite}
                                    isLoading={updatingList}
                                    className={`flex-[0.5] md:flex-none rounded-[24px] py-4 font-black tracking-widest uppercase transition-all ${isFavorite ? "border-green-500/30 text-green-400 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]" : "bg-white/[0.05] border-white/5 text-gray-400 hover:text-white"}`}
                                >
                                    {isFavorite ? <Check className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                                </Button>
                            )}

                            <Button variant="glass" size="lg" onClick={handleShare} className="flex-[0.5] md:flex-none bg-white/[0.05] border border-white/5 hover:bg-white/[0.1] rounded-[24px] py-4 font-black text-gray-300 hover:text-white tracking-widest uppercase shadow-inner">
                                <Share2 className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Translucent Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                            <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group transition-all shadow-lg hover:bg-white/[0.12]">
                                <span className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] mb-2 flex items-center gap-2"><Info size={12} className="text-[#4A9EFF]" /> Map</span>
                                <span className="text-white font-black text-2xl truncate drop-shadow-md">{content.map || 'Any'}</span>
                            </div>
                            <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group transition-all shadow-lg hover:bg-white/[0.12]">
                                <span className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] mb-2 flex items-center gap-2"><Users size={12} className="text-purple-500" /> Format</span>
                                <span className="text-white font-black text-2xl truncate drop-shadow-md">{content.teamSize || 'Any'}</span>
                            </div>
                            <div className="bg-gradient-to-br from-[#1a0f05]/90 to-[#120805]/90 backdrop-blur-2xl border border-orange-500/40 p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group shadow-[0_15px_30px_rgba(249,115,22,0.15)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.3)] transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/30 rounded-full blur-[40px]"></div>
                                <span className="text-orange-400 uppercase text-[9px] font-black tracking-[0.2em] mb-2 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"> Prize Pool</span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-black text-3xl drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] tracking-tighter truncate">{content.prizePool ? `₹${content.prizePool}` : 'TBA'}</span>
                            </div>
                            <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group transition-all shadow-lg hover:bg-white/[0.12]">
                                <span className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" /> Slots</span>
                                <span className="text-white font-black text-2xl truncate drop-shadow-md">{content.maxSlots ? `${content.maxSlots}` : 'Unlimited'}</span>
                            </div>
                        </div>

                        {/* SECRET ROOM DETAILS SECTION */}
                        {hasRegistered && (content.roomId || content.roomPassword) && (
                            <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary/80"></div>
                                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between pl-4">
                                    <div>
                                        <h3 className="text-primary font-black uppercase tracking-widest text-sm mb-1 flex items-center gap-2">
                                            <ShieldAlert size={16} /> Secret Match Details
                                        </h3>
                                        <p className="text-gray-300 font-medium text-xs md:text-sm">
                                            {isUnregisterLocked
                                                ? "Please do not share these details. Only registered players are allowed."
                                                : "Details will be revealed exactly 10 minutes before the match starts."}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        {isUnregisterLocked ? (
                                            <>
                                                {content.roomId && (
                                                    <div className="bg-black/80 border border-white/10 rounded-xl p-3 text-center min-w-[110px] shadow-inner">
                                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Room ID</div>
                                                        <div className="font-mono text-lg md:text-xl font-bold text-white select-all tracking-wider">{content.roomId}</div>
                                                    </div>
                                                )}
                                                {content.roomPassword && (
                                                    <div className="bg-black/80 border border-white/10 rounded-xl p-3 text-center min-w-[110px] shadow-inner">
                                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Password</div>
                                                        <div className="font-mono text-lg md:text-xl font-bold text-yellow-500 select-all tracking-wider">{content.roomPassword}</div>
                                                    </div>
                                                )}
                                                <Button
                                                    variant="primary"
                                                    size="lg"
                                                    className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(22,163,74,0.4)] transition-all flex items-center gap-2 px-6"
                                                    onClick={async () => {
                                                        const intentUrl = `intent://start?uid=${user?.uid}#Intent;scheme=zeroxanticheat;package=com.zerox.anticheat;end`;
                                                        try {
                                                            if (Capacitor.getPlatform() === 'android') {
                                                                toast.info("Launching Anti-Cheat System...");
                                                                // Open the intent URL using the browser plugin, which Android handles
                                                                await Browser.open({ url: intentUrl });
                                                            } else {
                                                                // Fallback for web testing or non-android
                                                                window.location.href = intentUrl;
                                                            }
                                                        } catch (err: any) {
                                                            console.error("Failed to launch intent", err);
                                                            toast.error("Failed to open Anti-Cheat. Is it installed?");
                                                        }
                                                    }}
                                                >
                                                    <Play className="h-5 w-5 fill-white" /> Launch Anti-Cheat
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-center min-w-[140px] flex items-center justify-center backdrop-blur-md">
                                                <Lock className="h-6 w-6 text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fluid Overview Box */}
                        <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.1] rounded-[40px] p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/15 rounded-full blur-[80px] pointer-events-none"></div>
                            
                            <h3 className="text-2xl md:text-3xl font-black mb-10 flex items-center gap-4 text-white tracking-tighter">
                                <span className="w-2 h-8 bg-primary block rounded-full shadow-[0_0_15px_rgba(235,27,36,0.8)]"></span>
                                TOURNAMENT OVERVIEW
                            </h3>

                            <div className="flex flex-wrap items-center gap-0 mb-12 bg-white/[0.02] rounded-[24px] border border-white/[0.05] overflow-hidden shadow-inner">
                                <div className="text-center p-6 border-r border-white/[0.05] flex-1">
                                    <span className="block text-[10px] uppercase text-gray-500 tracking-[0.2em] font-black mb-2">Start Date</span>
                                    <span className="text-white font-mono text-sm md:text-base font-bold tracking-wide">{content.startDate || 'TBA'}</span>
                                </div>
                                <div className="text-center p-6 border-r border-white/[0.05] flex-1">
                                    <span className="block text-[10px] uppercase text-gray-500 tracking-[0.2em] font-black mb-2">Type</span>
                                    <span className="text-primary font-black uppercase text-sm md:text-base tracking-[0.2em] drop-shadow-[0_0_8px_rgba(235,27,36,0.4)]">{content.contentType}</span>
                                </div>
                                <div className="text-center p-6 flex-1">
                                    <span className="block text-[10px] uppercase text-gray-500 tracking-[0.2em] font-black mb-2">Status</span>
                                    <span className="inline-block px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                                        {content.status}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-300 leading-[1.8] whitespace-pre-line text-sm md:text-base font-medium opacity-90 pl-2">
                                {content.description || "No specific rules provided by the organizer."}
                            </p>
                        </div>

                        {/* Fluid Matches List */}
                        {content.matches && content.matches.length > 0 && (
                            <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.1] rounded-[40px] p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter">
                                    <span className="w-2 h-8 bg-primary block rounded-full shadow-[0_0_15px_rgba(235,27,36,0.8)]"></span>
                                    MATCH VODS
                                </h3>
                                <div className="space-y-4">
                                    {content.matches.map((ep, idx) => (
                                        <div
                                            key={ep.id}
                                            onClick={() => {
                                                if (isUnlocked) {
                                                    handlePlay(idx);
                                                }
                                            }}
                                            className={`p-5 rounded-[24px] flex items-center gap-6 transition-all duration-300 group cursor-pointer
                                                ${isUnlocked
                                                    ? 'bg-white/[0.02] hover:bg-primary/[0.05] border border-white/[0.05] hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(235,27,36,0.15)] hover:-translate-y-1'
                                                    : 'bg-black/20 border border-white/[0.02] opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className="w-16 h-16 rounded-[18px] bg-white/[0.03] border border-white/5 flex items-center justify-center font-black text-2xl text-gray-400 group-hover:text-primary transition-all group-hover:scale-105 shadow-inner">
                                                {ep.number}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-black text-white transition-colors text-lg md:text-xl tracking-tight uppercase line-clamp-1">{ep.title}</h5>
                                                <div className="text-[10px] md:text-xs text-gray-500 font-bold tracking-[0.2em] uppercase mt-1">Match {ep.number}</div>
                                            </div>
                                            <div className="text-gray-400 group-hover:text-white bg-white/[0.03] group-hover:bg-primary p-4 rounded-full group-hover:scale-110 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(235,27,36,0.5)]">
                                                {isUnlocked ? <Play size={24} className="fill-current" /> : <ShieldAlert size={24} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comments Section */}
                        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[40px] overflow-hidden shadow-2xl p-4 md:p-8">
                            <CommentSection contentId={content.id} user={user} />
                        </div>
                    </div>

                    {/* Sidebar (Recommendations) */}
                    <div className="hidden lg:block lg:col-span-1 space-y-6">
                        <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.1] p-8 rounded-[40px] sticky top-28 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
                            <h4 className="font-black text-white tracking-[0.2em] uppercase text-sm mb-8 flex items-center gap-3">
                                <span className="w-2 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(235,27,36,0.8)]"></span> SIMILAR EVENTS
                            </h4>
                            <div className="space-y-6">
                                {recommendations.map(rec => (
                                    <div key={rec.id} className="flex gap-4 group cursor-pointer" onClick={() => navigate(`/watch/${rec.id}`)}>
                                        <div className="w-[110px] h-[80px] shrink-0 overflow-hidden rounded-[20px] border border-white/[0.05] shadow-md group-hover:shadow-[0_10px_20px_rgba(235,27,36,0.2)] transition-all">
                                            <img src={rec.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <h5 className="font-black text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-tight uppercase tracking-tight">{rec.title}</h5>
                                            <span className="text-[10px] text-primary mt-2 font-black tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(235,27,36,0.3)]">{rec.tags[0]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
