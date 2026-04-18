import React, { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, StaffApplication } from '../types';

interface StaffApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export const StaffApplicationModal: React.FC<StaffApplicationModalProps> = ({ isOpen, onClose, user }) => {
    const [role, setRole] = useState<StaffApplication['roleApplied']>('moderator');
    const [discordHandle, setDiscordHandle] = useState('');
    const [experience, setExperience] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!discordHandle.trim() || !experience.trim()) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'staff_applications'), {
                userId: user.uid,
                userEmail: user.email,
                roleApplied: role,
                discordHandle,
                experience,
                status: 'pending',
                submittedAt: Date.now()
            });
            setSuccess(true);
        } catch (error) {
            console.error("Error submitting application", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative bg-[#0a0a0b] w-full max-w-md rounded-[32px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-scale-up">
                {/* Header Header */}
                <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Staff Application</h3>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">Join the Zerox Elite</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="p-12 flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                            <CheckCircle size={40} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Application Sent</h3>
                        <p className="text-sm text-gray-400">Our Master Admins will review your profile and contact you via Discord if selected.</p>
                        <button 
                            onClick={onClose}
                            className="mt-6 w-full py-4 bg-white/10 text-white font-black uppercase text-sm rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desired Role</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['moderator', 'event_manager', 'support', 'content_creator'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r as any)}
                                        className={`p-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all
                                            ${role === r 
                                                ? 'bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(255,59,48,0.3)]' 
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {r.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discord Handle <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={discordHandle}
                                onChange={(e) => setDiscordHandle(e.target.value)}
                                placeholder="Username#1234 or @Username"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experience / Why you? <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                value={experience}
                                onChange={(e) => setExperience(e.target.value)}
                                rows={4}
                                placeholder="Tell us why you'd be a great fit for this role..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !discordHandle || !experience}
                            className="w-full relative group overflow-hidden rounded-2xl p-[1px] disabled:opacity-50"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-primary via-red-500 to-orange-500 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity blur-sm"></span>
                            <div className="relative bg-black px-6 py-4 rounded-2xl flex justify-center items-center gap-2 group-hover:bg-black/50 transition-colors">
                                <Send size={18} className="text-primary group-hover:text-white transition-colors" />
                                <span className="font-black text-sm uppercase tracking-widest text-primary group-hover:text-white transition-colors">
                                    {loading ? 'Transmitting...' : 'Submit Dispatch'}
                                </span>
                            </div>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
