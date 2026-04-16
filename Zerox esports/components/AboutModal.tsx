import React, { useEffect, useState } from 'react';
import { X, Globe, Facebook, Twitter, Instagram, MessageCircle, Send } from 'lucide-react'; // Using Lucide icons
import { subscribeToSystemSettings, SystemSettings } from '../services/systemService';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);

    useEffect(() => {
        if (isOpen) {
            const unsubscribe = subscribeToSystemSettings((data) => {
                setSettings(data);
            });
            return () => unsubscribe();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = (platform: string) => {
        switch (platform) {
            case 'facebook': return <Facebook className="w-5 h-5" />;
            case 'twitter': return <Twitter className="w-5 h-5" />;
            case 'instagram': return <Instagram className="w-5 h-5" />;
            case 'discord': return <MessageCircle className="w-5 h-5" />;
            case 'telegram': return <Send className="w-5 h-5" />;
            default: return <Globe className="w-5 h-5" />;
        }
    };

    const getLabel = (platform: string) => {
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-grade-in">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
                        <h3 className="font-bold text-xl text-white tracking-wide">About Zerox eSports</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Dynamic Text */}
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                            {settings?.aboutText || "Loading info..."}
                        </p>
                    </div>

                    {/* Social Links */}
                    {settings?.socialLinks && Object.keys(settings.socialLinks).length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Connect With Us</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(settings.socialLinks).map(([platform, url]) => {
                                    if (!url) return null;
                                    return (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group"
                                        >
                                            <div className="text-gray-400 group-hover:text-primary transition-colors">
                                                {getIcon(platform)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-200 group-hover:text-white">{getLabel(platform)}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legal Links */}
                    <div className="flex justify-center gap-6 mt-6 pt-6 border-t border-white/5">
                        {settings?.privacyPolicyUrl && (
                            <a href={settings.privacyPolicyUrl} target="_blank" className="text-xs text-gray-500 hover:text-white underline">Privacy Policy</a>
                        )}
                        {settings?.termsUrl && (
                            <a href={settings.termsUrl} target="_blank" className="text-xs text-gray-500 hover:text-white underline">Terms of Service</a>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                            Zerox eSports v1.0 // eSports Platform
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
