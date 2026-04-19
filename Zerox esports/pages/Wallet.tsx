import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    Wallet as WalletIcon,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    Plus,
    RefreshCw,
    Gift,
    Swords,
    ChevronLeft,
    X,
    CreditCard,
    Banknote,
    Copy,
    CheckCircle,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SystemSettings, subscribeToSystemSettings } from '../services/systemService';

interface WalletProps {
    user: User;
}

// ── UPI QR details – change once ─────────────────────────────────
const UPI_ID = 'zeroxesports@upi';
const UPI_NAME = 'Zerox eSports';
// ─────────────────────────────────────────────────────────────────

export const Wallet: React.FC<WalletProps> = ({ user }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

    // Modal visibility
    const [showAddMoney, setShowAddMoney] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);

    // Form states
    const [amount, setAmount] = useState('');
    const [utr, setUtr] = useState('');
    const [withdrawUpi, setWithdrawUpi] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    // ── Fetch transactions ───────────────────────────────────────
    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            setTransactions(snapshot.docs.map(d => d.data() as Transaction));
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Could not load transaction history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        const unsubscribe = subscribeToSystemSettings(setSystemSettings);
        return () => unsubscribe();
    }, [user.uid]);

    // ── Handlers ─────────────────────────────────────────────────
    const handleAddMoney = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseInt(amount);

        if (!numAmount || numAmount < 10) return toast.error("Minimum deposit is 10 Coins");
        if (!utr || utr.length < 5) return toast.error("Please enter a valid UTR / Reference ID");

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'deposit_requests'), {
                userId: user.uid,
                userEmail: user.email,
                amount: numAmount,
                coins: numAmount, // Duplicate for backwards compatibility
                utr,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            toast.success("Deposit request submitted! Admin will verify and add coins shortly.");
            setShowAddMoney(false);
            setAmount('');
            setUtr('');
        } catch (error: any) {
            toast.error(error.message || "Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseInt(amount);

        if (!numAmount || numAmount < 50) return toast.error("Minimum withdrawal is 50 Coins");
        if ((user.coins || 0) < numAmount) return toast.error("Insufficient coins balance.");
        if (!withdrawUpi) return toast.error("Please enter your UPI ID");

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'withdrawal_requests'), {
                userId: user.uid,
                userEmail: user.email,
                amount: numAmount,
                upiId: withdrawUpi,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            toast.success("Withdrawal request submitted! Admin will process shortly.");
            setShowWithdraw(false);
            setAmount('');
            setWithdrawUpi('');
        } catch (error: any) {
            toast.error(error.message || "Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────
    const getReasonIcon = (reason: Transaction['reason']) => {
        switch (reason) {
            case 'add_money': return <Plus size={16} className="text-green-500" />;
            case 'withdraw': return <ArrowUpFromLine size={16} className="text-red-500" />;
            case 'referral_bonus': return <Gift size={16} className="text-purple-500" />;
            case 'signup_bonus': return <Gift size={16} className="text-blue-500" />;
            case 'entry_fee': return <Swords size={16} className="text-orange-500" />;
            case 'reward': return <WalletIcon size={16} className="text-yellow-500" />;
            default: return <History size={16} className="text-gray-500" />;
        }
    };

    const getReasonText = (reason: Transaction['reason']) =>
        reason.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="min-h-screen pt-20 pb-20 px-4 bg-[#050505]">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            <WalletIcon className="text-primary" /> My Wallet
                        </h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Manage your funds &amp; rewards</p>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="relative bg-gradient-to-br from-[#1c1c24] to-[#111] border border-white/10 rounded-3xl overflow-hidden p-8 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-2">Total Balance</p>
                            <div className="flex items-end justify-center md:justify-start gap-2">
                                <span className="text-5xl font-black text-yellow-400 tracking-tighter">{user.coins || 0}</span>
                                <span className="text-lg text-yellow-500/50 font-bold mb-1">Coins</span>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                            {/* ADD MONEY HIDDEN PER REQUEST */}
                            {/* <button
                                onClick={() => { setAmount(''); setUtr(''); setShowAddMoney(true); }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-sm hover:bg-primary-hover transition-all shadow-[0_0_20px_rgba(205,255,0,0.3)] hover:shadow-[0_0_30px_rgba(205,255,0,0.5)]"
                            >
                                <Plus size={18} /> Add
                            </button> */}
                            <button
                                onClick={() => { setAmount(''); setWithdrawUpi(''); setShowWithdraw(true); }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 text-white font-black uppercase tracking-widest text-sm border border-white/20 hover:bg-white/20 transition-all"
                            >
                                <ArrowUpFromLine size={18} /> Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <History size={16} className="text-gray-400" /> Recent Transactions
                        </h2>
                        <button
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading transactions...</div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-600">
                                    <WalletIcon size={24} />
                                </div>
                                <p className="text-gray-400 font-medium">No transactions yet.</p>
                                <p className="text-xs text-gray-600 mt-1">When you add coins or play matches, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {transactions.map(tx => (
                                    <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                                                ${tx.type === 'credit' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                {getReasonIcon(tx.reason)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">
                                                    {getReasonText(tx.reason)}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                                                    {new Date(tx.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-lg font-mono ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{tx.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ════════ ADD MONEY MODAL ════════ */}
            {showAddMoney && (
                <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setShowAddMoney(false)} />
                    <div className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Plus size={18} className="text-primary" />
                                <h3 className="font-black text-white text-lg tracking-tight">Support Our Server / Add Coins</h3>
                            </div>
                            <button onClick={() => !isSubmitting && setShowAddMoney(false)} className="text-gray-500 hover:text-white transition-colors" disabled={isSubmitting}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {/* Admin QR Instructions */}
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">Pay to this UPI & submit UTR</p>
                                {systemSettings?.walletInfoUrl ? (
                                    <img src={systemSettings.walletInfoUrl} alt="UPI QR Code" className="w-48 h-48 rounded-lg object-contain bg-white p-2 mb-3" />
                                ) : (
                                    <div className="w-48 h-48 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 mb-3 text-gray-500">
                                        No QR Uploaded
                                    </div>
                                )}

                                <div className="flex items-center justify-between w-full bg-[#111] border border-white/5 rounded-lg p-3">
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{UPI_NAME}</p>
                                        <p className="text-sm font-bold text-white font-mono mt-0.5">{systemSettings?.walletInstructions || UPI_ID}</p>
                                    </div>
                                    <button
                                        className="p-2 bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(systemSettings?.walletInstructions || UPI_ID);
                                            toast.success("UPI ID Copied!");
                                        }}
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Important Note */}
                            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                                <Clock size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-500/80 leading-relaxed">
                                    After payment, please submit the 12-digit UTR/Reference number below. Coins will be credited after admin verification (usually within 15 mins).
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleAddMoney} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Amount Paid (INR)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Min. 10"
                                            className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-primary focus:outline-none transition-colors placeholder:font-medium placeholder:text-gray-600"
                                            required
                                            min="10"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-right pr-1">1 INR = 1 Coin</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">UTR / Ref. Number</label>
                                    <input
                                        type="text"
                                        value={utr}
                                        onChange={(e) => setUtr(e.target.value)}
                                        placeholder="Enter 12-digit UTR"
                                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !amount || !utr}
                                    className="w-full py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-sm hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><RefreshCw size={18} className="animate-spin" /> Processing</>
                                    ) : (
                                        <><CheckCircle size={18} /> Submit Request</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ WITHDRAW MONEY MODAL ════════ */}
            {showWithdraw && (
                <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSubmitting && setShowWithdraw(false)} />
                    <div className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <ArrowUpFromLine size={18} className="text-white" />
                                <h3 className="font-black text-white text-lg tracking-tight">Withdraw Coins</h3>
                            </div>
                            <button onClick={() => !isSubmitting && setShowWithdraw(false)} className="text-gray-500 hover:text-white transition-colors" disabled={isSubmitting}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">

                            {/* Current Balance & Notice */}
                            <div className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Available Balance</span>
                                <span className="text-xl font-black text-yellow-400">{user.coins || 0}</span>
                            </div>

                            <form onSubmit={handleWithdraw} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Coins to Withdraw</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                                            <Banknote size={16} />
                                        </span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Min. 50"
                                            className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-black text-lg focus:border-white focus:outline-none transition-colors placeholder:font-medium placeholder:text-gray-600"
                                            required
                                            min="50"
                                            max={user.coins || 0}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Your UPI ID</label>
                                    <input
                                        type="text"
                                        value={withdrawUpi}
                                        onChange={(e) => setWithdrawUpi(e.target.value)}
                                        placeholder="e.g., number@upi"
                                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono focus:border-white focus:outline-none transition-colors placeholder:text-gray-600"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-[10px] text-gray-500 pl-1 mt-1">Please ensure your UPI ID is correct.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !amount || !withdrawUpi || parseInt(amount) > (user.coins || 0)}
                                    className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><RefreshCw size={18} className="animate-spin" /> Processing</>
                                    ) : (
                                        <><CheckCircle size={18} /> Confirm Withdrawal</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
