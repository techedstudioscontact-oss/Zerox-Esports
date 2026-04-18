import React, { useState, useEffect } from 'react';
import { Tournament, Registration } from '../types';
import { ShieldAlert, Users } from 'lucide-react';
import { Button } from './Button';
import { subscribeToTournamentRegistrations } from '../services/registrationService';

interface TournamentCardProps {
  content: Tournament;
  isUnlocked: boolean;
  onClick: () => void;
}

// ── Countdown helper ──────────────────────────────────────────────
function useCountdown(startDateStr?: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!startDateStr) { setRemaining(''); return; }
    const target = new Date(startDateStr).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Started'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${d}Days  ${h}Hr  ${m}Min`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [startDateStr]);

  return remaining;
}

// ── Format date for display ────────────────────────────────────────
function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' | ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  } catch { return dateStr; }
}

// ── Avatar initials from email ──────────────────────────────────────
function getInitials(email: string) {
  return email ? email[0].toUpperCase() : '?';
}

// ── Avatar color from email (deterministic) ──────────────────────
const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500',
];
function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ content, isUnlocked, onClick }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const countdown = useCountdown(content.startDate);
  const formattedDate = formatDate(content.startDate);

  // ── Live registration count ──────────────────────────────────────
  useEffect(() => {
    if (!content.id) return;
    const unsub = subscribeToTournamentRegistrations(content.id, (regs) => {
      setRegistrations(regs);
    });
    return unsub;
  }, [content.id]);

  const maxSlots = content.maxSlots ?? 200;
  const slotsUsed = registrations.length;
  const spotsLeft = Math.max(0, maxSlots - slotsUsed);
  const slotPct = maxSlots > 0 ? Math.min((slotsUsed / maxSlots) * 100, 100) : 0;

  const handleCardClick = () => {
    if (content.tags.includes('18+')) {
      setShowWarning(true);
    } else {
      onClick();
    }
  };

  const confirmEnter = () => {
    setShowWarning(false);
    onClick();
  };

  const isUpcoming = content.status === 'upcoming' || content.status === 'published';
  const isOngoing  = content.status === 'ongoing';
  const isDone     = content.status === 'completed';

  // Show up to 5 avatars + overflow count
  const visibleRegs  = registrations.slice(0, 5);
  const overflowCount = Math.max(0, slotsUsed - 5);

  return (
    <>
      <div
        className="relative w-full rounded-xl overflow-hidden border border-white/5 bg-[#121215] shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(255,50,50,0.15)] hover:border-red-500/30 transition-all duration-300 transform hover:-translate-y-1 group"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Banner Image ──────────────────────────────────────── */}
        <div className="relative h-36 w-full bg-black overflow-hidden">
          {content.thumbnailUrl ? (
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-black flex items-center justify-center">
              <span className="font-black text-white/10 text-6xl italic transform -skew-x-12">{content.title?.[0]}</span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {isOngoing && <span className="px-2 py-1 bg-green-500/90 text-white text-[10px] font-black rounded-sm tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.5)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</span>}
            {isUpcoming && <span className="px-2 py-1 bg-blue-600/90 text-white text-[10px] font-black uppercase rounded-sm border border-blue-400/50 shadow-lg">Upcoming</span>}
            {isDone && <span className="px-2 py-1 bg-orange-600/90 text-white text-[10px] font-black uppercase rounded-sm shadow-lg">Results</span>}
          </div>

          {/* Floating Tags Overlay */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {content.teamSize && <span className="px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase text-white bg-black/60 border border-white/10 backdrop-blur-md">{content.teamSize}</span>}
            {content.map && <span className="px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase text-white bg-black/60 border border-white/10 backdrop-blur-md">{content.map}</span>}
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 z-10 relative bg-gradient-to-b from-[#121215] to-transparent">
          {countdown && countdown !== 'Started' && (
             <p className="text-[10px] text-orange-500 font-bold mb-1 tracking-widest uppercase flex items-center gap-1">
               <span className="w-1 h-1 bg-orange-500 rounded-full" /> Starts in: {countdown}
             </p>
          )}
          {countdown === 'Started' && (
             <p className="text-[10px] text-green-500 font-bold mb-1 tracking-widest uppercase flex items-center gap-1">
               <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Matches Underway
             </p>
          )}
          <h3 className="text-lg font-black text-white leading-tight line-clamp-1 truncate transition-colors group-hover:text-primary">
            {content.title}
          </h3>
        </div>

        {/* ── Meta row: Prize | Per Kill | Date ─────────────────── */}
        <div className="px-4 py-3 bg-white/[0.02] border-y border-white/5 flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Prize Pool</span>
             <span className="text-white font-black text-sm">{content.prizePool ? `₹${content.prizePool}` : '₹0'}</span>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="flex flex-col items-center">
             <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Per Kill</span>
             <span className="text-green-500 font-black text-sm">₹0</span>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="flex flex-col text-right">
             <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Date</span>
             <span className="text-gray-300 font-bold text-xs">{formattedDate?.split('|')[0]?.trim() || 'TBA'}</span>
           </div>
        </div>

        {/* ── Players & Slot Progress ─────────────────────────────── */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center -space-x-1.5">
               {slotsUsed === 0 ? (
                 <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><Users size={12} className="text-gray-600"/> Be the first!</span>
               ) : (
                 <>
                   {visibleRegs.map((reg, i) => (
                     <div key={reg.id} title={reg.userEmail} className={`w-6 h-6 rounded-full border border-[#121215] flex items-center justify-center text-[9px] font-black text-white ${getAvatarColor(reg.userEmail)} z-${10 - i}`}>
                       {getInitials(reg.userEmail)}
                     </div>
                   ))}
                   {overflowCount > 0 && (
                     <div className="w-6 h-6 rounded-full border border-[#121215] bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-300">
                       +{overflowCount}
                     </div>
                   )}
                 </>
               )}
             </div>
             <div className="text-right">
               <span className="text-[11px] font-black text-white leading-none block">{slotsUsed}/{maxSlots} Joined</span>
               <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wide">{spotsLeft} Spots Left</span>
             </div>
          </div>
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-orange-600 to-primary rounded-full shadow-[0_0_10px_rgba(235,27,36,0.5)]" style={{ width: `${slotPct}%` }} />
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-1 flex gap-2">
           <button onClick={handleCardClick} className="flex-[3] py-2.5 rounded bg-gradient-to-r from-primary to-orange-600 text-white text-[11px] font-black tracking-widest uppercase hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(235,27,36,0.3)]">
             {isDone ? 'Results' : content.entryFee ? `Pay ₹${content.entryFee} & Join` : 'Free Join'}
           </button>
           <button onClick={handleCardClick} className="flex-[2] py-2.5 rounded bg-white/5 border border-white/10 text-gray-300 text-[11px] font-black tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors">
             Details
           </button>
        </div>
      </div>

      {/* ── 18+ Warning Modal ────────────────────────────────────── */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWarning(false)} />
          <div className="relative max-w-sm w-full bg-[#1a1a1a] border border-yellow-500/30 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] mx-4">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
              <ShieldAlert className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Content Warning</h2>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              This content contains mature themes (<span className="text-yellow-500 font-bold">18+</span>).<br />
              Viewer discretion is advised.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowWarning(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={confirmEnter}>Continue</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
