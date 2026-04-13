import React, { useState, useEffect } from 'react';
import { User, Tournament, AdminActivity, GameProfile } from '../types';
import { CATEGORIES } from '../constants';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Button } from '../components/Button';
import {
    Upload, DollarSign, Settings, Wallet, CheckCircle2, FileText, Plus,
    BarChart3, Activity, Users, Shield, ShieldAlert, Lock, Unlock, Film, PlusCircle, ChevronRight, LayoutDashboard, Trash2, Camera, Image as ImageIcon, Pin, List, Zap, Mail, PenSquare, X, Download, AlertTriangle, Search, Gamepad2, Save
} from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { updateUserInDb, getAllUsers } from '../services/authService';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, setDoc, query, where, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { SupportInbox } from '../components/SupportInbox';
import { NewsManager } from '../components/NewsManager';
import { Newspaper } from 'lucide-react';
import { RegistrationsManager } from '../components/RegistrationsManager';

type Tab = 'content' | 'registrations' | 'settings' | 'stats' | 'wallet' | 'support' | 'news' | 'users';

interface AdminDashboardProps {
    user: User;
    userContent: Tournament[];
    onBecomeAdmin: () => Promise<void>;
    onUpload: (content: Omit<Tournament, 'id' | 'createdAt' | 'uploadedBy'>) => Promise<void>;
    onUpdate: (id: string, content: Partial<Tournament>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, userContent, onBecomeAdmin, onUpload, onUpdate, onDelete }) => {
    // ... (existing state)

    const [newEpTitle, setNewEpTitle] = useState('');
    const [newEpUrl, setNewEpUrl] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('content');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tab = queryParams.get('tab');
        if (tab === 'news' && (user.role === 'superadmin' || user.role === 'masteradmin')) {
            setActiveTab('news');
        }
    }, [user.role]);


    const handleAddEpisode = () => {
        if (newEpTitle && newEpUrl) {
            const newEp = {
                id: Date.now().toString(),
                title: newEpTitle,
                videoUrl: newEpUrl,
                number: uploadForm.matches.length + 1
            };
            setUploadForm({
                ...uploadForm,
                matches: [...uploadForm.matches, newEp]
            });
            setNewEpTitle('');
            setNewEpUrl('');
        }
    };
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Content Form State
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        thumbnailUrl: '',
        coverUrl: '', // New Field
        videoUrl: '',
        downloadUrl: '', // Ensure initialized
        tags: [] as string[],
        isPinned: false,
        isFeatured: false,
        contentType: 'event' as 'event' | 'scrim',
        matches: [] as { id: string; title: string; videoUrl: string; number: number }[], // Always initialized
        introStart: '' as string | number,
        introEnd: '' as string | number,
        outroStart: '' as string | number,
        outroEnd: '' as string | number,
        entryFee: '' as string | number,
        roomId: '',
        roomPassword: ''
    });

    const [uploadProgress, setUploadProgress] = useState(0);

    // Helper for picking images
    const pickImage = async (field: 'thumbnailUrl' | 'coverUrl') => {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos // Prompt user to pick from photos
            });

            if (image.webPath) {
                // Convert blob to file for Cloudinary
                const response = await fetch(image.webPath);
                const blob = await response.blob();
                const file = new File([blob], 'image_' + Date.now() + '.jpg', { type: blob.type });

                // Upload
                setIsSubmitting(true); // Reuse submitting state for spinner
                const url = await uploadToCloudinary(file);

                setUploadForm(prev => ({ ...prev, [field]: url }));
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error("Image pick failed", error);
            setIsSubmitting(false);
        }
    };

    // Settings Form State
    const [contactSettings, setContactSettings] = useState({
        publicEmail: user.email,
        displayName: user.displayName || 'Admin',
        acceptMessages: true
    });

    // --- User UID Lookup & Management State ---
    const [searchUid, setSearchUid] = useState("");
    const [searchedUser, setSearchedUser] = useState<User | null>(null);
    const [isSearchingUser, setIsSearchingUser] = useState(false);
    const [topupAmount, setTopupAmount] = useState(0);
    const [editingProfiles, setEditingProfiles] = useState<GameProfile[]>([]);

    const handleSearchUserByUid = async () => {
        if (!searchUid.trim()) return toast.error("Please enter a UID to search.");
        setIsSearchingUser(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', searchUid.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error("No user found with that UID.");
                setSearchedUser(null);
            } else {
                const userData = querySnapshot.docs[0].data() as User;
                setSearchedUser(userData);
                setEditingProfiles(userData.gameProfiles || []);
                setTopupAmount(0);
                toast.success("User loaded successfully.");
            }
        } catch (error) {
            console.error("Error searching user by UID:", error);
            toast.error("Failed to search for user.");
        } finally {
            setIsSearchingUser(false);
        }
    };

    const handleTopUpCoins = async () => {
        if (!searchedUser || topupAmount === 0) return;

        try {
            // Check if the current user needs approval (Admins)
            if (user.role === 'admin') {
                const requestData = {
                    userId: searchedUser.uid,
                    userEmail: searchedUser.email,
                    amount: topupAmount,
                    requestedBy: user.uid,
                    requestedByName: user.displayName || user.email.split('@')[0],
                    timestamp: Date.now(),
                    status: 'pending'
                };

                await addDoc(collection(db, 'credit_requests'), requestData);
                toast.success(`Request to ${topupAmount > 0 ? 'add' : 'deduct'} ${Math.abs(topupAmount)} coins sent to Management for approval.`);
                setTopupAmount(0);
                return;
            }

            // Manager / MasterAdmin direct wallet modification
            const newBalance = (searchedUser.coins || 0) + topupAmount;
            if (newBalance < 0) {
                toast.error("User cannot have a negative coin balance.");
                return;
            }

            // Execute update
            await updateUserInDb({ ...searchedUser, coins: newBalance });
            setSearchedUser({ ...searchedUser, coins: newBalance });

            // Log direct transaction
            await addDoc(collection(db, 'transactions'), {
                userId: searchedUser.uid,
                amount: Math.abs(topupAmount),
                type: topupAmount > 0 ? 'credit' : 'debit',
                reason: 'add_money',
                timestamp: Date.now(),
                status: 'completed',
                processedBy: user.uid
            });

            toast.success(`Successfully ${topupAmount > 0 ? 'added' : 'deducted'} ${Math.abs(topupAmount)} coins. New Balance: ${newBalance}`);
            setTopupAmount(0);
        } catch (error) {
            console.error(error);
            toast.error("Failed to process wallet request.");
        }
    };

    const handleSaveGameProfiles = async () => {
        if (!searchedUser) return;
        try {
            await updateUserInDb({ ...searchedUser, gameProfiles: editingProfiles });
            setSearchedUser({ ...searchedUser, gameProfiles: editingProfiles });
            toast.success("Game Profiles updated successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save game profiles.");
        }
    };

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'masteradmin' && user.role !== 'manager') {
        return (
            <div className="min-h-screen pt-32 px-4 flex justify-center text-white">
                <p>You do not have administrative access.</p>
            </div>
        );
    }

    // Active Admin Dashboard
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingId) {
                await onUpdate(editingId, {
                    title: uploadForm.title,
                    description: uploadForm.description,
                    thumbnailUrl: uploadForm.thumbnailUrl,
                    coverUrl: uploadForm.coverUrl,
                    videoUrl: uploadForm.videoUrl,
                    downloadUrl: uploadForm.downloadUrl, // Added
                    tags: uploadForm.tags,
                    isPinned: uploadForm.isPinned,
                    isFeatured: uploadForm.isFeatured,
                    matches: uploadForm.matches,
                    introStart: Number(uploadForm.introStart) || 0,
                    introEnd: Number(uploadForm.introEnd) || 0,
                    outroStart: Number(uploadForm.outroStart) || 0,
                    outroEnd: Number(uploadForm.outroEnd) || 0,
                    entryFee: Number((uploadForm as any).entryFee) || 0,
                    roomId: (uploadForm as any).roomId || '',
                    roomPassword: (uploadForm as any).roomPassword || ''
                });
                setEditingId(null);
            } else {
                toast.info("Initiating Upload...");
                await onUpload({
                    title: uploadForm.title,
                    description: uploadForm.description,
                    thumbnailUrl: uploadForm.thumbnailUrl || 'https://picsum.photos/400/600',
                    coverUrl: uploadForm.coverUrl,
                    videoUrl: uploadForm.videoUrl,
                    downloadUrl: uploadForm.downloadUrl || '',
                    tags: uploadForm.tags || [],
                    status: 'pending', // Admins need approval
                    published: false, // Legacy support
                    isPremium: true,
                    isPinned: uploadForm.isPinned,
                    isFeatured: uploadForm.isFeatured,
                    matches: uploadForm.matches,
                    introStart: Number(uploadForm.introStart) || 0,
                    introEnd: Number(uploadForm.introEnd) || 0,
                    outroStart: Number(uploadForm.outroStart) || 0,
                    outroEnd: Number(uploadForm.outroEnd) || 0,
                    contentType: uploadForm.contentType || 'event',
                    map: (uploadForm as any).map || '',
                    teamSize: (uploadForm as any).teamSize || '',
                    maxSlots: Number((uploadForm as any).maxSlots) || 0,
                    prizePool: (uploadForm as any).prizePool || '',
                    startDate: (uploadForm as any).startDate || '',
                    registrationCloseDate: (uploadForm as any).registrationCloseDate || '',
                    entryFee: Number((uploadForm as any).entryFee) || 0,
                    roomId: (uploadForm as any).roomId || '',
                    roomPassword: (uploadForm as any).roomPassword || ''
                });
            }
            // Reset form with ALL fields to prevent crash
            setUploadForm({
                title: '',
                description: '',
                thumbnailUrl: '',
                coverUrl: '',
                videoUrl: '',
                downloadUrl: '',
                tags: [],
                isPinned: false,
                isFeatured: false,
                contentType: 'event',
                matches: [],
                introStart: '',
                introEnd: '',
                outroStart: '',
                outroEnd: '',
                map: '',
                teamSize: '',
                maxSlots: '',
                prizePool: '',
                startDate: '',
                registrationCloseDate: '',
                entryFee: '',
                roomId: '',
                roomPassword: ''
            });
        } catch (error) {
            console.error("Operation failed", error);
            alert("Failed to save content: " + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (item: Tournament) => {
        setEditingId(item.id);
        setUploadForm({
            title: item.title || '',
            description: item.description || '',
            thumbnailUrl: item.thumbnailUrl || '',
            coverUrl: item.coverUrl || '',
            videoUrl: item.videoUrl || '',
            downloadUrl: item.downloadUrl || '', // Ensure safely initialized
            tags: item.tags || [], // CRITICAL: Prevent crash if tags is undefined
            isPinned: item.isPinned || false,
            contentType: item.contentType || 'event',
            matches: item.matches || [],
            introStart: item.introStart || '',
            introEnd: item.introEnd || '',
            outroStart: item.outroStart || '',
            outroEnd: item.outroEnd || '',
            entryFee: item.entryFee || '',
            roomId: item.roomId || '',
            roomPassword: item.roomPassword || ''
        });
        setActiveTab('content'); // Switch to content tab
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info(`Editing: ${item.title}`);
    };

    const addTag = (tag: string) => {
        if (!uploadForm.tags.includes(tag)) {
            setUploadForm({ ...uploadForm, tags: [...uploadForm.tags, tag] });
        }
    };

    const removeTag = (tagToRemove: string) => {
        setUploadForm({ ...uploadForm, tags: uploadForm.tags.filter(t => t !== tagToRemove) });
    };

    const handleSettingsSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Settings Saved Successfully!");
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await onDelete(deleteId);
            setDeleteId(null);
        }
    };

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items - center gap - 2 px - 6 py - 3 rounded - lg text - sm font - bold uppercase tracking - wide transition - all
            ${activeTab === id
                    ? 'bg-primary text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] transform -translate-y-0.5'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                } `}
        >
            <Icon size={16} /> {label}
        </button>
    );

    // ... (existing helper functions)

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">

            {/* ... (Header) */}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5">
                <TabButton id="content" label="Event Creator" icon={Upload} />
                <TabButton id="registrations" label="Registrations" icon={Users} />
                <TabButton id="users" label="User Management" icon={ShieldAlert} />
                <TabButton id="support" label="Support Chat" icon={Mail} />
                {(user.role === 'superadmin' || user.role === 'masteradmin') && (
                    <TabButton id="news" label="News Manager" icon={Newspaper} />
                )}
                <TabButton id="settings" label="Settings" icon={Settings} />
            </div>

            <div className="animate-fade-in">

                {/* USERS / UID LOOKUP TAB */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert size={18} className="text-primary" />
                            <div>
                                <h2 className="text-white font-bold">User Management</h2>
                                <p className="text-gray-500 text-xs">Lookup UID, Top-up Wallet, Add/Edit Game Profiles</p>
                            </div>
                        </div>

                        {/* --- User UID Lookup Tool --- */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Search className="text-blue-400" /> Advanced User Lookup (UID)
                            </h3>
                            <div className="flex gap-3 mb-6">
                                <input
                                    type="text"
                                    placeholder="Paste Firebase UID here..."
                                    value={searchUid}
                                    onChange={(e) => setSearchUid(e.target.value)}
                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                                />
                                <Button variant="primary" onClick={handleSearchUserByUid} isLoading={isSearchingUser}>
                                    Search User
                                </Button>
                            </div>

                            {searchedUser && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 border border-white/10 rounded-xl p-6">
                                    {/* User Info & Wallet */}
                                    <div>
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold text-white mb-1">{searchedUser.displayName}</h4>
                                            <p className="text-xs text-gray-400 font-mono mb-1">{searchedUser.email}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">UID: {searchedUser.uid}</p>
                                        </div>

                                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-mono">Wallet Balance</p>
                                                <p className="text-2xl font-bold text-yellow-400 font-mono">{searchedUser.coins || 0}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-end gap-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1 font-mono">Top-Up / Deduct Amount</label>
                                                <input
                                                    type="number"
                                                    value={topupAmount}
                                                    onChange={(e) => setTopupAmount(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white font-mono focus:border-yellow-400 focus:outline-none"
                                                />
                                                <p className="text-[9px] text-gray-600 mt-1">Use negative values to deduct coins.</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={handleTopUpCoins} className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 mb-[18px]">
                                                <DollarSign size={14} className="mr-1" /> Execute
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Game Profiles Editor */}
                                    <div className="border-l border-white/10 pl-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Gamepad2 size={14} className="text-accent" /> Game Profiles
                                            </h4>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-accent/30 text-accent text-[10px] px-2 py-1 h-auto"
                                                onClick={() => setEditingProfiles([...editingProfiles, { gameId: 'bgmi', inGameName: '', gameUID: '' }])}
                                            >
                                                <Plus size={10} className="mr-1" /> Add
                                            </Button>
                                        </div>

                                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            {editingProfiles.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic text-center py-4 bg-black/30 rounded border border-white/5">No game profiles found.</p>
                                            ) : editingProfiles.map((p, idx) => (
                                                <div key={idx} className="bg-black/50 border border-white/10 rounded p-3 relative group">
                                                    <button
                                                        onClick={() => setEditingProfiles(editingProfiles.filter((_, i) => i !== idx))}
                                                        className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <select
                                                        value={p.gameId}
                                                        onChange={(e) => {
                                                            const newP = [...editingProfiles];
                                                            newP[idx].gameId = e.target.value as any;
                                                            setEditingProfiles(newP);
                                                        }}
                                                        className="w-full bg-transparent border-b border-white/10 pb-1 mb-2 text-xs font-bold text-accent focus:outline-none"
                                                    >
                                                        <option value="bgmi" className="bg-zinc-900 text-white">BGMI</option>
                                                        <option value="freefire" className="bg-zinc-900 text-white">Free Fire MAX</option>
                                                        <option value="valorant" className="bg-zinc-900 text-white">Valorant</option>
                                                        <option value="minecraft" className="bg-zinc-900 text-white">Minecraft</option>
                                                    </select>

                                                    {p.gameId === 'minecraft' ? (
                                                        <input
                                                            type="text"
                                                            placeholder="Minecraft Username"
                                                            value={p.username || ''}
                                                            onChange={(e) => {
                                                                const newP = [...editingProfiles];
                                                                newP[idx].username = e.target.value;
                                                                setEditingProfiles(newP);
                                                            }}
                                                            className="w-full bg-black/50 border border-white/10 rounded p-2 mt-1 text-white font-mono text-xs focus:border-accent focus:outline-none"
                                                        />
                                                    ) : (
                                                        <div className="space-y-2 mt-2">
                                                            <input
                                                                type="text"
                                                                placeholder="In-Game Name (IGN)"
                                                                value={p.inGameName || ''}
                                                                onChange={(e) => {
                                                                    const newP = [...editingProfiles];
                                                                    newP[idx].inGameName = e.target.value;
                                                                    setEditingProfiles(newP);
                                                                }}
                                                                className="w-full bg-black/50 border border-white/10 rounded p-2 text-white font-mono text-xs focus:border-accent focus:outline-none"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Game UID"
                                                                value={p.gameUID || ''}
                                                                onChange={(e) => {
                                                                    const newP = [...editingProfiles];
                                                                    newP[idx].gameUID = e.target.value;
                                                                    setEditingProfiles(newP);
                                                                }}
                                                                className="w-full bg-black/50 border border-white/10 rounded p-2 text-white font-mono text-xs focus:border-accent focus:outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {editingProfiles.length > 0 && (
                                            <Button size="sm" variant="primary" className="w-full mt-4" onClick={handleSaveGameProfiles}>
                                                <Save size={14} className="mr-2" /> Save Game Profiles
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SUPPORT CHAT TAB */}
                {activeTab === 'support' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail size={18} className="text-primary" />
                            <div>
                                <h2 className="text-white font-bold">Support Chat</h2>
                                <p className="text-gray-500 text-xs">Reply to user messages in real time</p>
                            </div>
                        </div>
                        <SupportInbox admin={user} />
                    </div>
                )}

                {/* NEWS MANAGER TAB */}
                {activeTab === 'news' && (user.role === 'superadmin' || user.role === 'masteradmin') && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Newspaper size={18} className="text-primary" />
                            <div>
                                <h2 className="text-white font-bold">News Manager</h2>
                                <p className="text-gray-500 text-xs">Publish platform announcements and updates</p>
                            </div>
                        </div>
                        <NewsManager admin={user} />
                    </div>
                )}

                {/* REGISTRATIONS MANAGER TAB */}
                {activeTab === 'registrations' && (
                    <div className="animate-fade-in">
                        <RegistrationsManager userContent={userContent} />
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="animate-fade-in space-y-8">

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Upload Form */}
                            <div className="lg:col-span-1">
                                <div className="glass-panel rounded-2xl p-1 border border-white/10 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="p-6 relative z-10">
                                        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                                            <Upload size={20} className="text-primary" />
                                            <span className="tracking-wider">{editingId ? 'EDIT TOURNAMENT' : 'UPLOAD TOURNAMENT'}</span>
                                        </h2>
                                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1 group-focus-within:text-white transition-colors">Tournament Title</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none focus:shadow-[0_0_15px_rgba(217,70,239,0.2)] transition-all font-mono"
                                                    value={uploadForm.title}
                                                    onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tournament Rules / Description</label>
                                                <textarea
                                                    required
                                                    rows={3}
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono"
                                                    value={uploadForm.description}
                                                    onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Visual Assets</label>

                                                <div className="flex gap-4">
                                                    {/* Thumbnail Picker */}
                                                    <div className="flex-1">
                                                        <div
                                                            onClick={() => pickImage('thumbnailUrl')}
                                                            className="border-2 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-black/40 h-32"
                                                        >
                                                            {uploadForm.thumbnailUrl ? (
                                                                <img src={uploadForm.thumbnailUrl} className="h-full object-contain" alt="Thumbnail" />
                                                            ) : (
                                                                <>
                                                                    <ImageIcon className="text-gray-400 mb-2" />
                                                                    <span className="text-xs text-gray-500">Upload Thumbnail</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Cover Picker */}
                                                    <div className="flex-1">
                                                        <div
                                                            onClick={() => pickImage('coverUrl')}
                                                            className="border-2 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-black/40 h-32"
                                                        >
                                                            {uploadForm.coverUrl ? (
                                                                <img src={uploadForm.coverUrl} className="h-full object-contain" alt="Cover" />
                                                            ) : (
                                                                <>
                                                                    <Camera className="text-gray-400 mb-2" />
                                                                    <span className="text-xs text-gray-500">Upload Cover Page</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4 mb-6 animate-fade-in">
                                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Film size={12} className="text-primary" /> VOD / Live Stream URL (Optional)
                                                    </label>
                                                    <input
                                                        type="url"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono placeholder:text-gray-700"
                                                        placeholder="https://youtube.com/live/... or twitch.tv/..."
                                                        value={uploadForm.videoUrl}
                                                        onChange={e => setUploadForm({ ...uploadForm, videoUrl: e.target.value })}
                                                    />
                                                </div>
                                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Download size={12} className="text-green-500" /> Registration / Results Link (Optional)
                                                    </label>
                                                    <input
                                                        type="url"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono placeholder:text-gray-700"
                                                        placeholder="https://forms.google.com/... or results page"
                                                        value={uploadForm.downloadUrl || ''}
                                                        onChange={e => setUploadForm({ ...uploadForm, downloadUrl: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4 mb-4">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Zap size={12} className="text-yellow-500" /> Tournament Details
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 uppercase tracking-wider">Map / Arena</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="e.g. Erangel, Bermuda"
                                                            value={(uploadForm as any).map || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), map: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 uppercase tracking-wider">Team Size</label>
                                                        <select
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            value={(uploadForm as any).teamSize || 'squad'}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), teamSize: e.target.value } as any)}
                                                        >
                                                            <option value="solo">Solo (1v1)</option>
                                                            <option value="duo">Duo (2-man)</option>
                                                            <option value="squad">Squad (4-man)</option>
                                                            <option value="6man">6-Man Team</option>
                                                            <option value="open">Open (Any)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 uppercase tracking-wider">Max Slots</label>
                                                        <input
                                                            type="number"
                                                            min="2"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="16"
                                                            value={(uploadForm as any).maxSlots || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), maxSlots: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 uppercase tracking-wider">Prize Pool</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="e.g. ₹50,000"
                                                            value={(uploadForm as any).prizePool || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), prizePool: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-yellow-400 uppercase tracking-wider flex items-center gap-1">Entry Fee (Coins)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="e.g. 50"
                                                            value={(uploadForm as any).entryFee || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), entryFee: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-green-400 uppercase tracking-wider">Start Date</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1 invert-calendar-icon"
                                                            value={(uploadForm as any).startDate || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), startDate: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-red-400 uppercase tracking-wider">Registration Close Date</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1 invert-calendar-icon"
                                                            value={(uploadForm as any).registrationCloseDate || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), registrationCloseDate: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-primary uppercase tracking-wider">Room ID (Secret)</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="Revealed after reg"
                                                            value={(uploadForm as any).roomId || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), roomId: e.target.value } as any)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-primary uppercase tracking-wider">Room Password</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary focus:outline-none mt-1"
                                                            placeholder="Revealed after reg"
                                                            value={(uploadForm as any).roomPassword || ''}
                                                            onChange={e => setUploadForm({ ...uploadForm, ...(uploadForm as any), roomPassword: e.target.value } as any)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tags</label>

                                                {/* Selected Tags Chips */}
                                                <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                                                    {uploadForm.tags.length === 0 && <span className="text-gray-600 text-xs italic py-1">No tags selected</span>}
                                                    {uploadForm.tags.map(tag => (
                                                        <span key={tag} className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                                            {tag}
                                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-white"><X size={10} /></button>
                                                        </span>
                                                    ))}
                                                </div>

                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono cursor-pointer appearance-none"
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            addTag(e.target.value);
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>+ Add Category Tag</option>
                                                    {CATEGORIES.filter(c => c !== 'Recent' && !uploadForm.tags.includes(c)).map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>


                                                {/* Master Admin Pin Control */}
                                                {user.role === 'superadmin' && (
                                                    <div className="mt-4 flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            id="isPinned"
                                                            checked={uploadForm.isPinned}
                                                            onChange={(e) => setUploadForm({ ...uploadForm, isPinned: e.target.checked })}
                                                            className="w-4 h-4 accent-primary"
                                                        />
                                                        <label htmlFor="isPinned" className="text-white text-sm font-bold flex items-center gap-2">
                                                            <Pin size={14} className="fill-primary text-primary" /> Pin to Home Carousel
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {editingId && (
                                                    <Button type="button" onClick={() => { setEditingId(null); setUploadForm({ title: '', description: '', thumbnailUrl: '', coverUrl: '', videoUrl: '', tags: [] }) }} variant="secondary" className="w-1/3">CANCEL</Button>
                                                )}
                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    className="flex-1 font-display font-bold tracking-wider"
                                                    isLoading={isSubmitting}
                                                >
                                                    {editingId ? 'UPDATE' : 'INITIATE UPLOAD'}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Content List */}
                            <div className="lg:col-span-2">
                                <div className="glass-panel rounded-2xl p-6 border border-white/10 h-full flex flex-col">
                                    <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                                        <List size={20} className="text-primary" />
                                        <span className="tracking-wider">ACTIVE DEPLOYMENTS</span>
                                    </h2>

                                    {userContent.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-xl p-8">
                                            <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                                            <p>No active streams found.</p>
                                            <p className="text-xs">Upload content to populate grid.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                                            {userContent.map(item => (
                                                <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-black/40 border border-white/5 hover:border-primary/50 transition-all group">
                                                    <div className="w-20 h-28 shrink-0 overflow-hidden rounded relative">
                                                        <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title} />
                                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-white font-display text-lg group-hover:text-primary transition-colors">{item.title}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => startEdit(item)}
                                                                    className="p-1 hover:text-primary text-gray-400 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <PenSquare size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteId(item.id)}
                                                                    className="p-1 hover:text-red-500 text-gray-400 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border 
                                                                    ${item.status === 'published' || item.published
                                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                        : item.status === 'rejected'
                                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                                    {item.status === 'published' || item.published ? 'LIVE' : item.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-400 line-clamp-2 mt-1 font-sans">{item.description}</p>
                                                        <div className="flex gap-3 mt-3">
                                                            <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                                                                ID: {item.id}
                                                            </span>
                                                            <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                                                                {new Date(item.createdAt).toLocaleDateString()}
                                                            </span>
                                                            {item.tags?.length > 0 && (
                                                                <span className="text-[10px] text-gray-400 font-mono px-1 py-1">
                                                                    [{item.tags?.join(', ')}]
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.status === 'rejected' && item.rejectionReason && (
                                                            <div className="mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-400 flex items-start gap-2">
                                                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                                                <div>
                                                                    <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Rejected</span>
                                                                    "{item.rejectionReason}"
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto glass-panel p-8 rounded-2xl border border-white/10">
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
                                <Mail size={24} className="text-primary" /> Contact & Profile Settings
                            </h2>
                            <form onSubmit={handleSettingsSave} className="space-y-6">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-primary focus:outline-none"
                                        value={contactSettings.displayName}
                                        onChange={(e) => setContactSettings({ ...contactSettings, displayName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Public Contact Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-primary focus:outline-none"
                                        value={contactSettings.publicEmail}
                                        onChange={(e) => setContactSettings({ ...contactSettings, publicEmail: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This email will be visible if you enable public messaging.</p>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="acceptMessages"
                                        className="w-4 h-4 accent-primary"
                                        checked={contactSettings.acceptMessages}
                                        onChange={(e) => setContactSettings({ ...contactSettings, acceptMessages: e.target.checked })}
                                    />
                                    <label htmlFor="acceptMessages" className="text-sm text-gray-300">Accept direct messages from users regarding your content.</label>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <Button type="submit" variant="primary">Save Settings</Button>
                                </div>
                            </form>
                        </div>
                    )
                }



                {
                    activeTab === 'stats' && (
                        <div className="max-w-4xl mx-auto text-center py-20">
                            <div className="inline-block p-6 rounded-full bg-white/5 mb-6">
                                <BarChart3 className="w-16 h-16 text-gray-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-400">Detailed Analytics Coming Soon</h2>
                            <p className="text-gray-500 mt-2">The engineering team is calibrating the data visualizers.</p>
                        </div>
                    )
                }
            </div >


            {/* Delete Confirmation Modal */}
            < ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Content?"
                message="Are you sure you want to permanently delete this content stream? This action cannot be undone and will remove it from all user grids immediately."
                confirmLabel="Delete Permanently"
                isDangerous
            />
        </div >
    );
};