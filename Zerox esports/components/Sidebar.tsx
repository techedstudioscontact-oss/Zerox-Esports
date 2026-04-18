import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Heart, Shield, Crown, Settings, LogOut, X, Film, Tv, Info, LayoutDashboard, Share2, Trophy, MessageCircle, Newspaper, Wallet, Users } from 'lucide-react';
import { User } from '../types';
import { AboutModal } from './AboutModal';
import { BugReportModal } from './BugReportModal'; // Import
import { Bug } from 'lucide-react'; // Import
import { SupportChatModal } from './SupportChatModal';
import { StaffApplicationModal } from './StaffApplicationModal'; // Import
import { TeamModal } from './TeamModal';
import { subscribeToSystemSettings, SystemSettings } from '../services/systemService';
import { Download } from 'lucide-react';

const MOCK_LEADERS = [
    { name: 'ZX_Phantom', game: 'BGMI', score: 48200 },
    { name: 'ProShooter99', game: 'Free Fire MAX', score: 41750 },
    { name: 'ShadowKing', game: 'BGMI', score: 37400 },
    { name: 'NightWolf_7', game: 'Valorant', score: 29800 },
    { name: 'RedStrike', game: 'Free Fire MAX', score: 21300 },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onLogout }) => {
    const navigate = useNavigate();
    const [showAboutModal, setShowAboutModal] = React.useState(false);
    const [showBugModal, setShowBugModal] = React.useState(false);
    const [showSupportChat, setShowSupportChat] = React.useState(false);
    const [showTeamModal, setShowTeamModal] = React.useState(false);
    const [showStaffApp, setShowStaffApp] = React.useState(false);
    const [settings, setSettings] = React.useState<SystemSettings | null>(null);

    React.useEffect(() => {
        const unsubscribe = subscribeToSystemSettings((data) => {
            setSettings(data);
        });
        return () => unsubscribe();
    }, []);

    // Prevent scrolling when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    const isAnyModalOpen = showAboutModal || showBugModal || showSupportChat || showTeamModal || showStaffApp;

    if (!isOpen && !isAnyModalOpen) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                        onClick={onClose}
                    />

                    {/* Sidebar Drawer */}
                    <div className="relative w-[320px] h-full bg-[#0a0a0b]/80 backdrop-blur-3xl border-r border-white/[0.08] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col animate-slide-in-left">
                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-white/[0.05]">
                    <div className="flex items-center gap-4 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                            <img src="/logo.png" alt="Zerox" className="w-12 h-12 rounded-2xl object-cover shadow-2xl relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-2xl tracking-tighter text-white uppercase italic">Zerox</span>
                            <span className="text-[9px] text-gray-500 font-black tracking-[0.3em] uppercase leading-none">eSports</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-2xl text-gray-500 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-6 bg-white/[0.03] mx-4 mt-6 rounded-[32px] border border-white/[0.05] shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-black flex items-center justify-center text-white font-black text-xl border border-white/10 shadow-lg">
                                {(user.email || user.displayName || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-white truncate text-lg tracking-tight uppercase">
                                    {user.email ? user.email.split('@')[0] : (user.displayName || 'Anonymous')}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,59,48,0.2)]">
                                        {user.role === 'superadmin' && <Crown size={10} className="text-primary shadow-glow" />}
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleNavigation('/wallet')} className="flex-1 bg-white/[0.03] rounded-2xl px-3 py-3 text-center border border-white/[0.05] hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-all group/coins">
                                <span className="block text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black mb-1">Balance</span>
                                <span className="text-yellow-500 font-black font-mono text-base group-hover:text-glow-yellow">₹{user.coins || 0}</span>
                            </button>
                            <div className="flex-1 bg-white/[0.03] rounded-2xl px-3 py-3 text-center border border-white/[0.05]">
                                <span className="block text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black mb-1">Rank</span>
                                <span className="text-white font-black text-base uppercase tracking-tighter">Gold</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-8 px-4 space-y-1 scrollbar-hide">
                    <NavItem icon={<Home size={20} />} label="Home" onClick={() => handleNavigation('/')} />
                    <NavItem icon={<Wallet size={20} />} label="My Wallet" onClick={() => handleNavigation('/wallet')} highlight color="text-yellow-500" />
                    {user && <NavItem icon={<Users size={20} />} label="My Team" onClick={() => setShowTeamModal(true)} highlight color="text-blue-500" />}
                    <div className="px-4 py-2 mt-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Explore</div>
                    <NavItem icon={<Users size={20} />} label="Community Hub" onClick={() => handleNavigation('/community')} highlight color="text-green-500" />
                    <NavItem icon={<Newspaper size={20} />} label="Platform News" onClick={() => handleNavigation('/news')} />
                    <NavItem icon={<Tv size={20} />} label="Tournaments" onClick={() => handleNavigation('/?filter=tournaments')} />
                    <NavItem icon={<Heart size={20} />} label="My Tournaments" onClick={() => handleNavigation('/mylist')} />

                    {settings?.antiCheatUrl && (
                        <NavItem
                            icon={<Download size={20} />}
                            label="Download Anti-Cheat"
                            onClick={() => {
                                window.open(settings.antiCheatUrl, '_blank');
                                onClose();
                            }}
                            highlight
                            className="bg-green-500/5 text-green-400 border-green-500/20 hover:bg-green-500/10"
                        />
                    )}

                    <div className="my-6 border-t border-white/[0.05]" />

                    {/* Admin Links */}
                    {(user?.role === 'superadmin' || user?.role === 'masteradmin') ? (
                        <>
                            <NavItem
                                icon={<Shield size={20} />}
                                label="Master Dashboard"
                                onClick={() => handleNavigation('/admin')}
                                highlight
                                color="text-primary"
                            />
                        </>
                    ) : user?.role === 'admin' && (
                        <NavItem
                            icon={<LayoutDashboard size={20} />}
                            label="Moderator Hub"
                            onClick={() => handleNavigation('/admin')}
                            highlight
                        />
                    )}

                    <NavItem icon={<Settings size={20} />} label="Settings" onClick={() => handleNavigation('/profile')} />
                    <NavItem icon={<Info size={20} />} label="About App" onClick={() => setShowAboutModal(true)} />

                    <div className="my-4 border-t border-white/[0.05]" />

                    <NavItem
                        icon={<Bug size={20} />}
                        label="Report Bug"
                        onClick={() => setShowBugModal(true)}
                        highlight
                        className="text-red-400/80 bg-red-400/5 border-red-400/20"
                    />

                    {/* Support Chat for logged-in users */}
                    {user && (
                        <>
                            <NavItem
                                icon={<MessageCircle size={20} />}
                                label="Live Support Chat"
                                onClick={() => { setShowSupportChat(true); onClose(); }}
                                highlight
                                color="text-secondary"
                            />
                            <NavItem
                                icon={<Users size={20} />}
                                label="Apply for Staff"
                                onClick={() => {
                                    setShowStaffApp(true);
                                    onClose();
                                }}
                                className="text-purple-400/80 hover:text-purple-300"
                            />
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/[0.05] bg-white/[0.02]">
                    {user ? (
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-black uppercase tracking-widest text-[11px]"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleNavigation('/login?mode=signin')}
                                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[11px]"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => handleNavigation('/login?mode=signup')}
                                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20"
                            >
                                Join
                            </button>
                        </div>
                    )}
                    <p className="text-center text-[9px] text-gray-700 mt-6 font-black uppercase tracking-[0.4em] select-none">
                        ZEROX OS v4.0.0
                    </p>
                </div>
            </div>
            </div>
            )}

            <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} user={user} />
            <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} user={user} />
            {user && <StaffApplicationModal isOpen={showStaffApp} onClose={() => setShowStaffApp(false)} user={user} />}
            {showSupportChat && user && (
                <SupportChatModal user={user} onClose={() => setShowSupportChat(false)} />
            )}
        </>
    );
};

const NavItem = ({ icon, label, onClick, active, highlight, className, color }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden
            ${highlight
                ? className || 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]'
                : 'hover:bg-white/[0.05] text-gray-400 hover:text-white'
            }
        `}
    >
        <span className={`${highlight ? (color || 'text-primary') : 'text-gray-600 group-hover:text-white transition-all transform group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className={`font-black uppercase tracking-widest text-[11px] ${highlight ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{label}</span>
        {active && <div className="absolute right-4 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_#ff3b30]" />}
    </button>
);
