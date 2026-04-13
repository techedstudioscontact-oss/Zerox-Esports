import React from 'react';
import { X, Bug, User, Smartphone, Calendar } from 'lucide-react';
import { BugReport } from '../types';

interface ViewBugModalProps {
    bug: BugReport | null;
    onClose: () => void;
}

export const ViewBugModal: React.FC<ViewBugModalProps> = ({ bug, onClose }) => {
    if (!bug) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
                            <Bug size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Anomaly Report</h3>
                            <div className="text-[10px] font-mono text-gray-500">{bug.id}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase border ${bug.status === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'}`}>
                            Status: {bug.status}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                            <Calendar size={12} />
                            {bug.createdAt?.seconds ? new Date(bug.createdAt.seconds * 1000).toLocaleString() : 'Date Unknown'}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h4 className="text-xs uppercase text-gray-500 font-bold mb-2">Description</h4>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                            {bug.description}
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                            <h4 className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-2">
                                <User size={12} /> Reporter
                            </h4>
                            <div className="text-sm font-bold text-white">{bug.userEmail}</div>
                            <div className="text-xs text-gray-500 font-mono">{bug.userId}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <h4 className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-2">
                                <Smartphone size={12} /> Device Info
                            </h4>
                            <div className="text-xs font-mono text-gray-300 break-all">
                                {bug.deviceInfo}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
