import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, GlobalChatMessage } from '../types';
import { Send, Users, Shield, MessageCircle } from 'lucide-react';

interface CommunityProps {
    user: User | null;
}

export const Community: React.FC<CommunityProps> = ({ user }) => {
    const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch last 100 messages
        const q = query(
            collection(db, 'global_chat'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: GlobalChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as GlobalChatMessage);
            });
            setMessages(msgs);
            setTimeout(() => scrollToBottom(), 100);
        });

        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("You must be logged in to chat.");
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'global_chat'), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email.split('@')[0],
                userRole: user.role,
                text: newMessage.trim(),
                timestamp: Date.now()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    const formatTime = (ts: number) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-20 md:pb-6 bg-[#0a0a0b] relative">
            {/* Background elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="container mx-auto max-w-4xl h-[calc(100vh-140px)] flex flex-col relative z-10">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4 group">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:border-primary/50 transition-colors">
                            <Users className="text-primary h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Global Hub</h1>
                            <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.2em] mt-1 pl-1">
                                Zerox Community <span className="text-primary hidden md:inline">• Live Feed</span>
                            </p>
                        </div>
                    </div>
                    {/* Feature Tease Banner based on user request */}
                    <div className="py-2 px-4 bg-blue-500/10 border border-blue-500/30 rounded-full relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest relative z-10 flex items-center gap-2">
                            <MessageCircle size={14} /> Friend System & DMs Coming Next Update!
                        </p>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="flex-1 glass-panel rounded-[32px] border border-white/10 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide flex flex-col">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-center h-full text-gray-500 opacity-50">
                                <Users size={48} className="mb-4" />
                                <p className="font-mono text-xs uppercase tracking-widest">Global feed is currently silent.</p>
                                <p className="text-[10px] mt-2">Send the first transmission.</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = user?.uid === msg.userId;
                                const isSystemStaff = msg.userRole === 'admin' || msg.userRole === 'masteradmin' || msg.userRole === 'superadmin' || msg.userRole === 'manager';
                                
                                // Show date divider if day changed
                                const prevMsg = index > 0 ? messages[index - 1] : null;
                                const showDate = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDate && (
                                            <div className="flex justify-center my-6">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                    {new Date(msg.timestamp).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Avatar */}
                                                {!isMe && (
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center relative mt-1">
                                                        <span className="text-[10px] font-black text-white uppercase">{msg.userName[0]}</span>
                                                        {isSystemStaff && (
                                                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                                                                <Shield size={8} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Message Body */}
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                                            {isMe ? 'You' : msg.userName}
                                                        </span>
                                                        {isSystemStaff && !isMe && (
                                                            <span className="text-[8px] font-black text-primary uppercase tracking-widest border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded">STAFF</span>
                                                        )}
                                                        <span className="text-[9px] font-mono text-gray-600">{formatTime(msg.timestamp)}</span>
                                                    </div>
                                                    
                                                    <div className={`p-4 rounded-2xl ${
                                                        isMe 
                                                            ? 'bg-primary/20 border border-primary/50 text-white rounded-tr-sm' 
                                                            : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
                                                    }`}>
                                                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-xl">
                        {user ? (
                            <form onSubmit={handleSendMessage} className="flex gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Broadcast to global hub..."
                                    className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !newMessage.trim()}
                                    className="px-6 py-4 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-widest text-xs rounded-2xl disabled:opacity-50 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    <Send size={16} /> <span className="hidden md:inline">Send</span>
                                </button>
                            </form>
                        ) : (
                            <div className="py-4 text-center text-sm font-black uppercase tracking-widest text-gray-500 bg-black/50 rounded-2xl border border-white/5">
                                Login Access Required to Transmit
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
