import React, { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { Button } from './Button';

interface CommentSectionProps {
    contentId: string;
    user: User | null;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: any;
    contentId: string;
}

export function CommentSection({ contentId, user }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!contentId) return;

        const q = query(
            collection(db, 'comments'),
            where('contentId', '==', contentId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            setComments(loadedComments);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            // Don't show toast on fetch error to avoid spam, just log
            setLoading(false);
        });

        return () => unsubscribe();
    }, [contentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("You must be logged in to comment.");
            return;
        }
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'comments'), {
                contentId,
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                text: newComment.trim(),
                createdAt: serverTimestamp()
            });
            setNewComment('');
            toast.success('Comment posted!');
        } catch (error) {
            console.error("Error posting comment:", error);
            toast.error(`Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-12 border-t border-white/10 pt-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageSquare className="text-primary" size={24} />
                Community Discussion <span className="text-gray-500 text-sm font-normal">({comments.length})</span>
            </h3>

            {/* Comment Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="mb-8 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shrink-0 text-white font-bold">
                        {user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts..."
                            className="w-full bg-surfaceHighlight/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 focus:bg-surfaceHighlight transition-all min-h-[100px]"
                        />
                        <div className="flex justify-end mt-2">
                            <Button type="submit" size="sm" isLoading={submitting} disabled={!newComment.trim()}>
                                <Send size={16} className="mr-2" /> Post Comment
                            </Button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="bg-white/5 rounded-xl p-6 text-center mb-8 border border-white/5">
                    <p className="text-gray-400 mb-4">Join the conversation</p>
                    <Button variant="secondary" onClick={() => window.location.hash = '#/login'}>
                        Log in to comment
                    </Button>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Loading thoughts...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-gray-600 py-10 italic">Be the first to share your thoughts.</div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-4 animate-fade-in group">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-gray-300 font-bold border border-white/5">
                                {comment.userName[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-baseline justify-between mb-1">
                                    <h4 className="font-bold text-gray-200 group-hover:text-primary transition-colors">{comment.userName}</h4>
                                    <span className="text-xs text-gray-600 font-mono">
                                        {/* Simple relative time logic or just date */}
                                        {comment.createdAt ? (
                                            typeof comment.createdAt === 'object' && 'seconds' in (comment.createdAt as any)
                                                ? new Date((comment.createdAt as any).seconds * 1000).toLocaleDateString()
                                                : 'Just now'
                                        ) : 'Just now'}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">{comment.text}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default CommentSection;
