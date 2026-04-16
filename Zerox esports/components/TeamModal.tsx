import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserMinus, Check, Clock, ShieldAlert } from 'lucide-react';
import { User, TeamRequest } from '../types';
import {
    subscribeToPendingRequests,
    sendTeamRequest,
    acceptTeamRequest,
    rejectTeamRequest,
    getTeammatesProfiles,
    removeTeammate
} from '../services/teamService';
import { toast } from 'sonner';

interface TeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

type Tab = 'teammates' | 'requests' | 'add';

export const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose, user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('teammates');
    const [requests, setRequests] = useState<TeamRequest[]>([]);
    const [teammates, setTeammates] = useState<User[]>([]);
    const [targetUid, setTargetUid] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTeammates, setIsFetchingTeammates] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;

        // Subscribe to incoming requests
        const unsubscribe = subscribeToPendingRequests(user.uid, (data) => {
            setRequests(data);
        });

        // Load teammates profiles
        const loadTeammates = async () => {
            if (!user.teamMembers || user.teamMembers.length === 0) {
                setTeammates([]);
                return;
            }
            setIsFetchingTeammates(true);
            try {
                const profiles = await getTeammatesProfiles(user.teamMembers);
                setTeammates(profiles);
            } catch (error) {
                console.error("Failed to load teammates", error);
            } finally {
                setIsFetchingTeammates(false);
            }
        };

        loadTeammates();

        return () => unsubscribe();
    }, [isOpen, user, user?.teamMembers]);

    if (!isOpen || !user) return null;

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const uid = targetUid.trim();
        if (!uid) return;

        setIsLoading(true);
        try {
            await sendTeamRequest(user.uid, user.displayName || user.email.split('@')[0], uid);
            toast.success("Team request sent!");
            setTargetUid('');
        } catch (error: any) {
            toast.error(error.message || "Failed to send request");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (req: TeamRequest) => {
        try {
            await acceptTeamRequest(req);
            toast.success("Request accepted!");
        } catch (error: any) {
            toast.error(error.message || "Failed to accept");
        }
    };

    const handleReject = async (reqId: string) => {
        try {
            await rejectTeamRequest(reqId);
            toast.success("Request rejected.");
        } catch (error) {
            toast.error("Failed to reject");
        }
    };

    const handleRemoveTeammate = async (teammateId: string) => {
        if (!confirm("Are you sure you want to remove this teammate?")) return;
        try {
            await removeTeammate(user.uid, teammateId);
            toast.success("Teammate removed.");
            setTeammates(prev => prev.filter(t => t.uid !== teammateId));
        } catch (error) {
            toast.error("Failed to remove teammate");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                    <h3 className="text-xl font-display font-bold text-white tracking-widest flex items-center gap-2">
                        <Users className="text-primary" /> My Team
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 shrink-0 bg-white/5">
                    <button
                        onClick={() => setActiveTab('teammates')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'teammates' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                        Teammates ({teammates.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                        Requests
                        {requests.length > 0 && (
                            <span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'add' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                        Add Player
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* TEAMMATES TAB */}
                    {activeTab === 'teammates' && (
                        <div className="space-y-4 animate-fade-in">
                            {isFetchingTeammates ? (
                                <div className="text-center text-gray-500 py-8 animate-pulse text-sm">Loading teammates...</div>
                            ) : teammates.length === 0 ? (
                                <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <Users size={40} className="mx-auto text-gray-600 mb-3" />
                                    <h4 className="text-gray-400 font-bold mb-1">No Teammates Yet</h4>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto">Add players using their App UID to easily register for Duo or Squad tournaments.</p>
                                    <button
                                        onClick={() => setActiveTab('add')}
                                        className="mt-4 px-4 py-2 border border-primary/50 text-primary rounded-lg text-xs font-bold uppercase hover:bg-primary/10 transition-colors"
                                    >
                                        Find Players
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {teammates.map(t => (
                                        <div key={t.uid} className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/30 shrink-0">
                                                    {(t.displayName || t.email)[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{t.displayName || t.email.split('@')[0]}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono">UID: {t.uid}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTeammate(t.uid)}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 md:opacity-100"
                                                title="Remove Teammate"
                                            >
                                                <UserMinus size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="space-y-4 animate-fade-in">
                            {requests.length === 0 ? (
                                <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <ShieldAlert size={40} className="mx-auto text-gray-600 mb-3" />
                                    <h4 className="text-gray-400 font-bold mb-1">No Pending Requests</h4>
                                    <p className="text-xs text-gray-500">You don't have any incoming team requests.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white"><span className="text-primary">{req.senderName}</span> sent a request</p>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">UID: {req.senderId}</p>
                                                </div>
                                                <span className="text-[9px] text-gray-500 flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(req.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    className="flex-1 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(req)}
                                                    className="flex-1 py-2 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                                                >
                                                    <Check size={14} /> Accept
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ADD PLAYER TAB */}
                    {activeTab === 'add' && (
                        <div className="animate-fade-in">
                            <form onSubmit={handleSendRequest} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Player Account UID</label>
                                    <input
                                        type="text"
                                        placeholder="Paste Account UID here"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                        value={targetUid}
                                        onChange={e => setTargetUid(e.target.value)}
                                        required
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                        <ShieldAlert size={10} /> Ask your friend to copy their UID from their Profile page.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || !targetUid.trim() || targetUid === user.uid}
                                    className={`w-full py-4 rounded-xl font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2
                                        ${isLoading || !targetUid.trim() || targetUid === user.uid
                                            ? 'bg-primary/20 text-white/30 cursor-not-allowed'
                                            : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
                                        }`}
                                >
                                    {isLoading ? 'Sending...' : <><UserPlus size={18} /> Send Team Request</>}
                                </button>

                                {targetUid === user.uid && (
                                    <p className="text-xs text-red-400 text-center mt-2">You cannot add yourself.</p>
                                )}
                            </form>

                            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
                                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">How it works</h4>
                                <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                                    <li>Ask your friend for their <b>Account UID</b>.</li>
                                    <li>Enter it above and send a request.</li>
                                    <li>Once they accept, you become teammates.</li>
                                    <li>You can then easily register for Duo/Squad tournaments together without typing their details!</li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
