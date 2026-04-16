import React, { useState, useEffect, useRef } from 'react';
import { User, SupportMessage } from '../types';
import {
    ensureChat,
    sendSupportMessage,
    subscribeToMessages,
    markAsRead
} from '../services/supportService';
import { uploadSupportMedia } from '../services/cloudinaryService';
import { X, Send, Shield, CheckCircle, Bot, MessageCircle, Paperclip, Loader2 } from 'lucide-react';
import { AikoChat } from './AikoChat';
import { toast } from 'sonner';

interface SupportChatModalProps {
    user: User;
    onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ user, onClose }) => {
    const [tab, setTab] = useState<'aiko' | 'support'>('aiko');
    const [animating, setAnimating] = useState(false);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [ready, setReady] = useState(false);
    // Media state
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaUploading, setMediaUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ensureChat(user.uid, user.email).then(() => setReady(true));
    }, [user.uid, user.email]);

    useEffect(() => {
        if (!ready || tab !== 'support') return;
        const unsub = subscribeToMessages(user.uid, (msgs) => {
            setMessages(msgs);
            markAsRead(user.uid, false);
        });
        return unsub;
    }, [ready, user.uid, tab]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Smooth tab fade
    const switchTab = (t: 'aiko' | 'support') => {
        if (t === tab) return;
        setAnimating(true);
        setTimeout(() => { setTab(t); setAnimating(false); }, 180);
    };

    // Handle file pick
    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxMB = 25; // 25MB limit for both image and video
        if (file.size > maxMB * 1024 * 1024) {
            toast.error(`File too large. Max ${maxMB}MB.`);
            return;
        }
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!text.trim() && !mediaFile) return;
        if (sending || mediaUploading) return;

        setSending(true);
        let media: { url: string; publicId: string; mediaType: 'image' | 'video' } | undefined;

        try {
            if (mediaFile) {
                setMediaUploading(true);
                media = await uploadSupportMedia(mediaFile);
                setMediaUploading(false);
                removeMedia();
            }
            await sendSupportMessage(
                user.uid, user.uid, user.email, user.role,
                text.trim() || (media ? '' : ''),
                media
            );
            setText('');
        } catch (err) {
            toast.error('Failed to send. Please try again.');
            setMediaUploading(false);
        } finally {
            setSending(false);
        }
    };

    const getRoleLabel = (role: string) => {
        if (role === 'admin') return 'Event Creator';
        if (role === 'manager') return 'Moderator';
        if (role === 'superadmin' || role === 'masteradmin') return 'Master Admin';
        return 'Support';
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: 'min(80vh, 580px)', animation: 'slideUpFade 0.3s ease forwards' }}
            >
                {/* ── Tab Header ─────────────────────────────────────── */}
                <div className="flex border-b border-white/10 bg-black/30 shrink-0">
                    <button
                        onClick={() => switchTab('aiko')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all duration-200
                          ${tab === 'aiko' ? 'text-white border-b-2 border-primary bg-primary/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <Bot size={13} /> Aiko AI
                    </button>
                    <button
                        onClick={() => switchTab('support')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all duration-200
                          ${tab === 'support' ? 'text-white border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <MessageCircle size={13} /> Live Support
                    </button>
                    <button onClick={onClose} className="px-4 text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* ── Animated Tab Content ────────────────────────────  */}
                <div
                    className="flex-1 flex flex-col min-h-0 transition-opacity duration-200"
                    style={{ opacity: animating ? 0 : 1 }}
                >
                    {/* Aiko Tab */}
                    {tab === 'aiko' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <AikoChat userId={user.uid} />
                        </div>
                    )}

                    {/* Live Support Tab */}
                    {tab === 'support' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/20 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Support Team</p>
                                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                                        Moderators · Usually reply in minutes
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                                {/* Welcome bubble */}
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2">
                                        <p className="text-xs text-white leading-relaxed">
                                            👋 Welcome! Our Moderators will reply shortly. You can also send <strong>images or videos</strong> for faster help. For instant answers try <strong>Aiko AI</strong> tab!
                                        </p>
                                        <p className="text-[9px] text-gray-600 mt-1">Support Team</p>
                                    </div>
                                </div>

                                {/* Messages */}
                                {messages.map(msg => {
                                    const isMe = msg.senderId === user.uid;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[82%] rounded-2xl overflow-hidden shadow-lg ${isMe
                                                ? 'bg-gradient-to-br from-primary to-orange-600 rounded-br-sm shadow-[0_4px_15px_rgba(235,27,36,0.2)]'
                                                : 'bg-[#1a1a1e] border border-white/10 rounded-bl-sm'
                                                }`}>
                                                {/* Media preview */}
                                                {msg.mediaUrl && msg.mediaType === 'image' && (
                                                    <img
                                                        src={msg.mediaUrl}
                                                        alt="attachment"
                                                        className="w-full max-h-48 object-cover cursor-pointer"
                                                        onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                                    />
                                                )}
                                                {msg.mediaUrl && msg.mediaType === 'video' && (
                                                    <video
                                                        src={msg.mediaUrl}
                                                        controls
                                                        className="w-full max-h-48 object-cover"
                                                        preload="metadata"
                                                    />
                                                )}
                                                {/* Text */}
                                                {msg.text && (
                                                    <div className="px-3 py-2">
                                                        <p className="text-xs text-white leading-relaxed">{msg.text}</p>
                                                    </div>
                                                )}
                                                <div className={`flex items-center gap-1 px-3 pb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <p className="text-[9px] text-white/50">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {isMe && <CheckCircle size={9} className="text-white/50" />}
                                                    {!isMe && (
                                                        <span className="text-[9px] text-white/50 font-semibold ml-1">
                                                            {getRoleLabel(msg.senderRole)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {/* Media preview strip */}
                            {mediaPreview && mediaFile && (
                                <div className="mx-4 mb-2 relative w-fit shrink-0">
                                    {mediaFile.type.startsWith('image') ? (
                                        <img src={mediaPreview} alt="preview" className="h-20 w-20 object-cover rounded-xl border border-white/20" />
                                    ) : (
                                        <video src={mediaPreview} className="h-20 w-20 object-cover rounded-xl border border-white/20" preload="metadata" />
                                    )}
                                    <button
                                        onClick={removeMedia}
                                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}

                            {/* Input row */}
                            <div className="px-4 py-3 border-t border-white/10 bg-black/20 flex items-end gap-2 shrink-0">
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFilePick}
                                />
                                {/* Attach button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                                    title="Attach image or video"
                                >
                                    <Paperclip size={15} />
                                </button>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Message or attach media..."
                                    rows={1}
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none scrollbar-hide"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!text.trim() && !mediaFile) || sending || mediaUploading}
                                    className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30 shrink-0"
                                >
                                    {mediaUploading || sending
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Send size={16} />
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
