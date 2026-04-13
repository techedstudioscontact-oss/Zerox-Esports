import React, { useState } from 'react';
import { loginAdmin } from '../authService';
import { Shield, Eye, EyeOff, KeyRound, Mail, Lock } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secret, setSecret] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [showSec, setShowSec] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginAdmin(email, password, secret);
            onLogin();
        } catch (err: any) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Subtle red glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-sm z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-800/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">ZXS Admin Panel</h1>
                    <p className="text-sm text-gray-500 mt-1">Authorized access only</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    {error && (
                        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-sm text-red-300 text-center">
                            {error}
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Admin Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                            <input
                                type="email" required value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@zeroxesports.com"
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                            <input
                                type={showPwd ? 'text' : 'password'} required value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                            />
                            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-500 hover:text-gray-300">
                                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Master Secret */}
                    <div>
                        <label className="block text-xs font-semibold text-red-400 mb-1.5 uppercase tracking-wider">Master Secret Key</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-red-500/60" />
                            <input
                                type={showSec ? 'text' : 'password'} required value={secret}
                                onChange={e => setSecret(e.target.value)}
                                placeholder="Enter master key..."
                                className="w-full bg-black/50 border border-red-900/40 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                            />
                            <button type="button" onClick={() => setShowSec(!showSec)} className="absolute right-3 top-3 text-gray-500 hover:text-gray-300">
                                {showSec ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white font-bold text-sm tracking-wider hover:from-red-600 hover:to-red-500 transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Authenticating...' : 'ACCESS PANEL'}
                    </button>
                </form>

                <p className="text-center text-[10px] text-gray-700 mt-6 uppercase tracking-widest">
                    Zerox eSports Internal Tool v1.0
                </p>
            </div>
        </div>
    );
}
