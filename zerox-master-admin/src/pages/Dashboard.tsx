import React, { useState, useEffect } from 'react';
import { logoutAdmin } from '../authService';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import {
    Users, Trophy, ShieldAlert, Settings, LogOut, TrendingUp,
    FileText, Crown, Activity, RefreshCw, ChevronDown
} from 'lucide-react';

interface Stats {
    totalUsers: number;
    totalTournaments: number;
    publishedTournaments: number;
    admins: number;
}

export default function Dashboard({ adminEmail }: { adminEmail: string }) {
    const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalTournaments: 0, publishedTournaments: 0, admins: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content'>('overview');

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [usersSnap, contentSnap] = await Promise.all([
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'content')),
            ]);

            const users = usersSnap.docs.map(d => d.data());
            const content = contentSnap.docs.map(d => d.data());

            setStats({
                totalUsers: users.length,
                totalTournaments: content.length,
                publishedTournaments: content.filter(c => c.status === 'published').length,
                admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-900/40 border border-red-800/40 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white tracking-tight">ZXS Master Panel</h1>
                        <p className="text-[10px] text-gray-500">{adminEmail}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchStats} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Refresh">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={logoutAdmin} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 text-xs font-bold transition-all">
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Tab bar */}
                <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit">
                    {(['overview', 'users', 'content'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize tracking-wider transition-all
                ${activeTab === tab ? 'bg-red-700 text-white shadow-lg shadow-red-900/30' : 'text-gray-400 hover:text-white'}`}
                        >{tab}</button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/20' },
                                { label: 'Tournaments', value: stats.totalTournaments, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
                                { label: 'Published', value: stats.publishedTournaments, icon: Activity, color: 'text-green-400', bg: 'bg-green-900/20' },
                                { label: 'Admin Accounts', value: stats.admins, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-900/20' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-all">
                                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                                        <s.icon className={`w-4 h-4 ${s.color}`} />
                                    </div>
                                    <p className="text-2xl font-black text-white">{loading ? '—' : s.value}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Action Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: FileText, title: 'Content Manager', desc: 'Create, edit, and publish tournaments & scrims.', color: 'border-purple-500/20 hover:border-purple-500/40', iconColor: 'text-purple-400 bg-purple-900/20' },
                                { icon: Users, title: 'User Manager', desc: 'View all users, assign roles, ban accounts.', color: 'border-blue-500/20 hover:border-blue-500/40', iconColor: 'text-blue-400 bg-blue-900/20' },
                                { icon: TrendingUp, title: 'Analytics', desc: 'Traffic, engagement, conversion stats.', color: 'border-green-500/20 hover:border-green-500/40', iconColor: 'text-green-400 bg-green-900/20' },
                                { icon: Settings, title: 'System Settings', desc: 'About text, banners, global toggles.', color: 'border-gray-500/20 hover:border-gray-500/40', iconColor: 'text-gray-400 bg-gray-900/20' },
                            ].map(card => (
                                <button
                                    key={card.title}
                                    onClick={() => setActiveTab(card.title === 'User Manager' ? 'users' : card.title === 'Content Manager' ? 'content' : 'overview')}
                                    className={`text-left p-5 rounded-xl bg-white/3 border ${card.color} transition-all group`}
                                >
                                    <div className={`w-10 h-10 rounded-xl ${card.iconColor} flex items-center justify-center mb-3`}>
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-white text-sm mb-1">{card.title}</h3>
                                    <p className="text-xs text-gray-500">{card.desc}</p>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white/3 border border-white/10 rounded-xl p-6 text-center">
                        <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-white font-bold mb-1">User Management</h3>
                        <p className="text-gray-500 text-sm">Full user management UI — coming in v1.1. Use Firebase Console for now.</p>
                        <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"
                            className="inline-block mt-4 px-4 py-2 rounded-lg bg-orange-900/20 text-orange-400 border border-orange-800/30 text-xs font-bold hover:bg-orange-900/30 transition-all">
                            Open Firebase Console ↗
                        </a>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="bg-white/3 border border-white/10 rounded-xl p-6 text-center">
                        <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-white font-bold mb-1">Content Management</h3>
                        <p className="text-gray-500 text-sm">Full content uploader — coming in v1.1. Use Creator Studio in main app for now.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
