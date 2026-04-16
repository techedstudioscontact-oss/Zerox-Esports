import React, { useState, useEffect } from 'react';
import { Database, MessageSquare, Globe, Trash2, Pin, Activity, CheckCircle, XCircle, Headphones } from 'lucide-react';
import { User, Tournament } from '../types';
import { subscribeToRequests, deleteRequest, ContentRequest } from '../services/requestService';
import { updateContentInDb } from '../services/contentService';
import { Button } from '../components/Button';
import { SupportInbox } from '../components/SupportInbox';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ManagerDashboardProps {
    user: User;
    allContent: Tournament[];
    onDeleteContent: (id: string) => Promise<void>;
}

type Tab = 'overview' | 'content' | 'approvals' | 'requests' | 'support';

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
    user,
    allContent = [],
    onDeleteContent,
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [requests, setRequests] = useState<ContentRequest[]>([]);

    // Local state for optimistic updates
    const [localContent, setLocalContent] = useState<Tournament[]>(allContent);
    const pendingCount = localContent.filter(c => (!c.status || c.status === 'pending') && !c.published).length;

    useEffect(() => {
        setLocalContent(allContent);
    }, [allContent]);

    if (user.role !== 'manager' && user.role !== 'superadmin') {
        return <div className="p-20 text-red-500 font-bold text-center font-mono">ACCESS DENIED.</div>;
    }

    const totalContent = localContent.length;

    useEffect(() => {
        let unsubscribe: () => void;
        if (activeTab === 'requests') {
            unsubscribe = subscribeToRequests(setRequests);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeTab]);

    const handleDelete = async (id: string) => {
        if (window.confirm("WARNING: Permanently delete this content?")) {
            await onDeleteContent(id);
            setLocalContent(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleTogglePin = async (item: Tournament) => {
        try {
            // Optimistic update
            setLocalContent(prev => prev.map(c => c.id === item.id ? { ...c, isPinned: !c.isPinned } : c));
            await updateContentInDb(item.id, { isPinned: !item.isPinned });
            toast.success("Pin status updated");
        } catch (error) {
            console.error("Failed to toggle pin", error);
            toast.error("Failed to update pin status");
            setLocalContent(allContent); // Revert
        }
    };

    // Request Handling
    const handleDeleteRequest = async (id: string) => {
        if (!confirm("Remove this request?")) return;
        try {
            await deleteRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
            toast.success("Request removed");
        } catch (error) {
            toast.error("Failed to remove request");
        }
    };

    const TabButton = ({ id, label, icon: Icon, badge }: { id: Tab, label: string, icon: any, badge?: number }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap
            ${activeTab === id
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transform -translate-y-0.5'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            <Icon size={16} /> {label}
            {badge && badge > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0a0a0a]">
                    {badge}
                </span>
            ) : null}
        </button>
    );

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-black/90">
            <div className="container mx-auto">
                {/* Header */}
                <div className="mb-10 border-b border-blue-500/30 pb-6 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded border border-blue-500/50">
                                <Activity className="text-blue-500 h-8 w-8 animate-pulse-slow" />
                            </div>
                            <h1 className="text-4xl font-cinematic font-black text-white uppercase tracking-tighter text-glow">Moderator Hub</h1>
                        </div>
                        <p className="text-blue-500/80 font-mono text-sm tracking-[0.2em] pl-1">MODERATOR // <span className="text-white">ACTIVE</span></p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-gray-500 font-mono text-xs">AUTHORIZED USER</p>
                        <p className="text-white font-mono text-lg">{user.displayName || user.email}</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
                    <TabButton id="overview" label="Overview" icon={Activity} />
                    <TabButton id="approvals" label="Approvals" icon={CheckCircle} badge={pendingCount} />
                    <TabButton id="content" label="Manage Content" icon={Database} />
                    <TabButton id="requests" label="User Requests" icon={MessageSquare} />
                    <TabButton id="support" label="Support Inbox" icon={Headphones} />
                </div>

                <div className="animate-fade-in">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Database size={80} className="text-purple-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500/50"></div>
                                <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Content Index</h3>
                                <p className="text-4xl font-display font-bold text-white">{totalContent}</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('approvals')}>
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <CheckCircle size={80} className="text-yellow-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500/50"></div>
                                <h3 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Pending Approvals</h3>
                                <p className="text-4xl font-display font-bold text-white">{pendingCount}</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('requests')}>
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <MessageSquare size={80} className="text-blue-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/50"></div>
                                <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Check Requests</h3>
                                <p className="text-xs text-gray-400 mt-2">View User Wishes</p>
                            </div>
                        </div>
                    )}

                    {/* APPROVALS TAB */}
                    {activeTab === 'approvals' && (
                        <div className="glass-panel rounded-xl border border-yellow-500/30 overflow-hidden flex flex-col animate-fade-in">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-yellow-500/5">
                                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                    <CheckCircle size={18} className="text-yellow-500" /> Pending Upload Approvals
                                </h3>
                                {pendingCount > 0 && (
                                    <div className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                                        ACTION REQUIRED
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Content</th>
                                            <th className="p-4">Uploader</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {localContent
                                            .filter(c => (!c.status || c.status === 'pending') && !c.published)
                                            .map(item => (
                                                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-mono text-xs">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={item.thumbnailUrl} className="w-8 h-10 object-cover rounded bg-black/50" alt="" />
                                                            <div>
                                                                <div className="font-bold text-white">{item.title}</div>
                                                                <div className="text-[10px] text-gray-500 font-mono">{item.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-gray-400">
                                                        {item.uploadedBy === 'system' ? 'SYSTEM' : item.uploadedBy}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => navigate(`/watch/${item.id}`)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-300 transition-colors"
                                                                title="Preview"
                                                            >
                                                                <Globe size={16} />
                                                            </button>
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={async () => {
                                                                    if (confirm(`Approve "${item.title}"?`)) {
                                                                        setLocalContent(prev => prev.map(c => c.id === item.id ? { ...c, status: 'published', published: true } : c));
                                                                        await updateContentInDb(item.id, { status: 'published', published: true, rejectionReason: null });
                                                                        toast.success("Content Published");
                                                                    }
                                                                }}
                                                                className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                                            >
                                                                <CheckCircle size={14} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={async () => {
                                                                    const reason = prompt("Rejection Reason:");
                                                                    if (reason) {
                                                                        setLocalContent(prev => prev.map(c => c.id === item.id ? { ...c, status: 'rejected', published: false, rejectionReason: reason } : c));
                                                                        await updateContentInDb(item.id, { status: 'rejected', published: false, rejectionReason: reason });
                                                                        toast.error("Content Rejected");
                                                                    }
                                                                }}
                                                                className="bg-red-500/20 text-red-500 hover:bg-red-500/30 h-8 px-3"
                                                            >
                                                                <XCircle size={14} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        {pendingCount === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500 font-mono border-t border-white/5">
                                                    NO PENDING CONTENT FOR APPROVAL.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CONTENT MANAGEMENT TAB */}
                    {activeTab === 'content' && (
                        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] animate-fade-in">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                    <Globe size={18} /> Global Content Registry
                                </h3>
                                <div className="text-[10px] font-mono text-gray-500">{localContent.length} ENTRIES</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Thumbnail</th>
                                            <th className="p-4">Details</th>
                                            <th className="p-4">Author</th>
                                            <th className="p-4">Authorization</th>
                                            <th className="p-4 text-center">Pin</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {localContent.map(item => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 font-mono text-xs text-gray-500">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 w-20">
                                                    <img src={item.thumbnailUrl} className="w-12 h-16 object-cover rounded bg-black/50" alt="" />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{item.title}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{item.id}</div>
                                                    <div className="flex gap-1 mt-1">
                                                        {item.tags.map(t => <span key={t} className="text-[9px] bg-white/10 px-1 rounded">{t}</span>)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-2">
                                                        {item.uploadedBy === 'system' ?
                                                            <span className="w-fit text-accent text-xs font-bold border border-accent/20 px-2 py-1 rounded">SYSTEM</span> :
                                                            <span className="w-fit font-mono text-xs text-gray-400">User: {item.uploadedBy.substring(0, 6)}...</span>
                                                        }

                                                        {(!item.status || item.status === 'pending') && !item.published ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Pending Approval</span>
                                                            </div>
                                                        ) : item.status === 'rejected' ? (
                                                            <span className="w-fit text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">Rejected</span>
                                                        ) : (
                                                            <span className="w-fit text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">Published</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleTogglePin(item)}
                                                        className={`p-2 rounded-full transition-all ${item.isPinned
                                                            ? 'bg-primary text-white shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                                                            : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                        title="Toggle Pin"
                                                    >
                                                        <Pin size={16} className={item.isPinned ? "fill-white" : ""} />
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {(!item.status || item.status === 'pending') && !item.published ? (
                                                            <>
                                                                <button
                                                                    onClick={() => navigate(`/watch/${item.id}`)}
                                                                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                                >
                                                                    <Globe size={14} /> Preview
                                                                </button>
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        if (confirm(`Approve and Publish "${item.title}"?`)) {
                                                                            setLocalContent(prev => prev.map(c => c.id === item.id ? { ...c, status: 'published', published: true } : c));
                                                                            await updateContentInDb(item.id, { status: 'published', published: true, rejectionReason: null });
                                                                            toast.success("Content Published Live");
                                                                        }
                                                                    }}
                                                                    className="bg-green-600 hover:bg-green-700 border-green-500/50"
                                                                >
                                                                    <CheckCircle size={14} />
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const reason = prompt("Enter Rejection Reason (Required):");
                                                                        if (reason) {
                                                                            setLocalContent(prev => prev.map(c => c.id === item.id ? { ...c, status: 'rejected', published: false, rejectionReason: reason } : c));
                                                                            await updateContentInDb(item.id, { status: 'rejected', published: false, rejectionReason: reason });
                                                                            toast.error("Content Rejected");
                                                                        }
                                                                    }}
                                                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/50"
                                                                >
                                                                    <XCircle size={14} />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => handleDelete(item.id)}
                                                                className="opacity-50 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            {/* SECTION 2: USER REQUESTS */}
                            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[300px]">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                        <MessageSquare size={18} /> User Content Wishes
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                            <tr>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">User</th>
                                                <th className="p-4">Request</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                            {requests.map(req => (
                                                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-mono text-xs">{(req.createdAt as any)?.seconds ? new Date((req.createdAt as any).seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                                                    <td className="p-4 text-xs font-bold text-white">{req.userName || req.userId}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">{req.title}</div>
                                                        <div className="text-xs text-gray-400">{req.note}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${req.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                                            {req.status || 'PENDING'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteRequest(req.id)}>Remove</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {requests.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500 font-mono border-t border-white/5">
                                                        NO ACTIVE USER WISHES FOUND.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT INBOX TAB */}
                    {activeTab === 'support' && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                    <Headphones className="text-blue-400 h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">Support Inbox</h2>
                                    <p className="text-gray-500 text-xs">Real-time user support chats — reply as Moderator</p>
                                </div>
                            </div>
                            <SupportInbox admin={user} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
