import React, { useState } from 'react';
import { X, Send, Film, Tv, MessageSquarePlus } from 'lucide-react';
import { Button } from './Button';
import { submitRequest } from '../services/requestService';
import { User } from '../types';
import { toast } from 'sonner';

interface RequestContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export const RequestContentModal: React.FC<RequestContentModalProps> = ({ isOpen, onClose, user }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'series' | 'movie'>('series');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            // Append type to note for admin context
            const finalNote = `[${type.toUpperCase()}] ${note}`;
            await submitRequest(user.uid, user.displayName || user.email, title, finalNote);
            toast.success("Request Submitted!", { description: "We'll try our best to add it." });
            onClose();
            setTitle('');
            setNote('');
        } catch (error) {
            toast.error("Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="p-8 pb-0 text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                        <MessageSquarePlus size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 font-display">Request Content</h2>
                    <p className="text-gray-400 text-sm">Can't find what you're looking for?<br />Tell us, and we'll add it to our library.</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Content Type Toggle */}
                    <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setType('series')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'series'
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Tv size={16} /> Series
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('movie')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'movie'
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Film size={16} /> Movie
                        </button>
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-2 font-bold tracking-wider">
                            Content Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-all"
                            placeholder="e.g. Stranger Things, Inception..."
                            autoFocus
                            required
                        />
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-2 font-bold tracking-wider">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-primary focus:outline-none min-h-[100px] resize-none transition-all"
                            placeholder="Specific season, dub/sub preference, etc."
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmitting}
                        className="w-full py-4 text-base shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] transition-all"
                    >
                        <Send size={18} className="mr-2" />
                        Submit Request
                    </Button>
                </form>
            </div>
        </div>
    );
};
