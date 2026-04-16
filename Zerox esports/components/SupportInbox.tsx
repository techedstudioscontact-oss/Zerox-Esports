import React, { useState, useEffect, useRef } from 'react';
import { User, SupportChat, SupportMessage } from '../types';
import {
    subscribeToAllChats,
    subscribeToMessages,
    sendSupportMessage,
    markAsRead,
    resolveChat,
    deleteSupportChat
} from '../services/supportService';
import { uploadSupportMedia } from '../services/cloudinaryService';
import {
    MessageCircle, CheckCircle, Clock,
    Send, User as UserIcon, Shield, Paperclip, Loader2, X, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationModal } from './ConfirmationModal';

interface SupportInboxProps {
    admin: User;
}

export const SupportInbox: React.FC<SupportInboxProps> = ({ admin }) => {
    const [chats, setChats] = useState<SupportChat[]>([]);
    const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    // Media
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => subscribeToAllChats(setChats), []);

    useEffect(() => {
        if (!activeChat) return;
        const unsub = subscribeToMessages(activeChat.userId, (msgs) => {
            setMessages(msgs);
            markAsRead(activeChat.userId, true);
        });
        return unsub;
    }, [activeChat]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxMB = 25; // 25MB limit
        if (file.size > maxMB * 1024 * 1024) { toast.error(`Max ${maxMB}MB`); return; }
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!activeChat || (!text.trim() && !mediaFile) || sending) return;
        setSending(true);
        let media: { url: string; publicId: string; mediaType: 'image' | 'video' } | undefined;
        try {
            if (mediaFile) {
                setUploading(true);
                media = await uploadSupportMedia(mediaFile);
                setUploading(false);
                removeMedia();
            }
            await sendSupportMessage(
                activeChat.userId, admin.uid, admin.email, admin.role,
                text.trim(),
                media
            );
            setText('');
        } catch {
            toast.error('Failed to send.');
            setUploading(false);
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async () => {
        if (!activeChat) return;
        await resolveChat(activeChat.userId);
        toast.success(`Chat with ${activeChat.userEmail} resolved. Media auto-deleted from Cloudinary.`);
    };

    const handleDeleteChatClick = () => {
        if (!activeChat) return;
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteChat = async () => {
        if (!activeChat) return;
        setIsDeleteModalOpen(false);

        try {
            await deleteSupportChat(activeChat.userId);
            toast.success(`Chat deleted permanently.`);
            setActiveChat(null);
            setMessages([]);
        } catch (error: any) {
            console.error("Failed to delete support chat:", error);
            toast.error("Failed to delete chat: " + error.message);
        }
    };

    const roleLabel = (role: string) => {
        if (role === 'admin') return 'Event Creator';
        if (role === 'manager') return 'Moderator';
        if (role === 'superadmin') return 'Master Admin';
        return 'User';
    };

    return (
        <div className="flex h-[70vh] border border-white/10 rounded-xl overflow-hidden bg-[#0f0f10]">

            {/* ── Chat List ─────────────────────────────────────────── */}
            <div className="w-72 shrink-0 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 bg-black/20">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <MessageCircle size={14} className="text-primary" /> Support Inbox
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                        {chats.filter(c => c.unreadByAdmin > 0).length} unread
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {chats.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-gray-600 text-xs">No support chats yet.</p>
                        </div>
                    ) : chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => { setActiveChat(chat); setMessages([]); }}
                            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all hover:bg-white/5
                              ${activeChat?.id === chat.id ? 'bg-white/8 border-l-2 border-l-primary' : ''}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {chat.userEmail[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">{chat.userEmail.split('@')[0]}</p>
                                    <div className="flex items-center gap-1">
                                        {chat.status === 'resolved'
                                            ? <CheckCircle size={10} className="text-green-500" />
                                            : <Clock size={10} className="text-yellow-500" />
                                        }
                                        <span className="text-[9px] text-gray-500 capitalize">{chat.status}</span>
                                    </div>
                                </div>
                                {chat.unreadByAdmin > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                        {chat.unreadByAdmin}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-500 truncate pl-9">{chat.lastMessage || 'No messages'}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Message Panel ─────────────────────────────────────── */}
            {activeChat ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {activeChat.userEmail[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{activeChat.userEmail}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{activeChat.status}</p>
                        </div>
                        {activeChat.status !== 'resolved' ? (
                            <button
                                onClick={handleResolve}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-green-900/20 text-green-400 border border-green-800/30 hover:bg-green-900/30 font-bold transition-all flex items-center gap-1 shrink-0"
                            >
                                <CheckCircle size={10} /> Resolve
                            </button>
                        ) : (
                            <button
                                onClick={handleDeleteChatClick}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-900/20 text-red-400 border border-red-800/30 hover:bg-red-900/30 font-bold transition-all flex items-center gap-1 shrink-0"
                            >
                                <Trash2 size={10} /> Delete
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                        {messages.map(msg => {
                            const isAdmin = msg.senderRole !== 'user';
                            return (
                                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-2xl overflow-hidden shadow-lg ${isAdmin
                                        ? 'bg-gradient-to-br from-primary to-orange-600 rounded-br-sm shadow-[0_4px_15px_rgba(235,27,36,0.2)]'
                                        : 'bg-[#1a1a1e] border border-white/10 rounded-bl-sm'}`}
                                    >
                                        {/* Media */}
                                        {msg.mediaUrl && msg.mediaType === 'image' && (
                                            <img
                                                src={msg.mediaUrl}
                                                alt="attachment"
                                                className="w-full max-h-48 object-cover cursor-pointer"
                                                onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                            />
                                        )}
                                        {msg.mediaUrl && msg.mediaType === 'video' && (
                                            <video src={msg.mediaUrl} controls preload="metadata" className="w-full max-h-48" />
                                        )}
                                        {/* Text */}
                                        {msg.text && (
                                            <div className="px-3 py-2">
                                                <p className="text-xs text-white leading-relaxed">{msg.text}</p>
                                            </div>
                                        )}
                                        <div className={`flex items-center gap-1 px-3 pb-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            {!isAdmin && (
                                                <span className="text-[9px] text-white/50 font-semibold mr-1">
                                                    User
                                                </span>
                                            )}
                                            <p className="text-[9px] text-white/50">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {isAdmin && (
                                                <span className="text-[9px] text-white/50 font-semibold ml-1">
                                                    {roleLabel(msg.senderRole)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Media preview */}
                    {mediaPreview && mediaFile && (
                        <div className="mx-4 mb-2 relative w-fit shrink-0">
                            {mediaFile.type.startsWith('image') ? (
                                <img src={mediaPreview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                            ) : (
                                <video src={mediaPreview} className="h-16 w-16 object-cover rounded-lg border border-white/20" preload="metadata" />
                            )}
                            <button onClick={removeMedia} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors">
                                <X size={10} />
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-white/10 bg-black/20 flex items-end gap-2 shrink-0">
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFilePick} />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                        >
                            <Paperclip size={15} />
                        </button>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={activeChat.status === 'resolved' ? 'Chat resolved' : 'Reply to user (or attach media)...'}
                            disabled={activeChat.status === 'resolved'}
                            rows={1}
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 resize-none scrollbar-hide disabled:opacity-40"
                        />
                        <button
                            onClick={handleSend}
                            disabled={(!text.trim() && !mediaFile) || sending || uploading || activeChat.status === 'resolved'}
                            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/80 disabled:opacity-40 transition-all shrink-0"
                        >
                            {uploading || sending
                                ? <Loader2 size={16} className="animate-spin" />
                                : <Send size={16} />
                            }
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Select a chat to respond</p>
                    </div>
                </div>
            )}

            {/* Delete Chat Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteChat}
                title="Delete Support Chat"
                message={
                    <>
                        Are you sure you want to permanently delete this resolved chat?
                        <br /><br />
                        This action <b>cannot</b> be undone. All messages and media associated with this user's support ticket will be erased.
                    </>
                }
                confirmLabel="Delete Chat"
                isDangerous={true}
            />
        </div>
    );
};
