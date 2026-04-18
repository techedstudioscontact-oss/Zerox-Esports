import React, { useState, useEffect, useMemo } from 'react';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    updateDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { runSystemScan, fixUserIssues, fixContentIssues, ScanResult } from '../services/diagnosticsService';
import { db, auth } from '../firebase';
import { User, Tournament, Role, AdCampaign } from '../types';
import { SystemSettings, updateSystemSettings } from '../services/systemService';
import { subscribeToRequests, deleteRequest, ContentRequest } from '../services/requestService';
import { createAd, getAllAds, updateAd, deleteAd } from '../services/adService';
import { updateContentInDb } from '../services/contentService';
import { updateUserInDb, getAllUsers } from '../services/authService';
import {
    LayoutDashboard, Users, UserCheck, Shield, Crown, UserX, Trash2, Coins,
    Upload, FileText, CheckCircle, X, Search, Bell, Monitor, RefreshCw, BarChart3,
    Activity, Lock, ShieldCheck, Database, DollarSign, Settings, Globe, Save, Wallet, Pin, MessageSquare, Ban, Zap, Bug, Check, ArrowDownToLine, ArrowUpFromLine, Download
} from 'lucide-react';
import { RevenuePool } from '../types';
import { BugReport } from '../types';
import { subscribeToBugReports, resolveBugReport } from '../services/bugReportService';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '../components/Button';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface MasterAdminDashboardProps {
    user: User;
    allUsers: User[];
    allContent: Tournament[];
    systemSettings: SystemSettings;
    onDeleteContent: (id: string) => Promise<void>;
    onUpdateUserRole: (uid: string, newRole: Role) => Promise<void>;
    onUpdateUserPaymentStatus: (uid: string, isPaid: boolean) => Promise<void>;
}

type Tab = 'overview' | 'content' | 'users' | 'settings' | 'payouts' | 'requests' | 'ads' | 'analytics' | 'notifications' | 'diagnostics' | 'bugs' | 'commissions';

interface CreditRequest {
    id: string;
    userId: string;
    userEmail: string;
    amount: number;
    requestedBy: string;
    requestedByName: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: number;
}

import { ViewBugModal } from '../components/ViewBugModal';

