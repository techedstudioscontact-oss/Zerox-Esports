import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, User, AdCampaign } from '../types';
import { Button } from '../components/Button';
import { Play, Share2, Info, ShieldAlert, Plus, Check, List, Download, Lock } from 'lucide-react';
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
            <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={content.coverUrl || content.thumbnailUrl}
                        className="w-full h-full object-cover opacity-40"
                        alt="cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 z-10 pb-20">
                    <div className="container mx-auto">
                        <div className="flex gap-2 mb-4">
                            {(content.tags || []).map(tag => (
                                <span key={tag} className="px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full text-[10px] font-bold text-primary border border-primary/30 uppercase tracking-widest shadow-[0_0_10px_rgba(235,27,36,0.2)]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-2 tracking-tight leading-tight drop-shadow-2xl max-w-4xl">
                            {content.title}
                        </h1>
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mt-4 font-medium">
                            {content.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container mx-auto px-4 md:px-6 relative z-20 -mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Details & Registration) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Action Bar */}
                        <div className="bg-surfaceHighlight border border-white/10 p-2 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-wrap gap-2 items-center">
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
                                    className="flex-1 min-w-[200px] bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 font-bold tracking-widest uppercase transition-all"
                                >
                                    {isUnregisterLocked ? "Locked (Starts Soon)" : "Cancel Registration"}
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
                                    className="flex-1 min-w-[200px] bg-primary text-white hover:bg-primary-hover border-none font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(235,27,36,0.4)] transition-all"
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
                                    className="bg-white/5 text-white hover:bg-white/10 border border-white/10 flex-1 md:flex-none"
                                >
                                    <Play className="mr-2 h-4 w-4 fill-white" /> Watch
                                </Button>
                            )}

                            {user && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={handleToggleFavorite}
                                    isLoading={updatingList}
                                    className={`flex-1 md:flex-none ${isFavorite ? "border-green-500/50 text-green-400 bg-green-500/10" : "bg-white/5 border-white/10 text-gray-300 hover:text-white"}`}
                                >
                                    {isFavorite ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                    {isFavorite ? 'Saved' : 'Save'}
                                </Button>
                            )}

                            {isUnlocked && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={async () => {
                                        const url = content.downloadUrl ||
                                            (content.matches?.length ? content.matches[currentEpIndex || 0].videoUrl : content.videoUrl);

                                        if (url) {
                                            toast.info("Opening Link...");
                                            await Browser.open({ url: url });
                                        } else {
                                            toast.error("No link available");
                                        }
                                    }}
                                    className="bg-white/5 text-gray-300 hover:text-white border border-white/10 flex-1 md:flex-none"
                                >
                                    <Download className="mr-2 h-4 w-4" /> Link
                                </Button>
                            )}

                            <Button variant="glass" size="lg" onClick={handleShare} className="flex-1 md:flex-none">
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                        </div>

                        {/* Esports Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-surfaceHighlight border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                                <span className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Map / Arena</span>
                                <span className="text-white font-black text-lg">{content.map || 'Any'}</span>
                            </div>
                            <div className="bg-surfaceHighlight border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                                <span className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Team Format</span>
                                <span className="text-white font-black text-lg">{content.teamSize || 'Any'}</span>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-full blur-2xl"></div>
                                <span className="text-yellow-600 uppercase text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Prize Pool</span>
                                <span className="text-yellow-500 font-black text-lg drop-shadow-md">{content.prizePool ? `₹${content.prizePool}` : 'TBA'}</span>
                            </div>
                            <div className="bg-surfaceHighlight border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                                <span className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Slots</span>
                                <span className="text-white font-black text-lg">{content.maxSlots ? `${content.maxSlots}` : 'Unlimited'}</span>
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

                        {/* Rules & Info */}
                        <div className="bg-surfaceHighlight border border-white/5 rounded-2xl p-6 lg:p-8 shadow-lg">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-white/10 pb-4">
                                <Info className="h-5 w-5 text-primary" /> Tournament Overview
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 mb-8 bg-black/40 p-4 rounded-xl border border-white/5">
                                <div className="text-center px-4 border-r border-white/10">
                                    <span className="block text-xs uppercase text-gray-500 tracking-widest font-bold mb-1">Start Date</span>
                                    <span className="text-white font-mono text-sm">{content.startDate || 'TBA'}</span>
                                </div>
                                <div className="text-center px-4 md:border-r border-white/10">
                                    <span className="block text-xs uppercase text-gray-500 tracking-widest font-bold mb-1">Type</span>
                                    <span className="text-primary font-bold uppercase text-sm tracking-widest">{content.contentType}</span>
                                </div>
                                <div className="text-center px-4 ml-auto">
                                    <span className="block text-xs uppercase text-gray-500 tracking-widest font-bold mb-1">Status</span>
                                    <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs font-bold uppercase tracking-wider">
                                        {content.status}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base border-l-2 border-primary/50 pl-6">
                                {content.description || "No specific rules provided by the organizer."}
                            </p>
                        </div>

                        {/* Matches List (For Tournaments/Scrims) */}
                        {content.matches && content.matches.length > 0 && (
                            <div className="bg-surfaceHighlight border border-white/5 rounded-2xl p-6 lg:p-8 shadow-lg">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                    <List className="text-primary" size={20} /> Matches & VODs
                                </h3>
                                <div className="space-y-3">
                                    {content.matches.map((ep, idx) => (
                                        <div
                                            key={ep.id}
                                            onClick={() => {
                                                if (isUnlocked) {
                                                    handlePlay(idx);
                                                }
                                            }}
                                            className={`p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer
                                                ${isUnlocked
                                                    ? 'bg-black/40 hover:bg-primary/10 border border-white/5 hover:border-primary/50'
                                                    : 'bg-black/40 border border-white/5 opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-lg text-gray-400 group-hover:text-primary transition-colors shadow-inner">
                                                {ep.number}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-bold text-gray-200 group-hover:text-white transition-colors text-lg">{ep.title}</h5>
                                                <div className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">Match {ep.number}</div>
                                            </div>
                                            <div className="text-gray-500 group-hover:text-primary bg-white/5 p-3 rounded-full group-hover:scale-110 transition-transform">
                                                {isUnlocked ? <Play size={20} className="fill-current" /> : <ShieldAlert size={16} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comments Section */}
                        <div className="bg-surfaceHighlight border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                            <CommentSection contentId={content.id} user={user} />
                        </div>
                    </div>

                    {/* Sidebar (Recommendations) */}
                    <div className="hidden lg:block lg:col-span-1 space-y-6">
                        <div className="rounded-2xl bg-surfaceHighlight p-6 border border-white/5 sticky top-24 shadow-lg">
                            <h4 className="font-bold text-white tracking-widest uppercase text-sm mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                <span className="w-1.5 h-4 bg-primary rounded-full"></span> Similar Events
                            </h4>
                            <div className="space-y-4">
                                {recommendations.map(rec => (
                                    <div key={rec.id} className="flex gap-4 group cursor-pointer" onClick={() => navigate(`/watch/${rec.id}`)}>
                                        <div className="w-[100px] h-[75px] shrink-0 overflow-hidden rounded-xl border border-white/10">
                                            <img src={rec.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <h5 className="font-bold text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-tight">{rec.title}</h5>
                                            <span className="text-[10px] text-primary mt-1 font-bold tracking-widest uppercase">{rec.tags[0]}</span>
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
