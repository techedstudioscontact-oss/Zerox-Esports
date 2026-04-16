import React, { useState } from 'react';
import { User, GameProfile } from '../types';
import { Button } from '../components/Button';
import { updateUserInDb } from '../services/authService';
import {
    User as UserIcon, Settings, Mail, Check, ExternalLink, Shield, Crown,
    X, ShieldCheck, Gamepad2, Phone, Hash, Edit3, Lock, MessageSquarePlus, MessageSquare, Copy, Users, Monitor
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { submitRequest } from '../services/requestService';
import { RequestContentModal } from '../components/RequestContentModal';
import { toast } from 'sonner';

interface ProfileProps {
    user: User;
    onLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        phoneNumber: user.phoneNumber || '',
        whatsapp: user.whatsapp || '',
    });
    // For simplicity in this view, we'll only allow editing basic phone numbers.
    // Full game profile management can be done during signup or added as a separate modal later.

    const [isLoading, setIsLoading] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);

    const update = (field: string, value: string) => setEditForm(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const updatedUser: User = { ...user, ...editForm };
            await updateUserInDb(updatedUser);
            toast.success('Profile updated!');
            setIsEditing(false);
        } catch (e: any) {
            toast.error(e.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const copyReferralCode = () => {
        if (user.referralCode) {
            navigator.clipboard.writeText(user.referralCode);
            toast.success('Referral code copied!');
        }
    };

    const roleBadge = () => {
        if (user.role === 'superadmin') return <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Crown size={10} /> Master</span>;
        if (user.role === 'masteradmin') return <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> Master Admin</span>;
        if (user.role === 'manager') return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> Manager</span>;
        if (user.role === 'admin') return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> Admin</span>;
        return <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><UserIcon size={10} /> Player</span>;
    };

    const initial = (user.displayName || user.email || 'U')[0].toUpperCase();

    return (
        <div className="min-h-screen pt-20 pb-20 px-4">
            <div className="max-w-2xl mx-auto space-y-4">

                {/* ── Player Card ─────────────────────────────────── */}
                <div className="relative bg-gradient-to-br from-[#1c1c24] to-[#111] border border-white/10 rounded-3xl overflow-hidden p-6 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
                        <div className="w-20 h-20 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-[0_0_30px_rgba(235,27,36,0.3)] shrink-0">
                            {initial}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-black text-white truncate">{user.displayName || 'Player'}</h1>
                                <div className="shrink-0" title="Display name cannot be changed">{roleBadge()}</div>
                            </div>
                            <p className="text-gray-500 text-xs font-mono flex items-center justify-center md:justify-start gap-1 mb-3">
                                <Mail size={10} /> {user.email}
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                                <p className="text-[10px] text-gray-500 font-mono bg-black/30 border border-white/5 px-2 py-1 rounded truncate max-w-[150px]">
                                    UID: {user.uid}
                                </p>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(user.uid);
                                        toast.success('Account UID copied!');
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    title="Copy Account UID"
                                >
                                    <Copy size={12} />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-600 flex items-center justify-center md:justify-start gap-1">
                                <Lock size={9} /> Display name is permanent.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/5">
                        <div className="text-center">
                            <div className="text-xl font-black text-white">{user.savedTournaments?.length || 0}</div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Saved</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-black text-yellow-400">{user.coins || 0}</div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Coins</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-black text-primary">{user.gameProfiles?.length || 0}</div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Games</div>
                        </div>
                    </div>
                </div>

                {/* ── Refer & Earn ─────────────────────────────────── */}
                <div className="bg-gradient-to-r from-purple-900/20 to-black border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-[-20%] top-[-50%] w-64 h-64 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/30">
                            <Users size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-1">Refer & Earn Coins</h2>
                            <p className="text-xs text-purple-300/70 mb-4 max-w-sm">
                                Share your unique code with friends. When they sign up using your code, you'll earn a random bonus between 10 and 50 coins!
                            </p>

                            <div className="flex items-center gap-2 max-w-sm">
                                <div className="flex-1 rounded-xl bg-black/50 border border-purple-500/30 px-4 py-3 text-center">
                                    <span className="font-mono font-bold text-lg tracking-widest text-purple-400">
                                        {user.referralCode || 'NO-CODE'}
                                    </span>
                                </div>
                                <button
                                    onClick={copyReferralCode}
                                    className="w-12 h-[52px] rounded-xl bg-purple-500 border border-purple-400 flex items-center justify-center text-white hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/30"
                                    title="Copy Code"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Contact Info ─────────────────────────────────── */}
                <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Phone size={16} className="text-primary" />
                            Contact Info
                        </h2>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={isLoading} className="text-xs text-white px-3 py-1.5 rounded-lg bg-primary border border-primary/50 flex items-center gap-1 transition-all">
                                    {isLoading ? 'Saving...' : <><Check size={12} /> Save</>}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1 transition-all">
                                <Edit3 size={12} /> Edit
                            </button>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-600 uppercase tracking-widest">Phone Number</label>
                            {isEditing ? (
                                <input type="tel" value={editForm.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-primary" />
                            ) : (
                                <p className="text-sm font-mono text-white">{user.phoneNumber || 'Not set'}</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-600 uppercase tracking-widest">WhatsApp</label>
                            {isEditing ? (
                                <input type="tel" value={editForm.whatsapp} onChange={e => update('whatsapp', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-primary" />
                            ) : (
                                <p className="text-sm font-mono text-white">{user.whatsapp || 'Not set'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Game Profiles Rendering ─────────────────────────────────── */}
                <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Gamepad2 size={16} className="text-accent" />
                            Registered Game Profiles
                        </h2>
                    </div>

                    <div className="p-5 space-y-3">
                        {!user.gameProfiles || user.gameProfiles.length === 0 ? (
                            <div className="text-center py-6 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center gap-2">
                                <p className="text-gray-500 text-sm">No game profiles added.</p>
                                <button
                                    onClick={() => toast.info('To add a new game profile, please contact Admin Support with your Account UID.', { duration: 6000 })}
                                    className="px-4 py-2 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors"
                                >
                                    Request to add profile
                                </button>
                            </div>
                        ) : (
                            user.gameProfiles.map((p, index) => (
                                <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                                        <Gamepad2 size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">
                                            {p.gameId === 'bgmi' ? 'BGMI' : p.gameId === 'freefire' ? 'Free Fire MAX' : p.gameId === 'valorant' ? 'Valorant' : 'Minecraft'}
                                        </p>
                                        {p.gameId === 'minecraft' ? (
                                            <p className="text-sm text-white font-bold">{p.username}</p>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <p className="text-sm text-white font-bold">{p.inGameName}</p>
                                                <span className="text-gray-600 text-[10px]">|</span>
                                                <p className="text-xs font-mono text-gray-400">UID: {p.gameUID}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="mt-4 p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                            <div className="mt-0.5 text-blue-400">
                                <Lock size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-blue-200 font-medium mb-1">Profiles cannot be modified directly.</p>
                                <p className="text-[10px] text-blue-300/60 leading-relaxed">
                                    To prevent tournament smurfing and hacking, your game profiles are locked. To edit or add a profile, copy your Account UID from the top of this page and send it to Support via the Request button below.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Display Settings ─────────────────────────────── */}
                <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Monitor size={16} className="text-blue-400" />
                            Display Settings
                        </h2>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl">
                            <div>
                                <p className="text-sm font-bold text-gray-200">Live Animation</p>
                                <p className="text-[11px] text-gray-500">Enable video backgrounds & motion effects</p>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await updateUserInDb({ ...user, showLiveBg: !user.showLiveBg });
                                        toast.success(`Live animation ${!user.showLiveBg ? 'enabled' : 'disabled'}`);
                                    } catch (e: any) {
                                        toast.error("Failed to update preference");
                                    }
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.showLiveBg !== false ? 'bg-primary' : 'bg-gray-700'}`}
                            >
                                <span className={`${user.showLiveBg !== false ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Account Settings ─────────────────────────────── */}
                <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Settings size={16} className="text-primary" />
                            Account Settings
                        </h2>
                    </div>

                    <div className="p-5 space-y-2">
                        <button
                            onClick={async () => {
                                if (confirm(`Send password reset email to ${user.email}?`)) {
                                    try {
                                        await sendPasswordResetEmail(auth, user.email);
                                        toast.success('Reset email sent!', { description: 'Check your inbox.' });
                                    } catch (e: any) {
                                        toast.error('Error', { description: e.message });
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                                    <Shield size={16} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-200">Reset Password</p>
                                    <p className="text-[11px] text-gray-500">Send password reset link to email</p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-gray-600" />
                        </button>

                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="w-full flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                                    <MessageSquarePlus size={16} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-200">Support Request</p>
                                    <p className="text-[11px] text-gray-500">Report an issue or contact admins</p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-gray-600" />
                        </button>

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 p-4 text-left bg-white/3 border border-white/8 rounded-2xl hover:bg-white/5 transition-all"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                                <X size={16} />
                            </div>
                            <p className="text-sm font-bold text-gray-300">Log Out</p>
                        </button>
                    </div>
                </div>

            </div>

            <RequestContentModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                user={user}
            />
        </div>
    );
};
