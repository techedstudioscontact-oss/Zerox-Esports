import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';
import { saveAikoMessage, subscribeToAikoMessages, AikoFirebaseMsg } from '../services/supportService';

// AikoFirebaseMsg is the same shape — re-use it
type LocalMsg = AikoFirebaseMsg;

// ── Aiko's Knowledge Base for Zerox eSports ──────────────────────
const AIKO_RESPONSES: { triggers: string[]; text: string; emotion: string }[] = [
    {
        triggers: ['hello', 'hi', 'hey', 'namaste', 'hlo', 'helo'],
        text: "Namaste! I'm Aiko, your Zerox eSports assistant 💫 I'm here to help you with tournaments, scrims, registration and more! What can I do for you?",
        emotion: 'excited'
    },
    {
        triggers: ['who are you', 'what are you', 'aiko', 'bot', 'ai'],
        text: "I'm Aiko — the AI sidekick of Zerox eSports! I can help with tournament info, registrations, rules, and app questions. For account issues, I'll connect you to a real Moderator 🎮",
        emotion: 'happy'
    },
    {
        triggers: ['bgmi', 'pubg', 'battleground'],
        text: "BGMI is one of our biggest games! 🔫 Check the Home screen for active BGMI tournaments. Squad up and register before slots fill. Need help registering?",
        emotion: 'excited'
    },
    {
        triggers: ['free fire', 'ff', 'freefire', 'ffmax'],
        text: "Free Fire MAX is 🔥 right now! We host daily Free Fire scrims and weekly tournaments. Head to Home and filter by 'Free Fire' tag to see current events!",
        emotion: 'happy'
    },
    {
        triggers: ['register', 'join', 'enroll', 'sign up', 'participate', 'registration'],
        text: "To register: 1️⃣ Open any tournament card → 2️⃣ Tap 'Register' → 3️⃣ Fill your team details → 4️⃣ Wait for confirmation. Make sure you're logged in first! Need help?",
        emotion: 'curious'
    },
    {
        triggers: ['tournament', 'event', 'competition'],
        text: "Zerox eSports hosts BGMI, Free Fire, Minecraft and more tournaments! 🏆 Browse the home page or use the game filter strip. Want to know about prizes or rules?",
        emotion: 'excited'
    },
    {
        triggers: ['scrim', 'practice', 'warmup'],
        text: "Scrims are practice matches — perfect to grind before the big tournament! 💪 Check the Scrims tab on the home page for daily slots.",
        emotion: 'curious'
    },
    {
        triggers: ['prize', 'reward', 'win money', 'cash'],
        text: "Prize pools vary per tournament 💰 Check the tournament details card to see the exact prize — there's always a Prize Pool field showing the reward!",
        emotion: 'excited'
    },
    {
        triggers: ['team', 'squad', 'member', 'size'],
        text: "Team sizes depend on the format: Solo (1v1), Duo (2-man), Squad (4-man), or Team (6-man). Each tournament card shows the required team size! 🎯",
        emotion: 'neutral'
    },
    {
        triggers: ['login', 'account', 'sign in', 'password', 'forgot'],
        text: "For login issues, try 'Forgot Password' on the login page. If you're locked out, tap 'Live Support Chat' in the sidebar to reach a human Moderator directly! 🛡️",
        emotion: 'neutral'
    },
    {
        triggers: ['rules', 'regulation', 'banned', 'cheat', 'hack'],
        text: "Fair play is everything here 🚫 Cheating or rule violations lead to permanent bans. Check the tournament description for specific rules. We use anti-hack monitoring!",
        emotion: 'angry'
    },
    {
        triggers: ['map', 'erangel', 'bermuda', 'sanhok', 'livik'],
        text: "Maps are set by the Event Creator and shown in each tournament card! 🗺️ Popular ones include Erangel, Bermuda, Sanhok & Livik. Can't wait to see you in the zone!",
        emotion: 'curious'
    },
    {
        triggers: ['coins', 'reward', 'daily', 'points'],
        text: "Your Zerox Coins are shown in the sidebar! 🪙 Log in daily to claim daily rewards and use coins for special perks coming soon!",
        emotion: 'happy'
    },
    {
        triggers: ['admin', 'creator', 'moderator', 'staff'],
        text: "Our team has Event Creators (who host tournaments), Moderators (who manage the community), and Master Admins (devs). Need to reach them? Open a support chat! 🎮",
        emotion: 'neutral'
    },
    {
        triggers: ['help', 'support', 'issue', 'problem', 'contact'],
        text: "I'm here to help! If your issue needs a real person, go to Sidebar → 'Live Support Chat' to talk to a Moderator directly 💬 What's the issue?",
        emotion: 'neutral'
    },
    {
        triggers: ['slot', 'full', 'available'],
        text: "Slots fill up fast! 🚀 If a tournament says 'Full', watch for next round announcements. Follow scrims for quick daily slots with less competition!",
        emotion: 'surprised'
    },
    {
        triggers: ['thank', 'thanks', 'ty', 'thx'],
        text: "Always happy to help, Champion! 🏅 Good luck in your next match. If you need anything else, I'm right here!",
        emotion: 'happy'
    },
    {
        triggers: ['bye', 'goodbye', 'cya', 'later'],
        text: "Good luck out there, Legend! 🔥 Come back when you need anything. Drop rate be ever in your favor! 👋",
        emotion: 'happy'
    }
];

