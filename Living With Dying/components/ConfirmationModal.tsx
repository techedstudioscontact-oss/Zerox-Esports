import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirm", isDangerous = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface border border-white/10 shadow-2xl border-t-accent/20">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
        >
            <X className="h-5 w-5" />
        </button>
        
        <div className="p-8 text-center">
            {/* Icon */}
            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${isDangerous ? 'bg-red-900/30 border border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-purple-900/30 border border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'}`}>
                <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h3 className="mb-3 text-2xl font-display font-bold text-white">{title}</h3>
            <div className="mb-8 text-gray-400 leading-relaxed text-sm">{message}</div>
            
            <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={onClose} className="w-full">Cancel</Button>
                <Button variant={isDangerous ? "danger" : "primary"} onClick={onConfirm} className="w-full font-bold tracking-wide">
                    {confirmLabel}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
