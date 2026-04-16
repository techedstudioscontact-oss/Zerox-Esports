import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Heart, Shield, Crown, Settings, LogOut, X, Film, Tv, Info, LayoutDashboard, Share2, Trophy, MessageCircle, Newspaper, Wallet, Users } from 'lucide-react';
import { User } from '../types';
import { AboutModal } from './AboutModal';
import { BugReportModal } from './BugReportModal'; // Import
import { Bug } from 'lucide-react'; // Import
import { SupportChatModal } from './SupportChatModal';
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div className="relative w-[300px] h-full bg-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col animate-slide-in-left">
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Zerox" className="w-10 h-10 rounded object-cover shadow-lg shadow-primary/20" />
                        <span className="font-bold text-xl tracking-tight text-white">ZXS</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-6 bg-white/5 mx-4 mt-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30">
                                {(user.email || user.displayName || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white truncate">
                                    {user.email ? user.email.split('@')[0] : (user.displayName || 'Anonymous')}
                                </h4>
                                <span className="text-xs text-gray-400 capitalize flex items-center gap-1">
                                    {user.role === 'superadmin' && <Crown size={12} className="text-yellow-500" />}
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleNavigation('/wallet')} className="flex-1 bg-black/30 rounded px-3 py-2 text-center border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                                <span className="block text-xs text-gray-500 uppercase tracking-wider">Coins</span>
                                <span className="text-yellow-400 font-bold font-mono">{user.coins || 0}</span>
                            </button>
                            <div className="flex-1 bg-black/30 rounded px-3 py-2 text-center border border-white/5">
                                <span className="block text-xs text-gray-500 uppercase tracking-wider">Role</span>
                                <span className="text-primary font-bold">{user.role}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    <NavItem icon={<Home size={20} />} label="Home" onClick={() => handleNavigation('/')} />
                    <NavItem icon={<Wallet size={20} />} label="My Wallet" onClick={() => handleNavigation('/wallet')} highlight />
                    {user && <NavItem icon={<Users size={20} />} label="My Team" onClick={() => setShowTeamModal(true)} highlight />}
                    <NavItem icon={<Newspaper size={20} />} label="Platform News" onClick={() => handleNavigation('/news')} />
                    <NavItem icon={<Tv size={20} />} label="Tournaments" onClick={() => handleNavigation('/?filter=tournaments')} />
                    <NavItem icon={<Film size={20} />} label="Scrims" onClick={() => handleNavigation('/?filter=scrims')} />
                    <NavItem icon={<Heart size={20} />} label="My Tournaments" onClick={() => handleNavigation('/mylist')} active />

                    {settings?.antiCheatUrl && (
                        <NavItem
                            icon={<Download size={20} />}
                            label="Download Anti-Cheat"
                            onClick={() => {
                                window.open(settings.antiCheatUrl, '_blank');
                                onClose();
                            }}
                            highlight
                            className="bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                        />
                    )}

                    <div className="my-4 border-t border-white/10" />

                    {/* Admin Links */}
                    {(user?.role === 'superadmin' || user?.role === 'masteradmin') ? (
                        <>
                            <NavItem
                                icon={<Shield size={20} />}
                                label="Master Dashboard"
                                onClick={() => handleNavigation('/admin')}
                                highlight
                            />
                            <NavItem
                                icon={<Newspaper size={20} />}
                                label="News Manager"
                                onClick={() => handleNavigation('/admin?tab=news')}
                            />
                        </>
                    ) : user?.role === 'admin' && (
                        <NavItem
                            icon={<LayoutDashboard size={20} />}
                            label="Moderator Panel"
                            onClick={() => handleNavigation('/admin')}
                            highlight
                        />
                    )}

                    <NavItem icon={<Settings size={20} />} label="Settings" onClick={() => handleNavigation('/profile')} />
                    <NavItem
                        icon={<Share2 size={20} />}
                        label="Share App"
                        onClick={async () => {
                            if (navigator.share) {
                                try {
                                    await navigator.share({
                                        title: 'Zerox eSports',
                                        text: 'Check out Zerox eSports - Registration and VODs!',
                                        url: window.location.origin
                                    });
                                } catch (error) {
                                    console.log('Error sharing', error);
                                }
                            } else {
                                prompt("Copy link to share:", window.location.origin);
                            }
                        }}
                    />
                    <NavItem icon={<Info size={20} />} label="About App" onClick={() => setShowAboutModal(true)} />

                    <div className="my-2 border-t border-white/10" />

                    <NavItem
                        icon={<Bug size={20} />}
                        label="Report Bug"
                        onClick={() => setShowBugModal(true)}
                        highlight
                        className="text-red-400 group-hover:text-red-300"
                    />

                    {/* Support Chat for logged-in users */}
                    {user && (
                        <NavItem
                            icon={<MessageCircle size={20} />}
                            label="Live Support Chat"
                            onClick={() => { setShowSupportChat(true); onClose(); }}
                            highlight
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20">
                    {user ? (
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-semibold"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleNavigation('/login?mode=signin')}
                                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all font-bold"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => handleNavigation('/login?mode=signup')}
                                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20"
                            >
                                Sign Up
                            </button>
                        </div>
                    )}
                    <p className="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest">
                        Zerox eSports v4.0 // Build 2026.03.15
                    </p>
                </div>
            </div>

            <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} user={user} />
            <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} user={user} />
            {showSupportChat && user && (
                <SupportChatModal user={user} onClose={() => setShowSupportChat(false)} />
            )}
        </div>
    );
};

const NavItem = ({ icon, label, onClick, active, highlight, className }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all group
            ${highlight
                ? className || 'bg-gradient-to-r from-primary/20 to-transparent text-primary border border-primary/20 hover:from-primary/30'
                : 'hover:bg-white/5 text-gray-300 hover:text-white'
            }
        `}
    >
        <span className={`${highlight ? 'text-inherit' : 'text-gray-500 group-hover:text-white transition-colors'}`}>
            {icon}
        </span>
        <span className="font-medium">{label}</span>
    </button>
);