const FALLBACK_RESPONSES = [
    "Hmm, I'm not sure about that one! 🤔 Try asking about tournaments, registration, games, or prizes. Or reach out to a Moderator via Live Support Chat!",
    "I'm still learning! 🌱 For this one, I'd suggest opening a Live Support Chat so a real Moderator can help you.",
    "Good question! I don't have that answer yet 😅 But you can reach our support team from the Sidebar → Live Support Chat!",
    "That's beyond my knowledge right now 🤖 A human Moderator will know better — they're just a chat away!"
];

const getAikoReply = (userText: string): { text: string; emotion: string } => {
    const lower = userText.toLowerCase();
    const match = AIKO_RESPONSES.find(r => r.triggers.some(t => lower.includes(t)));
    if (match) return { text: match.text, emotion: match.emotion };
    return {
        text: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
        emotion: 'neutral'
    };
};

const EMOTION_EMOJI: Record<string, string> = {
    excited: '🌟', happy: '😊', curious: '🤔', neutral: '💬',
    surprised: '😮', angry: '⚡', sad: '💙'
};

const STORAGE_KEY = 'zerox_aiko_history';

const WELCOME_MSG: LocalMsg = {
    id: 'welcome',
    role: 'aiko',
    text: "Hey! I'm Aiko, your Zerox eSports AI 🎮 Ask me anything about tournaments, registration, games, or just say hi!",
    timestamp: Date.now(),
    emotion: 'happy'
};

export const AikoChat: React.FC<{ userId?: string; onClose?: () => void }> = ({ userId, onClose }) => {
    const [messages, setMessages] = useState<LocalMsg[]>([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // ── Firebase subscription (logged-in) or localStorage (guest) ──
    useEffect(() => {
        if (userId) {
            const unsub = subscribeToAikoMessages(userId, (msgs) => {
                setMessages(msgs.length > 0 ? msgs : [WELCOME_MSG]);
            });
            return unsub;
        }
        // Guest: load from localStorage
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: LocalMsg[] = JSON.parse(raw);
                if (parsed.length > 0) setMessages(parsed);
            }
        } catch { }
    }, [userId]);

    // Persist to localStorage for guests
    useEffect(() => {
        if (!userId) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { }
        }
    }, [messages, userId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const trimmed = input.trim();
        if (!trimmed || typing) return;

        const userMsg: LocalMsg = {
            id: Date.now().toString(),
            role: 'user',
            text: trimmed,
            timestamp: Date.now()
        };

        // Optimistic UI update
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setTyping(true);

        // Save user message to Firebase (if logged in)
        if (userId) {
            saveAikoMessage(userId, { role: 'user', text: trimmed, timestamp: userMsg.timestamp }).catch(() => { });
        }

        // Simulate thinking delay
        await new Promise(r => setTimeout(r, 700 + Math.random() * 800));

        const reply = getAikoReply(trimmed);
        const aiMsg: LocalMsg = {
            id: (Date.now() + 1).toString(),
            role: 'aiko',
            text: reply.text,
            timestamp: Date.now(),
            emotion: reply.emotion
        };
        setMessages(prev => [...prev, aiMsg]);
        setTyping(false);

        // Save Aiko reply to Firebase (if logged in)
        if (userId) {
            saveAikoMessage(userId, { role: 'aiko', text: reply.text, timestamp: aiMsg.timestamp, emotion: reply.emotion }).catch(() => { });
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Aiko Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-primary/10 to-purple-900/10 shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-primary/40">
                    <span className="text-lg">🤖</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Aiko</p>
                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                        AI Assistant · Always online
                    </p>
                </div>
                <Sparkles size={14} className="text-primary animate-pulse" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'aiko' && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs mr-2 shrink-0 mt-1">
                                🤖
                            </div>
                        )}
                        <div className={`max-w-[78%] rounded-2xl px-3 py-2.5 ${msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-gradient-to-br from-white/10 to-purple-900/20 border border-purple-500/20 text-white rounded-bl-sm'
                            }`}>
                            <p className="text-xs leading-relaxed">{msg.text}</p>
                            <p className="text-[9px] opacity-50 mt-1 text-right">
                                {msg.role === 'aiko' && msg.emotion && (
                                    <span className="mr-1">{EMOTION_EMOJI[msg.emotion] || '💬'}</span>
                                )}
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs shrink-0">🤖</div>
                        <div className="bg-white/10 border border-purple-500/20 rounded-2xl rounded-bl-sm px-3 py-2.5">
                            <div className="flex gap-1 items-center h-4">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            <div className="px-4 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                {['Tournaments 🏆', 'Register', 'Prize Pool 💰', 'How to play?'].map(q => (
                    <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-primary/20 hover:border-primary/40 hover:text-white transition-all whitespace-nowrap shrink-0"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/10 bg-black/20 flex items-end gap-2 shrink-0">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Ask Aiko anything..."
                    rows={1}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 resize-none scrollbar-hide"
                />
                <button
                    onClick={send}
                    disabled={!input.trim() || typing}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white disabled:opacity-40 transition-all shadow-lg shadow-primary/20 shrink-0"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};
