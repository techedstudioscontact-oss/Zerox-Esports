import React, { useState } from 'react';
import { X, Bug, Send } from 'lucide-react';
import { Button } from './Button'; // Assuming you have a reusable Button component
import { submitBugReport } from '../services/bugReportService';
import { User } from '../types';
import { toast } from 'sonner';

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, user }) => {
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            toast.error("Please describe the issue.");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitBugReport(description, user);
            toast.success("Report transmitted to HQ directly!");
            setDescription('');
            onClose();
        } catch (error) {
            toast.error("Failed to send report. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#1a1a1e] border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden animate-scale-in">

                {/* Decorative Header */}
                <div className="bg-gradient-to-r from-red-900/50 to-purple-900/50 p-6 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Bug size={80} className="text-red-500" />
                    </div>

                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2 relative z-10">
                        <Bug className="text-red-500" /> System Glitch?
                    </h2>
                    <p className="text-xs font-mono text-red-300 mt-1 relative z-10 tracking-widest">
                        ERROR_REPORTING_MODULE_V1
                    </p>
                </div>

                <div className="p-6">
                    {/* Apology Message */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                        <p className="text-gray-300 text-sm italic leading-relaxed">
                            "We are truly sorry that you are facing this problem. Our engineering team will terminate this bug immediately."
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-2 font-bold tracking-wider">
                                Describe the Anomaly
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-red-500 focus:outline-none min-h-[120px] resize-none transition-all"
                                placeholder="What went wrong? e.g., Video froze at 10:05..."
                                autoFocus
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                variant="danger" // Using danger variant for visual distinctiveness (red)
                                isLoading={isSubmitting}
                                className="flex-1 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
                            >
                                <Send size={16} className="mr-2" />
                                Submit Report
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