export const MasterAdminDashboard: React.FC<MasterAdminDashboardProps> = ({
    user,
    allUsers = [],
    allContent = [],
    systemSettings,
    onDeleteContent,
    onUpdateUserRole,
    onUpdateUserPaymentStatus
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Local state for settings form
    const [commissionRate, setCommissionRate] = useState(systemSettings?.commissionRate || 15);
    const [locked, setLocked] = useState(systemSettings?.isLocked || false);
    const [broadcastMsg, setBroadcastMsg] = useState(systemSettings?.broadcastMessage || "");

    // Wallet Credit Approval State
    const [pendingCredits, setPendingCredits] = useState<CreditRequest[]>([]);

    // Component Initialization and Subscriptions
    const [osAppId, setOsAppId] = useState(systemSettings?.oneSignalAppId || "");
    const [osApiKey, setOsApiKey] = useState(systemSettings?.oneSignalApiKey || "");
    const [aboutText, setAboutText] = useState(systemSettings?.aboutText || "");
    const [socialLinks, setSocialLinks] = useState(systemSettings?.socialLinks || {});
    const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(systemSettings?.privacyPolicyUrl || "");
    const [termsUrl, setTermsUrl] = useState(systemSettings?.termsUrl || "");
    const [walletInfoUrl, setWalletInfoUrl] = useState(systemSettings?.walletInfoUrl || "");
    const [walletInstructions, setWalletInstructions] = useState(systemSettings?.walletInstructions || "");

    // APK & Version Management State
    const [mainAppVersion, setMainAppVersion] = useState(systemSettings?.mainAppVersion || "");
    const [mainAppUrl, setMainAppUrl] = useState(systemSettings?.mainAppUrl || "");
    const [antiCheatVersion, setAntiCheatVersion] = useState(systemSettings?.antiCheatVersion || "");
    const [antiCheatUrl, setAntiCheatUrl] = useState(systemSettings?.antiCheatUrl || "");
    const [bgVideoUrl, setBgVideoUrl] = useState(systemSettings?.bgVideoUrl || "");
    const [bgImageUrl, setBgImageUrl] = useState(systemSettings?.bgImageUrl || "");
    const [cloudinaryCloudName, setCloudinaryCloudName] = useState("");
    const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState("");
    const [uploadingFile, setUploadingFile] = useState<'main' | 'anticheat' | 'bgVideo' | 'bgImage' | null>(null);

    const [saving, setSaving] = useState(false);

    // Additional State
    const [stats, setStats] = useState<any>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [roleChangeData, setRoleChangeData] = useState<{ uid: string, email: string, currentRole: string, newRole: Role } | null>(null);

    // Centralized confirmation modal state (replaces all native confirm() dialogs)
    const [pendingAction, setPendingAction] = useState<{
        title: string;
        message: React.ReactNode;
        confirmLabel?: string;
        isDangerous?: boolean;
        onConfirm: () => void | Promise<void>;
    } | null>(null);
    const [suspendDays, setSuspendDays] = useState<string>('7');
    const [showSuspendInput, setShowSuspendInput] = useState(false);
    const [suspendTargetUser, setSuspendTargetUser] = useState<User | null>(null);

    // Bugs
    const [bugReports, setBugReports] = useState<BugReport[]>([]);
    const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);

    // Commission Pool State
    const [poolStatus, setPoolStatus] = useState<RevenuePool | null>(null);
    const [distributing, setDistributing] = useState(false);

    useEffect(() => {
        if (activeTab === 'commissions') {
            const loadPool = async () => {
                // Mocking pool status as service relies on paymentService
                const status = { totalRevenue: 0, currentPool: 0, systemRetained: 0, status: 'distributed' };
                setPoolStatus(status);
            };
            loadPool();
        }
        if (activeTab === 'diagnostics' && !scanResult) {
            runSystemScan().then(setScanResult);
        }
    }, [activeTab]);

    const handleDistributePool = async () => {
        if (!poolStatus || poolStatus.status === 'distributed') return;
        setPendingAction({
            title: 'Distribute Commission Pool',
            message: <p>Confirm distribution of <b>₹{poolStatus.adminPool?.toFixed(2)}</b> to all eligible admins? This cannot be undone.</p>,
            confirmLabel: 'Distribute Now',
            isDangerous: false,
            onConfirm: async () => {

            setDistributing(true);
            try {
                toast.success("Commission Pool Distributed Successfully!");
                const poolRes = { totalRevenue: 0, currentPool: 0, systemRetained: 0, status: 'distributed' };
                setPoolStatus(poolRes);
            } catch (error: any) {
                console.error("Distribution failed", error);
                toast.error("Distribution failed: " + error.message);
            } finally {
                setDistributing(false);
            }
        }
        });
    };


    // Sync state when props change
    useEffect(() => {
        if (systemSettings) {
            setLocked(systemSettings.isLocked);
            setBroadcastMsg(systemSettings.broadcastMessage);
            setCommissionRate(systemSettings.commissionRate);
            setOsAppId(systemSettings.oneSignalAppId || "");
            setOsApiKey(systemSettings.oneSignalApiKey || "");
            setAboutText(systemSettings.aboutText || "");
            setSocialLinks(systemSettings.socialLinks || {});
            setPrivacyPolicyUrl(systemSettings.privacyPolicyUrl || "");
            setTermsUrl(systemSettings.termsUrl || "");
            setWalletInfoUrl(systemSettings.walletInfoUrl || "");
            setWalletInstructions(systemSettings.walletInstructions || "");
            setMainAppVersion(systemSettings.mainAppVersion || "");
            setMainAppUrl(systemSettings.mainAppUrl || "");
            setAntiCheatVersion(systemSettings.antiCheatVersion || "");
            setAntiCheatUrl(systemSettings.antiCheatUrl || "");
            setBgVideoUrl(systemSettings.bgVideoUrl || "");
            setBgImageUrl(systemSettings.bgImageUrl || "");
        }
    }, [systemSettings]);

    // Payouts Logic
    const [payouts, setPayouts] = useState<any[]>([]);
    const [loadingPayouts, setLoadingPayouts] = useState(false);
    const [requests, setRequests] = useState<ContentRequest[]>([]);

    // Deposit & Withdrawal Requests
    const [depositRequests, setDepositRequests] = useState<any[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);

    // Ad Manager State
    const [ads, setAds] = useState<AdCampaign[]>([]);
    const [loadingAds, setLoadingAds] = useState(false);
    const [adForm, setAdForm] = useState<Partial<AdCampaign>>({
        title: '',
        videoUrl: '',
        linkUrl: '',
        active: true,
        frequency: 5,
        isSkippable: true,
        skipAfter: 5,
        type: 'preroll'
    });

    // Real mock aggregates based on props
    const paidUsersCount = allUsers.filter(u => u.paidUser).length;
    const paidAdminsCount = allUsers.filter(u => u.paidAdmin).length;
    const totalRevenue = (paidUsersCount * 9) + (paidAdminsCount * 500);
    const totalContent = allContent.length;

    const handleDelete = (id: string) => {
        setPendingAction({
            title: 'Delete Content',
            message: 'WARNING: Permanently delete this tournament/game? This action cannot be undone.',
            confirmLabel: 'Delete Permanently',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await onDeleteContent(id);
                } catch (e) {
                    // Error toast is already shown in App.tsx's handleDeleteContent
                    console.error('Delete failed:', e);
                }
            }
        });
    };

    const handleTogglePin = async (item: Tournament) => {
        try {
            await updateContentInDb(item.id, { isPinned: !item.isPinned });
        } catch (error) {
            console.error("Failed to toggle pin", error);
            alert("Failed to update pin status");
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await updateSystemSettings({
                isLocked: locked,
                broadcastMessage: broadcastMsg,
                commissionRate: commissionRate,
                oneSignalAppId: osAppId,
                oneSignalApiKey: osApiKey,
                aboutText: aboutText,
                socialLinks: socialLinks,
                privacyPolicyUrl: privacyPolicyUrl,
                termsUrl: termsUrl,
                walletInfoUrl: walletInfoUrl,
                walletInstructions: walletInstructions,
                mainAppVersion: mainAppVersion,
                mainAppUrl: mainAppUrl,
                antiCheatVersion: antiCheatVersion,
                antiCheatUrl: antiCheatUrl,
                bgVideoUrl: bgVideoUrl,
                bgImageUrl: bgImageUrl
            });
            alert("System configuration updated successfully.");
        } catch (error) {
            alert("Failed to save settings.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (file: File, type: 'main' | 'anticheat' | 'bgVideo' | 'bgImage') => {
        const isApk = type === 'main' || type === 'anticheat';
        const isVideo = type === 'bgVideo';
        const isImage = type === 'bgImage';

        if (isApk && !file.name.endsWith('.apk')) {
            toast.error("Invalid file type. Please select an .apk file.");
            return;
        }
        if (isVideo && !file.type.startsWith('video/')) {
            toast.error("Invalid file type. Please select a video file (MP4).");
            return;
        }
        if (isImage && !file.type.startsWith('image/')) {
            toast.error("Invalid file type. Please select an image file.");
            return;
        }

        if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
            toast.error("Cloudinary credentials are required to upload files directly.");
            return;
        }

        setUploadingFile(type);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);

        try {
            // Unauthenticated raw upload to Cloudinary (use 'upload' for images/videos for better handling)
            const uploadType = isApk ? 'raw' : 'upload';
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${uploadType}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Cloudinary upload failed.");
            }

            const data = await response.json();
            const secureUrl = data.secure_url;

            if (type === 'main') {
                setMainAppUrl(secureUrl);
                toast.success("Main App APK Uploaded successfully.");
            } else if (type === 'anticheat') {
                setAntiCheatUrl(secureUrl);
                toast.success("Anti-Cheat APK Uploaded successfully.");
            } else if (type === 'bgVideo') {
                setBgVideoUrl(secureUrl);
                toast.success("Background Video Uploaded successfully.");
            } else if (type === 'bgImage') {
                setBgImageUrl(secureUrl);
                toast.success("Background Image Uploaded successfully.");
            }
        } catch (error: any) {
            console.error("Upload Error:", error);
            toast.error(error.message || "Failed to upload file.");
        } finally {
            setUploadingFile(null);
        }
    };

    const initiateRoleChange = (u: User, specificRole?: Role) => {
        // If specific role provided, use it. Else toggle user/admin (legacy behavior if needed)
        const newRole = specificRole || (u.role === 'admin' ? 'user' : 'admin');
        setRoleChangeData({
            uid: u.uid,
            email: u.email,
            currentRole: u.role,
            newRole
        });
    };

    const confirmRoleChange = async () => {
        if (!roleChangeData) return;
        try {
            await onUpdateUserRole(roleChangeData.uid, roleChangeData.newRole);

            // AUTO-FIX: If promoting to Admin, ensure they are marked as PAID ADMIN so they can access the dashboard.
            if (roleChangeData.newRole === 'admin') {
                await onUpdateUserPaymentStatus(roleChangeData.uid, true);
                toast.success("User automatically upgraded to Paid Admin status.");
            }
            setRoleChangeData(null);
        } catch (error) {
            console.error("Role change sequence aborted:", error);
            // Modal stays open for retry
        }
    };

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap
            ${activeTab === id
                    ? 'bg-accent text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transform -translate-y-0.5'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            <Icon size={16} /> {label}
        </button>
    );

    // Bug Reports State


    useEffect(() => {
        if (activeTab === 'payouts') {
            loadPayouts();
        }
        if (activeTab === 'requests') {
            const unsubRequests = subscribeToRequests(setRequests);

            const qCredits = query(collection(db, 'credit_requests'), where('status', '==', 'pending'));
            const unsubCredits = onSnapshot(qCredits, (snap) => {
                const reqs: CreditRequest[] = [];
                snap.forEach(d => reqs.push({ ...d.data() as CreditRequest, id: d.id }));
                reqs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                setPendingCredits(reqs);
            });

            const qDeposits = query(collection(db, 'deposit_requests'), where('status', '==', 'pending'));
            const unsubDeposits = onSnapshot(qDeposits, (snap) => {
                const items: any[] = [];
                snap.forEach(d => items.push({ id: d.id, ...d.data() }));
                items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                setDepositRequests(items);
            });

            const qWithdrawals = query(collection(db, 'withdrawal_requests'), where('status', '==', 'pending'));
            const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
                const items: any[] = [];
                snap.forEach(d => items.push({ id: d.id, ...d.data() }));
                items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                setWithdrawalRequests(items);
            });

            return () => {
                unsubRequests();
                unsubCredits();
                unsubDeposits();
                unsubWithdrawals();
            };
        }
        if (activeTab === 'bugs') {
            const unsubscribe = subscribeToBugReports(setBugReports);
            return () => unsubscribe();
        }
        if (activeTab === 'ads' || activeTab === 'analytics') {
            loadAds();
        }
    }, [activeTab]);

    const loadAds = async () => {
        setLoadingAds(true);
        try {
            const data = await getAllAds();
            setAds(data);
        } catch (error) {
            console.error("Failed to load ads", error);
        } finally {
            setLoadingAds(false);
        }
    };

    const handleCreateAd = async () => {
        if (!adForm.title || !adForm.videoUrl) {
            toast.error("Title and Video URL are required");
            return;
        }

        // Validate numeric fields
        const frequency = typeof adForm.frequency === 'string' ? parseInt(adForm.frequency) : adForm.frequency || 5;
        const skipAfter = typeof adForm.skipAfter === 'string' ? parseInt(adForm.skipAfter) : adForm.skipAfter || 5;

        try {
            await createAd({
                ...adForm,
                frequency,
                skipAfter
            } as any);

            setAdForm({
                title: '', videoUrl: '', linkUrl: '', active: true, frequency: 5, isSkippable: true, skipAfter: 5, type: 'preroll'
            });
            toast.success("Ad Campaign Created Successfully");
            loadAds();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create ad: " + error.message);
        }
    };

    const handleDeleteAd = (id: string) => {
        setPendingAction({
            title: 'Delete Ad Campaign',
            message: 'Are you sure you want to permanently delete this ad campaign? All analytics will be lost.',
            confirmLabel: 'Delete Campaign',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await deleteAd(id);
                    setAds(prev => prev.filter(a => a.id !== id));
                    toast.success('Ad campaign deleted.');
                } catch (error) {
                    toast.error('Failed to delete ad campaign.');
                }
            }
        });
    };

    const confirmSuspend = async () => {
        if (!suspendTargetUser) return;
        const days = parseInt(suspendDays);
        if (isNaN(days) || days <= 0) { toast.error('Invalid duration.'); return; }
        const newSuspendedUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
        try {
            await updateUserInDb({ ...suspendTargetUser, suspendedUntil: newSuspendedUntil });
            toast.success(`User suspended for ${days} days.`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to suspend user.');
        }
        setShowSuspendInput(false);
        setSuspendTargetUser(null);
    };

    const handleSuspendUser = (userToSuspend: User) => {
        if (userToSuspend.suspendedUntil && userToSuspend.suspendedUntil > Date.now()) {
            // Already suspended — confirm UNSUSPEND via modal
            setPendingAction({
                title: 'Unsuspend User',
                message: <p>Are you sure you want to <b>unsuspend</b> <b>{userToSuspend.email}</b>? They will regain immediate access.</p>,
                confirmLabel: 'Unsuspend',
                isDangerous: false,
                onConfirm: async () => {
                    try {
                        await updateUserInDb({ ...userToSuspend, suspendedUntil: null as any });
                        toast.success(`User ${userToSuspend.email} unsuspended.`);
                    } catch (e) {
                        console.error(e);
                        toast.error("Failed to unsuspend user.");
                    }
                }
            });
        } else {
            // Not suspended — show days input modal
            setSuspendTargetUser(userToSuspend);
            setSuspendDays('7');
            setShowSuspendInput(true);
        }
    };

    const loadPayouts = async () => {
        setLoadingPayouts(true);
        try {
            // Get Payout Data (Mocking for now as service relies on payoutService)
            let totalPaidOut = 0;
            const mockPayouts = [
                { id: 'mock1', createdAt: { seconds: Date.now() / 1000 - 86400 }, userEmail: 'admin1@example.com', userId: 'uid1', upiId: 'admin1@upi', amount: 1000, status: 'approved' },
                { id: 'mock2', createdAt: { seconds: Date.now() / 1000 - 172800 }, userEmail: 'admin2@example.com', userId: 'uid2', upiId: 'admin2@upi', amount: 500, status: 'pending' },
            ];
            setPayouts(mockPayouts);
            setStats((prev: any) => ({ ...prev, totalPaidOut }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPayouts(false);
        }
    };

    const handlePayoutAction = async (id: string, action: 'approved' | 'rejected') => {
        // Confirmation handled inline via toast for quick actions
        const ok = await new Promise<boolean>(resolve => {
            setPendingAction({
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Request`,
                message: `Confirm to ${action} this content request?`,
                confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
                isDangerous: action === 'rejected',
                onConfirm: () => resolve(true)
            });
            setTimeout(() => resolve(false), 60000);
        });
        if (!ok) return;
        try {
            // await updatePayoutStatus(id, action); // Removed
            toast.success(`Payout ${action} successfully (mocked).`);
            loadPayouts();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleBroadcastSubmit = async () => {
        try {
            await updateSystemSettings({ broadcastMessage: broadcastMsg });
            toast.success("Broadcast message updated!");
        } catch (e: any) {
            toast.error("Failed to update broadcast: " + e.message);
        }
    };

    const processCreditRequest = async (req: CreditRequest, action: 'approve' | 'reject') => {
        const ok2 = await new Promise<boolean>(resolve => {
            setPendingAction({
                title: `${action === 'approve' ? 'Approve' : 'Reject'} Credit Request`,
                message: <p>Confirm to <b>{action}</b> credit request for <b>{req.amount} Coins</b>?</p>,
                confirmLabel: action === 'approve' ? 'Approve' : 'Reject',
                isDangerous: action === 'reject',
                onConfirm: () => resolve(true)
            });
            setTimeout(() => resolve(false), 60000);
        });
        if (!ok2) return;

        try {
            // Update the request status
            await updateDoc(doc(db, 'credit_requests', req.id), {
                status: action,
                updatedAt: new Date()
            });

            if (action === 'approve') {
                // Find the target user and update their wallet
                const targetUser = allUsers.find(u => u.uid === req.userId);
                if (targetUser) {
                    const currentCoins = targetUser.coins || 0;
                    const newCoins = Math.max(0, currentCoins + req.amount); // Prevent negative balance

                    await updateDoc(doc(db, 'users', req.userId), { coins: newCoins });

                    // Log the transaction
                    const validAmount = Number(req.amount) || 0;
                    await addDoc(collection(db, 'transactions'), {
                        userId: req.userId,
                        amount: validAmount,
                        type: validAmount >= 0 ? 'credit' : 'debit',
                        reason: 'add_money',
                        timestamp: Date.now(),
                        status: 'completed',
                        note: `Processed by ${req.requestedByName}`
                    });

                    toast.success(`Approved! Added ${req.amount} Coins to ${req.userEmail}`);
                } else {
                    toast.error(`Approved request, but user ${req.userEmail} was not found in active records.`);
                }
            } else {
                toast.success("Request Rejected");
            }

            // Remove from local pending list
            setPendingCredits(prev => prev.filter(r => r.id !== req.id));

        } catch (err: any) {
            console.error(err);
            toast.error("Failed to process request: " + err.message);
        }
    };

    // ── Deposit request handler ──────────────────────────────────
    const processDepositRequest = async (req: any, action: 'approve' | 'reject') => {
        const ok3 = await new Promise<boolean>(resolve => {
            setPendingAction({
                title: `${action === 'approve' ? 'Approve' : 'Reject'} Deposit`,
                message: <p>Confirm to <b>{action}</b> deposit of <b>{req.coins} coins (₹{req.amount})</b> for <b>{req.userEmail}</b>?</p>,
                confirmLabel: action === 'approve' ? 'Approve' : 'Reject',
                isDangerous: action === 'reject',
                onConfirm: () => resolve(true)
            });
            setTimeout(() => resolve(false), 60000);
        });
        if (!ok3) return;
        try {
            await updateDoc(doc(db, 'deposit_requests', req.id), { status: action, processedAt: new Date(), processedBy: user.uid });

            if (action === 'approve') {
                // Credit the user's coins
                const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', req.userId)));
                if (!userSnap.empty) {
                    const uRef = userSnap.docs[0].ref;
                    const currentCoins = (userSnap.docs[0].data().coins || 0);
                    await updateDoc(uRef, { coins: currentCoins + req.coins });
                } else {
                    await updateDoc(doc(db, 'users', req.userId), { coins: req.coins });
                }
                // Log transaction
                const validAmount = Number(req.coins) || Number(req.amount) || 0;
                await addDoc(collection(db, 'transactions'), {
                    userId: req.userId, amount: validAmount, type: 'credit',
                    reason: 'add_money', timestamp: Date.now(), status: 'completed',
                    note: `UPI deposit approved. TX: ${req.utr}`
                });
                toast.success(`✅ Approved! ${req.coins} coins credited to ${req.userEmail}`);
            } else {
                toast.success('Deposit request rejected.');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Failed: ' + err.message);
        }
    };

    // ── Withdrawal request handler ───────────────────────────────
    const processWithdrawalRequest = async (req: any, action: 'approve' | 'reject') => {
        const ok4 = await new Promise<boolean>(resolve => {
            setPendingAction({
                title: `${action === 'approve' ? 'Approve' : 'Reject'} Withdrawal`,
                message: <p>Confirm to <b>{action}</b> withdrawal of <b>{req.coins} coins</b> for <b>{req.userEmail}</b> → UPI: <b>{req.upiId}</b>?</p>,
                confirmLabel: action === 'approve' ? 'Approve' : 'Reject',
                isDangerous: action === 'reject',
                onConfirm: () => resolve(true)
            });
            setTimeout(() => resolve(false), 60000);
        });
        if (!ok4) return;
        try {
            await updateDoc(doc(db, 'withdrawal_requests', req.id), { status: action, processedAt: new Date(), processedBy: user.uid });

            if (action === 'approve') {
                // Deduct coins from user
                const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', req.userId)));
                if (!userSnap.empty) {
                    const uRef = userSnap.docs[0].ref;
                    const currentCoins = (userSnap.docs[0].data().coins || 0);
                    const newCoins = Math.max(0, currentCoins - req.coins);
                    await updateDoc(uRef, { coins: newCoins });
                } else {
                    await updateDoc(doc(db, 'users', req.userId), { coins: 0 });
                }
                // Log transaction
                await addDoc(collection(db, 'transactions'), {
                    userId: req.userId, amount: req.coins, type: 'debit',
                    reason: 'withdraw', timestamp: Date.now(), status: 'completed',
                    note: `Withdrawal approved to UPI: ${req.upiId}`
                });
                toast.success(`✅ Approved! ${req.coins} coins deducted. Transfer to ${req.upiId}`);
            } else {
                toast.success('Withdrawal rejected. Coins returned to user.');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Failed: ' + err.message);
        }
    };

    // Calculate Analytics
    const analyticsData = useMemo(() => {
        const dailyMap: { [date: string]: { views: number; clicks: number } } = {};

        if (!ads || !Array.isArray(ads)) return [];
        ads.forEach(ad => {
            if (ad?.dailyStats) {
                Object.entries(ad.dailyStats).forEach(([date, stats]) => {
                    const s = stats as { views: number; clicks: number };
                    if (!dailyMap[date]) dailyMap[date] = { views: 0, clicks: 0 };
                    dailyMap[date].views += (s.views || 0);
                    dailyMap[date].clicks += (s.clicks || 0);
                });
            }
        });

        return Object.entries(dailyMap)
            .map(([date, stats]) => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                fullDate: date,
                views: stats.views,
                clicks: stats.clicks
            }))
            .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
            .slice(-14); // Last 14 days
    }, [ads]);

    // PayoutsManager component removed

    if (user.role !== 'superadmin' && user.role !== 'masteradmin' && user.role !== 'manager') {
        return <div className="p-20 text-red-500 font-bold text-center font-mono">ACCESS DENIED. INCIDENT REPORTED.</div>;
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-black/90">
            <div className="container mx-auto">
                {/* Header */}
                <div className="mb-10 border-b border-accent/30 pb-6 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-accent/20 rounded border border-accent/50">
                                <Crown className="text-accent h-8 w-8 animate-pulse-slow" />
                            </div>
                            <h1 className="text-5xl font-cinematic font-black text-white uppercase tracking-tighter text-glow">Master Control</h1>
                        </div>
                        <p className="text-accent/80 font-mono text-sm tracking-[0.2em] pl-1">SYSTEM ROOT ACCESS // <span className="text-white">AUTHORIZED</span></p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-gray-500 font-mono text-xs">SERVER TIME</p>
                        <p className="text-white font-mono text-lg">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
                    <TabButton id="overview" label="Overview" icon={Activity} />
                    <TabButton id="content" label="Manage Content" icon={Database} />
                    <TabButton id="users" label="Manage Users" icon={Users} />
                    <TabButton id="payouts" label="Payouts" icon={Wallet} />
                    <TabButton id="requests" label="Requests" icon={MessageSquare} />
                    <TabButton id="ads" label="Ad Manager" icon={Zap} />
                    <TabButton id="analytics" label="Ad Analytics" icon={BarChart3} />
                    <TabButton id="settings" label="Platform Settings" icon={Settings} />
                    <TabButton id="notifications" label="Notifications" icon={Bell} />
                    <TabButton id="diagnostics" label="System Health" icon={Shield} />
                    <TabButton id="bugs" label="Bug Reports" icon={Bug} />
                    <TabButton id="commissions" label="Commissions" icon={Coins} />
                </div>

                <div className="animate-fade-in">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <DollarSign size={80} className="text-green-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/50"></div>
                                <h3 className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Total Revenue</h3>
                                <p className="text-4xl font-display font-bold text-white">₹{totalRevenue.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-500 mt-2 font-mono">REAL-TIME AGGREGATION</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Users size={80} className="text-blue-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/50"></div>
                                <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">User Base</h3>
                                <p className="text-4xl font-display font-bold text-white">{allUsers.length}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">{paidAdminsCount} Admins</span>
                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 rounded">{paidUsersCount} Premium</span>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Database size={80} className="text-purple-500" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500/50"></div>
                                <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Content Index</h3>
                                <p className="text-4xl font-display font-bold text-white">{totalContent}</p>
                                <p className="text-[10px] text-gray-500 mt-2 font-mono">FILES ENCRYPTED</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:rotate-90 transition-transform duration-700">
                                    <Settings size={80} className="text-accent" />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-accent/50"></div>
                                <h3 className="text-accent text-xs font-bold uppercase tracking-widest mb-2 font-mono">System Status</h3>
                                <p className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                    <span className={`w-3 h-3 ${locked ? 'bg-red-500' : 'bg-green-500'} rounded-full animate-pulse`}></span>
                                    {locked ? 'LOCKED' : 'OPTIMAL'}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-2 font-mono">LATENCY: 12ms</p>
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
                                <div className="text-[10px] font-mono text-gray-500">{allContent.length} ENTRIES</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">Thumbnail</th>
                                            <th className="p-4">Details</th>
                                            <th className="p-4">Author</th>
                                            <th className="p-4">Stats</th>
                                            <th className="p-4 text-center">Pin</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {allContent.map(item => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
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
                                                    {item.uploadedBy === 'system' ?
                                                        <span className="text-accent text-xs font-bold border border-accent/20 px-2 py-1 rounded">SYSTEM</span> :
                                                        <span className="font-mono text-xs">{item.uploadedBy.substring(0, 8)}...</span>
                                                    }
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                                        {item.isPremium ? 'Premium' : 'Free'}
                                                    </span>
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
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* USER MANAGEMENT TAB */}
                    {activeTab === 'users' && (
                        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] animate-fade-in">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                    <Lock size={18} /> User Database
                                </h3>
                                <div className="text-[10px] font-mono text-gray-500">{allUsers.length} NODES</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">User Identity</th>
                                            <th className="p-4">Current Role</th>
                                            <th className="p-4">Financial Status</th>
                                            <th className="p-4 text-right">Role Management</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {allUsers.map(u => (
                                            <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-white">{u.email}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{u.uid}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${u.role === 'superadmin' ? 'border-accent/30 text-accent' : u.role === 'admin' ? 'border-purple-500/30 text-purple-400' : 'border-gray-700 text-gray-500'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-mono text-xs">
                                                    {u.paidUser && <span className="text-green-500 mr-2">PAID_USER</span>}
                                                    {u.paidAdmin && <span className="text-purple-500">PAID_ADMIN</span>}
                                                    {!u.paidUser && !u.paidAdmin && <span className="text-gray-600">FREE_TIER</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {u.role !== 'superadmin' && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // Cycle Roles: User -> Admin -> Manager -> Master Admin -> User
                                                                    const nextRole: Role = u.role === 'user' ? 'admin'
                                                                        : u.role === 'admin' ? 'manager'
                                                                            : u.role === 'manager' ? 'masteradmin'
                                                                                : 'user';
                                                                    initiateRoleChange(u, nextRole);
                                                                }}
                                                                className="min-w-[120px]"
                                                            >
                                                                {u.role === 'user' && <><UserCheck size={12} className="mr-2" /> Make Admin</>}
                                                                {u.role === 'admin' && <><Crown size={12} className="mr-2" /> Make Manager</>}
                                                                {u.role === 'manager' && <><ShieldCheck size={12} className="mr-2" /> Make Master</>}
                                                                {u.role === 'masteradmin' && <><UserX size={12} className="mr-2" /> Revoke Rights</>}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSuspendUser(u)}
                                                                className={`min-w-[100px] ml-2 ${u.suspendedUntil && u.suspendedUntil > Date.now() ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-500'}`}
                                                            >
                                                                <Ban size={12} className="mr-2" />
                                                                {u.suspendedUntil && u.suspendedUntil > Date.now() ? 'Unsuspend' : 'Suspend'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setPendingAction({
                                                                        title: u.paidUser ? 'Remove Premium' : 'Grant Premium',
                                                                        message: <p>{u.paidUser ? 'Revoke' : 'Grant'} premium status for <b>{u.email}</b>?</p>,
                                                                        confirmLabel: u.paidUser ? 'Revoke Premium' : 'Make Premium',
                                                                        isDangerous: u.paidUser,
                                                                        onConfirm: async () => {
                                                                            await onUpdateUserPaymentStatus(u.uid, !u.paidUser);
                                                                        }
                                                                    });
                                                                }}
                                                                className={`min-w-[120px] ml-2 ${u.paidUser ? 'border-green-500/30 text-green-500' : 'border-gray-600 text-gray-500'}`}
                                                            >
                                                                {u.paidUser ? <><Shield size={12} className="mr-2" /> Paid Active</> : <><DollarSign size={12} className="mr-2" /> Make Paid</>}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PLATFORM SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-red-500/30">
                            {/* DEBUG BANNER */}
                            <div className="bg-yellow-900/30 border-b border-yellow-500/20 px-4 py-1 text-[10px] font-mono text-yellow-500 text-center">
                                DEBUG MODE: {user.email} | Role: {user.role} | UID: {user.uid}
                            </div>

                            {/* Header */}
                            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 p-8">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Settings className="text-accent" /> Platform Configuration
                                </h3>

                                <div className="space-y-8">
                                    {/* Commission Settings */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5">
                                        <h4 className="text-lg font-bold text-white mb-2">Admin Commission Rate</h4>
                                        <p className="text-sm text-gray-400 mb-4">Percentage of earnings distributed to Normal Admins for user unlocks.</p>

                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0"
                                                max="50"
                                                value={commissionRate}
                                                onChange={(e) => setCommissionRate(parseInt(e.target.value))}
                                                className="w-full accent-accent h-2 bg-black rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-2xl font-mono font-bold text-accent w-16 text-right">{commissionRate}%</span>
                                        </div>
                                    </div>

                                    {/* Maintenance Mode */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                                System Lockdown {locked && <span className="text-xs bg-red-500 px-2 rounded-full text-white animate-pulse">ACTIVE</span>}
                                            </h4>
                                            <p className="text-sm text-gray-400">Emergency switch to disable all streams and logins.</p>
                                        </div>
                                        <button
                                            onClick={() => setLocked(!locked)}
                                            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors focus:outline-none ${locked ? 'bg-red-500' : 'bg-gray-700'}`}
                                        >
                                            <span className="sr-only">Toggle Lockdown</span>
                                            <span className={`${locked ? 'translate-x-7' : 'translate-x-1'} inline-block w-6 h-6 transform bg-white rounded-full transition-transform`} />
                                        </button>
                                    </div>

                                    {/* Global Notification */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5">
                                        <h4 className="text-lg font-bold text-white mb-2">Global System Broadcast</h4>
                                        <textarea
                                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-accent focus:outline-none mb-3"
                                            rows={3}
                                            placeholder="Enter message to display on all user screens..."
                                            value={broadcastMsg}
                                            onChange={(e) => setBroadcastMsg(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <Button variant="outline" size="sm" onClick={() => setBroadcastMsg("")}>Clear</Button>
                                        </div>
                                    </div>

                                    {/* OneSignal Configuration */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Bell className="text-accent" size={20} /> OneSignal Push Settings
                                        </h4>

                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 mb-1">OneSignal App ID</label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-accent focus:outline-none placeholder-gray-600 font-mono text-xs"
                                                placeholder="e.g. c029ccad-..."
                                                value={osAppId}
                                                onChange={(e) => setOsAppId(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 mb-1">REST API Key</label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-accent focus:outline-none placeholder-gray-600 font-mono text-xs"
                                                placeholder="e.g. os_v2_app_..."
                                                value={osApiKey}
                                                onChange={(e) => setOsApiKey(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Wallet Configuration */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Wallet className="text-yellow-400" size={20} /> Wallet Instructions (Play Store Compliance)
                                        </h4>
                                        <p className="text-xs text-gray-400">Set the image URL (QR code or graphic) and textual instructions explaining how to add or withdraw coins outside the app.</p>

                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 mb-1">Instructional Image URL (e.g. UPI QR)</label>
                                            <input
                                                type="url"
                                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none placeholder-gray-600 font-mono text-xs"
                                                placeholder="https://..."
                                                value={walletInfoUrl}
                                                onChange={(e) => setWalletInfoUrl(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 mb-1">Coin Operations Instructions</label>
                                            <textarea
                                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none placeholder-gray-600 text-sm"
                                                rows={4}
                                                placeholder="Explain how users can deposit or withdraw..."
                                                value={walletInstructions}
                                                onChange={(e) => setWalletInstructions(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Globe className="text-primary" size={20} /> App Identity & Socials
                                        </h4>

                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 mb-1">About Text (Sidebar)</label>
                                            <textarea
                                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-primary focus:outline-none placeholder-gray-600 text-sm"
                                                rows={3}
                                                placeholder="Describe your app..."
                                                value={aboutText}
                                                onChange={(e) => setAboutText(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['facebook', 'twitter', 'instagram', 'discord', 'telegram', 'website'].map((platform) => (
                                                <div key={platform}>
                                                    <label className="block text-xs uppercase text-gray-500 mb-1 capitalize">{platform}</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-primary focus:outline-none placeholder-gray-600 text-xs"
                                                        placeholder={`https://${platform}.com/...`}
                                                        value={socialLinks[platform as keyof typeof socialLinks] || ''}
                                                        onChange={(e) => setSocialLinks({ ...socialLinks, [platform]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Privacy Policy URL</label>
                                                <input
                                                    type="url"
                                                    value={privacyPolicyUrl}
                                                    onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-primary focus:outline-none"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Terms of Service URL</label>
                                                <input
                                                    type="url"
                                                    value={termsUrl}
                                                    onChange={(e) => setTermsUrl(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-primary focus:outline-none"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Updates & Anti-Cheat */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Download className="text-green-400" size={20} /> App Updates & Anti-Cheat
                                        </h4>
                                        <p className="text-xs text-gray-400">Manage Forced Updates and distribute the Anti-Cheat App. Uploading APKs requires Cloudinary credentials.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Cloudinary Cloud Name</label>
                                                <input
                                                    type="text"
                                                    value={cloudinaryCloudName}
                                                    onChange={(e) => setCloudinaryCloudName(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none placeholder-gray-600"
                                                    placeholder="Required for Uploading"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Cloudinary Upload Preset (Unsigned)</label>
                                                <input
                                                    type="text"
                                                    value={cloudinaryUploadPreset}
                                                    onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none placeholder-gray-600"
                                                    placeholder="Required for Uploading"
                                                />
                                            </div>
                                        </div>

                                        {/* Main App Versioning */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Main App Required Version</label>
                                                <input
                                                    type="text"
                                                    value={mainAppVersion}
                                                    onChange={(e) => setMainAppVersion(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none"
                                                    placeholder="e.g. 1.0.0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Main App APK URL</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={mainAppUrl}
                                                        onChange={(e) => setMainAppUrl(e.target.value)}
                                                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none"
                                                        placeholder="https://..."
                                                    />
                                                    <label className={`shrink-0 cursor-pointer flex items-center justify-center px-4 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold ${uploadingFile === 'main' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {uploadingFile === 'main' ? <RefreshCw size={14} className="animate-spin" /> : 'UPLOAD'}
                                                        <input
                                                            type="file"
                                                            accept=".apk"
                                                            className="hidden"
                                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'main')}
                                                            disabled={uploadingFile === 'main'}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Anti-Cheat Versioning */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Anti-Cheat Required Version</label>
                                                <input
                                                    type="text"
                                                    value={antiCheatVersion}
                                                    onChange={(e) => setAntiCheatVersion(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none"
                                                    placeholder="e.g. 1.0.0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Anti-Cheat APK URL</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={antiCheatUrl}
                                                        onChange={(e) => setAntiCheatUrl(e.target.value)}
                                                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-green-400 focus:outline-none"
                                                        placeholder="https://..."
                                                    />
                                                    <label className={`shrink-0 cursor-pointer flex items-center justify-center px-4 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold ${uploadingFile === 'anticheat' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {uploadingFile === 'anticheat' ? <RefreshCw size={14} className="animate-spin" /> : 'UPLOAD'}
                                                        <input
                                                            type="file"
                                                            accept=".apk"
                                                            className="hidden"
                                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'anticheat')}
                                                            disabled={uploadingFile === 'anticheat'}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Backgrounds Configuration */}
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Monitor className="text-blue-400" size={20} /> App Backgrounds
                                        </h4>
                                        <p className="text-xs text-gray-400">Set the global video and image backgrounds. Video will play if 'Live Animation' is enabled by the user.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Global Background Video (MP4)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={bgVideoUrl}
                                                        onChange={(e) => setBgVideoUrl(e.target.value)}
                                                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-blue-400 focus:outline-none placeholder-gray-600"
                                                        placeholder="Cloudinary MP4 URL"
                                                    />
                                                    <label className={`shrink-0 cursor-pointer flex items-center justify-center px-4 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold ${uploadingFile === 'bgVideo' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {uploadingFile === 'bgVideo' ? <RefreshCw size={14} className="animate-spin" /> : 'UPLOAD'}
                                                        <input
                                                            type="file"
                                                            accept="video/mp4"
                                                            className="hidden"
                                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bgVideo')}
                                                            disabled={uploadingFile === 'bgVideo'}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Global Background Image (Static)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={bgImageUrl}
                                                        onChange={(e) => setBgImageUrl(e.target.value)}
                                                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded p-2 text-white text-xs focus:border-blue-400 focus:outline-none placeholder-gray-600"
                                                        placeholder="Cloudinary Image URL"
                                                    />
                                                    <label className={`shrink-0 cursor-pointer flex items-center justify-center px-4 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold ${uploadingFile === 'bgImage' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {uploadingFile === 'bgImage' ? <RefreshCw size={14} className="animate-spin" /> : 'UPLOAD'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bgImage')}
                                                            disabled={uploadingFile === 'bgImage'}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-white/10">
                                        <Button
                                            variant="primary"
                                            onClick={handleSaveSettings}
                                            isLoading={saving}
                                            className="w-full md:w-auto"
                                        >
                                            <Save size={18} className="mr-2" />
                                            Save Configuration
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PAYOUTS TAB */}
                {activeTab === 'payouts' && (
                    <div className="text-white p-8 text-center italic opacity-50">Payouts module is currently unavailable.</div>
                )}

                {/* REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] animate-fade-in">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                <MessageSquare size={18} /> User Requests
                            </h3>
                            <div className="text-[10px] font-mono text-gray-500">{requests.length} PENDING</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                    <tr>
                                        <th className="p-4">Requested Content</th>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                    {requests.map(req => (
                                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{req.title}</div>
                                                {req.note && <div className="text-xs text-gray-500 mt-1 italic">"{req.note}"</div>}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-gray-300">{req.userName}</div>
                                                <div className="text-xs text-gray-600 font-mono">{req.userId.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-500">
                                                {req.createdAt ? new Date((req.createdAt as any).seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPendingAction({
                                                            title: 'Delete Request',
                                                            message: 'Permanently delete this content request?',
                                                            confirmLabel: 'Delete',
                                                            isDangerous: true,
                                                            onConfirm: async () => {
                                                                try {
                                                                    await deleteRequest(req.id);
                                                                    setRequests(prev => prev.filter(r => r.id !== req.id));
                                                                    toast.success('Request Deleted');
                                                                } catch (e: any) {
                                                                    console.error(e);
                                                                    toast.error('Failed to delete: ' + e.message);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                                No pending requests.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] animate-fade-in mt-6">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                <Coins size={18} className="text-yellow-400" /> Pending Wallet Credits
                            </h3>
                            <div className="text-[10px] font-mono text-gray-500">{pendingCredits.length} PENDING</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                    <tr>
                                        <th className="p-4">Target User</th>
                                        <th className="p-4">Requested By</th>
                                        <th className="p-4 text-center">Amount</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {pendingCredits.map(req => (
                                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{req.userEmail}</div>
                                                <div className="text-xs text-gray-600 font-mono">{req.userId.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-gray-300">{req.requestedByName}</div>
                                                <div className="text-[10px] text-gray-500 font-mono bg-white/5 px-1 inline-block rounded">Admin</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-bold font-mono px-2 py-1 rounded text-xs ${req.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {req.amount > 0 ? '+' : ''}{req.amount} Coins
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => processCreditRequest(req, 'approve')}>
                                                    <Check size={14} /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => processCreditRequest(req, 'reject')}>
                                                    <X size={14} /> Reject
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingCredits.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                                No wallet top-up requests pending.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── DEPOSIT REQUESTS ─────────────────────────────────── */}
                {activeTab === 'requests' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden animate-fade-in mt-6">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                <ArrowDownToLine size={18} className="text-green-400" /> Deposit Requests (UPI)
                            </h3>
                            <div className="text-[10px] font-mono text-gray-500">{depositRequests.length} PENDING</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Package</th>
                                        <th className="p-4">UTR / REF NO</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {depositRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{req.userEmail}</div>
                                                <div className="text-[10px] text-gray-600 font-mono">{req.userId?.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-yellow-400">🪙 {req.coins} Coins</span>
                                                <div className="text-xs text-gray-400">₹{req.amount}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-xs text-gray-300 bg-white/5 px-2 py-1 rounded">{req.utr}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => processDepositRequest(req, 'approve')}>
                                                        <Check size={14} /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => processDepositRequest(req, 'reject')}>
                                                        <X size={14} /> Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {depositRequests.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">No pending deposit requests.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── WITHDRAWAL REQUESTS ──────────────────────────────── */}
                {activeTab === 'requests' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden animate-fade-in mt-6">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                <ArrowUpFromLine size={18} className="text-red-400" /> Withdrawal Requests
                            </h3>
                            <div className="text-[10px] font-mono text-gray-500">{withdrawalRequests.length} PENDING</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Coins</th>
                                        <th className="p-4">UPI Details</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {withdrawalRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{req.userEmail}</div>
                                                <div className="text-[10px] text-gray-600 font-mono">{req.userId?.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold font-mono text-red-400">🪙 {req.coins}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-white font-mono text-xs">{req.upiId}</div>
                                                <div className="text-gray-400 text-xs">{req.upiName}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => processWithdrawalRequest(req, 'approve')}>
                                                        <Check size={14} /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => processWithdrawalRequest(req, 'reject')}>
                                                        <X size={14} /> Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {withdrawalRequests.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">No pending withdrawal requests.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ADS MANAGER TAB */}
                {activeTab === 'ads' && (
                    <div className="animate-fade-in space-y-8">
                        {/* New Ad Form */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Zap className="text-yellow-400" /> Create Ad Campaign
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Campaign Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none"
                                        placeholder="e.g. Summer Nike Promo"
                                        value={adForm.title}
                                        onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Video URL (Drive / Direct)</label>
                                    <input
                                        type="url"
                                        className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none"
                                        placeholder="https://..."
                                        value={adForm.videoUrl}
                                        onChange={e => setAdForm({ ...adForm, videoUrl: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Learn More Link (Optional)</label>
                                    <input
                                        type="url"
                                        className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none"
                                        placeholder="https://brand.com"
                                        value={adForm.linkUrl}
                                        onChange={e => setAdForm({ ...adForm, linkUrl: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-1">Priority (1-10)</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none"
                                            value={adForm.frequency}
                                            onChange={e => setAdForm({ ...adForm, frequency: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-1">Skip After (Sec)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-yellow-400 focus:outline-none"
                                            value={adForm.skipAfter}
                                            disabled={!adForm.isSkippable}
                                            onChange={e => setAdForm({ ...adForm, skipAfter: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 flex items-center gap-8 pt-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${adForm.active ? 'bg-green-500' : 'bg-gray-700'}`}
                                            onClick={() => setAdForm({ ...adForm, active: !adForm.active })}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${adForm.active ? 'translate-x-6' : ''}`} />
                                        </div>
                                        <span className="text-gray-300">Active Immediately</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${adForm.isSkippable ? 'bg-blue-500' : 'bg-gray-700'}`}
                                            onClick={() => setAdForm({ ...adForm, isSkippable: !adForm.isSkippable })}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${adForm.isSkippable ? 'translate-x-6' : ''}`} />
                                        </div>
                                        <span className="text-gray-300">Skippable</span>
                                    </label>
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <Button variant="primary" onClick={handleCreateAd} className="w-full md:w-auto">
                                        <Zap className="mr-2 h-4 w-4" /> Launch Campaign
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Existing Ads List */}
                        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                    <Activity size={18} /> Active Campaigns
                                </h3>
                                <div className="text-[10px] font-mono text-gray-500">{ads.length} CAMPAIGNS</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Campaign</th>
                                            <th className="p-4">Config</th>
                                            <th className="p-4">Link</th>
                                            <th className="p-4">Views</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {ads.map(ad => (
                                            <tr key={ad.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <button
                                                        onClick={async () => {
                                                            await updateAd(ad.id, { active: !ad.active });
                                                            setAds(prev => prev.map(a => a.id === ad.id ? { ...a, active: !ad.active } : a));
                                                        }}
                                                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border w-20 text-center
                                                        ${ad.active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                                                    >
                                                        {ad.active ? 'LIVE' : 'PAUSED'}
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{ad.title}</div>
                                                    <div className="text-xs text-gray-500 font-mono">ID: {ad.id.substring(0, 6)}...</div>
                                                </td>
                                                <td className="p-4 text-xs">
                                                    <div className="flex gap-2">
                                                        <span className="bg-white/10 px-1 rounded">Priority: {ad.frequency}</span>
                                                        <span className={`px-1 rounded ${ad.isSkippable ? 'text-blue-400 bg-blue-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                            {ad.isSkippable ? `Skip: ${ad.skipAfter}s` : 'Unskippable'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 max-w-[150px] truncate text-xs text-blue-400 underline cursor-pointer" onClick={() => window.open(ad.videoUrl, '_blank')}>
                                                    {ad.videoUrl}
                                                </td>
                                                <td className="p-4 font-mono text-gray-400">
                                                    {ad.views || 0}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteAd(ad.id)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {ads.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500 italic">No active ad campaigns.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Bell className="text-purple-400" /> Compose Notification
                            </h3>

                            <div className="grid grid-cols-1 gap-4 mb-4">
                                {/* Notification Name */}
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Notification Name (Optional - Internal)</label>
                                    <input
                                        type="text"
                                        id="notif-name"
                                        placeholder="Enter notification name"
                                        className="bg-black/50 border border-white/10 rounded-lg p-3 w-full text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Notification Title (Optional)</label>
                                    <input
                                        type="text"
                                        id="notif-title"
                                        placeholder="Enter optional title"
                                        className="bg-black/50 border border-white/10 rounded-lg p-3 w-full text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {/* Text (Body) */}
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Notification Text</label>
                                    <textarea
                                        id="notif-body"
                                        placeholder="Enter notification text"
                                        className="bg-black/50 border border-white/10 rounded-lg p-3 w-full h-24 text-white focus:border-purple-500 focus:outline-none"
                                    ></textarea>
                                </div>

                                {/* Image */}
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Notification Image (Optional)</label>
                                    <input
                                        type="url"
                                        id="notif-image"
                                        placeholder="Example: https://yourapp.com/image.png"
                                        className="bg-black/50 border border-white/10 rounded-lg p-3 w-full text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {/* Target (Hidden/Default All for now as per simple request, or keep it?) 
                                    I will keep the logic internally defaulting to 'all' or add a small dropdown if space permits, 
                                    but user didn't ask for it. I'll add a discreet one at the bottom.
                                */}
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Target Audience</label>
                                    <select className="bg-black/50 border border-white/10 rounded-lg p-3 w-full text-white focus:border-purple-500 focus:outline-none" id="notif-target">
                                        <option value="all">All Users</option>
                                        <option value="free">Free Users Only</option>
                                        <option value="premium">Premium Users Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    variant="primary"
                                    onClick={async () => {
                                        const title = (document.getElementById('notif-title') as HTMLInputElement).value;
                                        const body = (document.getElementById('notif-body') as HTMLTextAreaElement).value;
                                        const image = (document.getElementById('notif-image') as HTMLInputElement).value;
                                        const name = (document.getElementById('notif-name') as HTMLInputElement).value;
                                        const target = (document.getElementById('notif-target') as HTMLSelectElement).value;

                                        if (!body) {
                                            toast.error("Notification text is required");
                                            return;
                                        }

                                        // DEBUG: Check Role
                                        try {
                                            const role = (auth.currentUser as any)?.role || "unknown"; // role isn't on currentUser usually, but let's check custom claims or just log uid
                                            console.log("Current User UID:", auth.currentUser?.uid);
                                        } catch (e) { }

                                        // 1. DATABASE SAVE (In-App History)
                                        let savedToDb = false;
                                        try {
                                            await addDoc(collection(db, 'notifications'), {
                                                title: title || "New Notification",
                                                body,
                                                image,
                                                name,
                                                target,
                                                createdAt: Date.now(),
                                                readBy: []
                                            });
                                            savedToDb = true;
                                            toast.success("Saved to In-App History");
                                        } catch (err: any) {
                                            console.error("Database Save Failed:", err);
                                            toast.error(`Database Error: ${err.message}`);
                                            alert(`Database Permission Error:\n${err.message}\n\nCheck if you are a SuperAdmin.`);
                                        }

                                        // 2. ONESIGNAL PUSH
                                        // Fetch valid tokens (Strict OneSignal)
                                        const usersSnapshot = await getDocs(collection(db, "users"));
                                        const allUsersData = usersSnapshot.docs.map(doc => doc.data() as User);

                                        let targetUsers = allUsersData;
                                        if (target === 'paid') targetUsers = allUsersData.filter(u => u.paidUser);
                                        if (target === 'scouts') targetUsers = allUsersData.filter(u => u.role === 'admin');

                                        // Get IDs (Strict OneSignal UUIDs)
                                        const playerIds = targetUsers
                                            .map(u => u.oneSignalPlayerId)
                                            .filter(id => id && id.length > 30);

                                        // alert(`Debug: Found ${playerIds.length} Valid OneSignal IDs.`);

                                        if (playerIds.length === 0) {
                                            toast.error("No OneSignal IDs found. Please Login on Mobile App first.");
                                        }

                                        // Run this INDEPENDENTLY so a database error doesn't block the push
                                        if (systemSettings.oneSignalAppId && systemSettings.oneSignalApiKey) {
                                            try {
                                                const headers = {
                                                    "Content-Type": "application/json; charset=utf-8",
                                                    "Authorization": `Basic ${systemSettings.oneSignalApiKey}`
                                                };
                                                // ... payload construction using playerIds ...

                                                const payload = {
                                                    app_id: systemSettings.oneSignalAppId,
                                                    headings: { "en": title || "New Notification" },
                                                    contents: { "en": body },
                                                    include_player_ids: playerIds, // Use the IDs we filtered
                                                    // included_segments: ["Total Subscriptions"], // Don't use this if using specific IDs
                                                    big_picture: image || undefined,
                                                    chrome_web_image: image || undefined,
                                                    data: { open_url: image || "app://home" }
                                                };

                                                console.log("Sending to OneSignal:", payload);
                                                const response = await fetch("https://onesignal.com/api/v1/notifications", {
                                                    method: "POST",
                                                    headers: headers,
                                                    body: JSON.stringify(payload)
                                                });

                                                const data = await response.json();
                                                console.log("OneSignal Response:", data);

                                                if (response.ok && !data.errors) {
                                                    toast.success(`Push Sent! ID: ${data.id}`);
                                                    // alert(`Success! Push ID: ${data.id}`);
                                                } else {
                                                    const errorMsg = data.errors ? JSON.stringify(data.errors) : "Unknown Error";
                                                    console.error("OneSignal Error:", errorMsg);
                                                    toast.error(`OneSignal Failed: ${errorMsg}`);
                                                    alert(`OneSignal Error:\n${errorMsg}`);
                                                }

                                            } catch (err: any) {
                                                console.error("OneSignal Exception:", err);
                                                toast.error("OneSignal Network Error");
                                                alert(`Network Error:\n${err.message}`);
                                            }
                                        } else {
                                            if (savedToDb) {
                                                toast.info("Saved to DB, but OneSignal keys are missing for Push.");
                                            } else {
                                                toast.error("Both Database and Push failed or keys missing.");
                                            }
                                        }

                                        // Reset Form
                                        try {
                                            (document.getElementById('notif-title') as HTMLInputElement).value = '';
                                            (document.getElementById('notif-body') as HTMLTextAreaElement).value = '';
                                            (document.getElementById('notif-image') as HTMLInputElement).value = '';
                                            (document.getElementById('notif-name') as HTMLInputElement).value = '';
                                        } catch (e) { }
                                    }}
                                >
                                    <Bell className="mr-2" size={18} /> Send Notification
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AD ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Total Views</h3>
                                <p className="text-3xl font-display font-bold text-white">
                                    {ads.reduce((acc, ad) => acc + ad.views, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Total Clicks</h3>
                                <p className="text-3xl font-display font-bold text-white">
                                    {ads.reduce((acc, ad) => acc + ad.clicks, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Active Campaigns</h3>
                                <p className="text-3xl font-display font-bold text-white">
                                    {ads.filter(ad => ad.active).length}
                                </p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                            <h3 className="text-xl font-bold mb-6 text-white">Performance Trend (Last 14 Days)</h3>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="views" name="Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="clicks" name="Clicks" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Campaign Table */}
                        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                    <Activity size={18} /> Campaign Performance
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                        <tr>
                                            <th className="p-4">Campaign</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Views</th>
                                            <th className="p-4">Clicks</th>
                                            <th className="p-4 text-right">CTR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                        {ads.map(ad => {
                                            const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00';
                                            return (
                                                <tr key={ad.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold text-white">{ad.title}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border
                                                            ${ad.active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                                                            {ad.active ? 'Active' : 'Paused'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono">{ad.views}</td>
                                                    <td className="p-4 font-mono">{ad.clicks}</td>
                                                    <td className="p-4 text-right font-mono text-accent">{ctr}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* COMMISSION CENTER */}
                {activeTab === 'commissions' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-display font-bold text-white mb-2">Commission Center</h2>
                                <p className="text-gray-400">Manage monthly revenue pool and payouts.</p>
                            </div>
                            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 font-mono text-sm">
                                CYCLE: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        {poolStatus ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-surfaceHighlight p-6 rounded-2xl border border-white/5">
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Collected</div>
                                    <div className="text-4xl font-bold text-white">₹{poolStatus.totalRevenue.toFixed(2)}</div>
                                </div>
                                <div className="bg-surfaceHighlight p-6 rounded-2xl border border-white/5">
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Platform Share (30%)</div>
                                    <div className="text-4xl font-bold text-purple-400">₹{poolStatus.platformShare.toFixed(2)}</div>
                                </div>
                                <div className="bg-surfaceHighlight p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Coins size={64} className="text-green-500" />
                                    </div>
                                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">Admin Pool (70%)</div>
                                    <div className="text-4xl font-bold text-green-400 mb-4">₹{poolStatus.adminPool.toFixed(2)}</div>

                                    {poolStatus.status === 'open' ? (
                                        <Button
                                            variant="primary"
                                            onClick={handleDistributePool}
                                            disabled={distributing || poolStatus.adminPool <= 0}
                                            className="w-full bg-green-600 hover:bg-green-700 border-none shadow-lg shadow-green-900/20"
                                        >
                                            {distributing ? 'Processing...' : 'Distribute Pool'}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-2 rounded-lg text-sm font-bold">
                                            <ShieldCheck size={16} /> Distributed
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-surfaceHighlight rounded-2xl border border-white/5 border-dashed">
                                <Coins className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">No Pool Active</h3>
                                <p className="text-gray-400">No Pro subscriptions have been purchased this month yet.</p>
                            </div>
                        )}

                        <div className="glass-panel p-6 rounded-2xl border border-white/10">
                            <h3 className="tex-lg font-bold text-white mb-4">Activity Log</h3>
                            <p className="text-sm text-gray-500 italic">Historical distribution data will appear here in future updates.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* DIAGNOSTICS TAB */}
            {
                activeTab === 'diagnostics' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Activity className="text-green-500" /> System Health
                                </h2>
                                <p className="text-gray-400">Scan and repair database anomalies.</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    setScanResult(null);
                                    const res = await runSystemScan();
                                    setScanResult(res);
                                    toast.success("System Scan Complete");
                                }}
                            >
                                <RefreshCw size={16} className="mr-2" /> Run Scan
                            </Button>
                        </div>

                        {!scanResult ? (
                            <div className="p-12 text-center bg-white/5 rounded-xl border border-white/10 animate-pulse">
                                <Activity className="mx-auto h-12 w-12 text-gray-500 mb-4 animate-spin-slow" />
                                <h3 className="text-lg font-bold text-white">Scanning System...</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* User Health */}
                                <div className="glass-panel p-6 rounded-xl border border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Users className="text-primary" /> User Database
                                    </h3>
                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg">
                                            <span className="text-gray-400">Total Users</span>
                                            <span className="text-white font-mono font-bold">{scanResult.totalUsers}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Shield size={14} className={scanResult.usersMissingRole > 0 ? "text-red-500" : "text-gray-600"} />
                                                <span className={scanResult.usersMissingRole > 0 ? "text-red-400" : "text-gray-400"}>Role Issues</span>
                                            </div>
                                            <span className={`font-mono font-bold ${scanResult.usersMissingRole > 0 ? "text-red-500" : "text-green-500"}`}>
                                                {scanResult.usersMissingRole}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className={scanResult.usersMissingCoins > 0 ? "text-yellow-500" : "text-gray-600"} />
                                                <span className={scanResult.usersMissingCoins > 0 ? "text-yellow-400" : "text-gray-400"}>Coin Integrity</span>
                                            </div>
                                            <span className={`font-mono font-bold ${scanResult.usersMissingCoins > 0 ? "text-yellow-500" : "text-green-500"}`}>
                                                {scanResult.usersMissingCoins}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Lock size={14} className={scanResult.usersInvalidAdmin > 0 ? "text-orange-500" : "text-gray-600"} />
                                                <span className={scanResult.usersInvalidAdmin > 0 ? "text-orange-400" : "text-gray-400"}>Admin Mismatch</span>
                                            </div>
                                            <span className={`font-mono font-bold ${scanResult.usersInvalidAdmin > 0 ? "text-orange-500" : "text-green-500"}`}>
                                                {scanResult.usersInvalidAdmin}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/80"
                                        onClick={async () => {
                                            const count = await fixUserIssues();
                                            toast.success(`Fixed ${count} user issues.`);
                                            // Re-run scan
                                            const res = await runSystemScan();
                                            setScanResult(res);
                                        }}
                                        disabled={
                                            scanResult.usersMissingRole === 0 &&
                                            scanResult.usersMissingCoins === 0 &&
                                            scanResult.usersInvalidAdmin === 0 &&
                                            (!scanResult.usersProfileIssues || scanResult.usersProfileIssues === 0)
                                        }
                                    >
                                        Auto-Repair User Data
                                    </Button>
                                </div>

                                {/* Content Health */}
                                <div className="glass-panel p-6 rounded-xl border border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Database size={18} className="text-purple-400" /> Content Registry
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                            <span className="text-gray-400 text-sm">Total Entries</span>
                                            <span className="text-white font-mono font-bold">{scanResult.totalContent}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-red-500/20">
                                            <span className="text-gray-400 text-sm">Schema Errors (Episodes)</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-mono font-bold ${scanResult.contentMissingEpisodes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {scanResult.contentMissingEpisodes}
                                                </span>
                                                {scanResult.contentMissingEpisodes > 0 && (
                                                    <Button size="sm" variant="danger" onClick={async () => {
                                                        const count = await fixContentIssues();
                                                        toast.success(`Fixed ${count} content entries`);
                                                        const res = await runSystemScan(); // refresh
                                                        setScanResult(res);
                                                    }}>Fix Migrations</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* BUG REPORTS TAB */}
            {
                activeTab === 'bugs' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] animate-fade-in">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                                <Bug size={18} /> Bug Reports
                            </h3>
                            <div className="text-[10px] font-mono text-gray-500">{bugReports.length} REPORTS</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] uppercase text-gray-500 font-mono">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Anomaly Description</th>
                                        <th className="p-4">Device Intel</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                    {bugReports.map(bug => (
                                        <tr key={bug.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedBug(bug)}>
                                            <td className="p-4 font-mono text-xs">
                                                {bug.createdAt?.seconds ? new Date(bug.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white text-xs">{bug.userEmail}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">{bug.userId}</div>
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                <div className="text-white text-sm line-clamp-1">{bug.description}</div>
                                                <div className="text-[10px] text-blue-400 mt-1">Click to view full report</div>
                                            </td>
                                            <td className="p-4 max-w-[150px]">
                                                <div className="text-[10px] text-gray-500 font-mono truncate" title={bug.deviceInfo}>{bug.deviceInfo}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${bug.status === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'}`}>
                                                    {bug.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                                {bug.status === 'open' && (
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => {
                                                            setPendingAction({
                                                                title: 'Resolve Bug Report',
                                                                message: <p>Mark this bug report from <b>{bug.userEmail}</b> as resolved?</p>,
                                                                confirmLabel: 'Mark Resolved',
                                                                isDangerous: false,
                                                                onConfirm: async () => {
                                                                    await resolveBugReport(bug.id);
                                                                    toast.success('Bug resolved');
                                                                }
                                                            });
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                                    >
                                                        <CheckCircle size={14} className="mr-2" /> Resolve
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {bugReports.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-500 font-mono border-t border-white/5">
                                                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                                                NO ACTIVE ANOMALIES DETECTED. SYSTEM NOMINAL.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Role Change Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!roleChangeData}
                onClose={() => setRoleChangeData(null)}
                onConfirm={confirmRoleChange}
                title="Update User Role"
                confirmLabel="Confirm Update"
                message={
                    <p>
                        Are you sure you want to change <b>{roleChangeData?.email}</b> from
                        <span className="mx-1 px-1 rounded bg-white/10 font-mono text-gray-300">{roleChangeData?.currentRole.toUpperCase()}</span>
                        to
                        <span className="mx-1 px-1 rounded bg-primary/20 text-primary font-bold font-mono border border-primary/30">{roleChangeData?.newRole.toUpperCase()}</span>?
                    </p>
                }
            />

            {/* Universal Action Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                onConfirm={async () => {
                    if (pendingAction?.onConfirm) await pendingAction.onConfirm();
                    setPendingAction(null);
                }}
                title={pendingAction?.title || ''}
                message={pendingAction?.message || ''}
                confirmLabel={pendingAction?.confirmLabel || 'Confirm'}
                isDangerous={pendingAction?.isDangerous}
            />

            {/* Suspend User Modal (needs a days input) */}
            {showSuspendInput && suspendTargetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-sm rounded-2xl bg-surface border border-white/10 shadow-2xl p-8 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Suspend User</h3>
                        <p className="text-gray-400 text-sm mb-6">Suspend <b className="text-white">{suspendTargetUser.email}</b> for how many days?</p>
                        <input
                            type="number"
                            min="1"
                            value={suspendDays}
                            onChange={e => setSuspendDays(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-center text-2xl font-mono mb-2 focus:border-red-500 focus:outline-none"
                            placeholder="7"
                        />
                        <p className="text-xs text-gray-600 mb-6">Enter 9999 for indefinite suspension</p>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowSuspendInput(false); setSuspendTargetUser(null); }} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={confirmSuspend} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">Suspend</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Bug View Modal */}
            <ViewBugModal
                bug={selectedBug}
                onClose={() => setSelectedBug(null)}
            />
        </div >
    );
};
