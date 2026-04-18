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
        onClick={handleCardClick}
        className="relative w-full rounded-[32px] overflow-hidden border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_60px_rgba(255,59,48,0.15)] hover:border-primary/40 transition-all duration-500 transform hover:-translate-y-2 group cursor-pointer"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Banner Image ──────────────────────────────────────── */}
        <div className="relative h-48 w-full bg-[#050505] overflow-hidden">
          {content.thumbnailUrl ? (
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-black to-black flex items-center justify-center">
              <span className="font-black text-white/5 text-8xl italic transform -skew-x-12 select-none tracking-tighter">{content.title?.[0]}</span>
            </div>
          )}
          
          {/* Overlay Gradient for Image readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

          {/* Status Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isOngoing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                <span className="text-[10px] font-black tracking-[0.1em] text-white uppercase italic">Live Now</span>
              </div>
            )}
            {isUpcoming && <span className="px-3 py-1.5 bg-blue-500/10 backdrop-blur-md border border-blue-500/30 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-xl">Scheduled</span>}
            {isDone && <span className="px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase rounded-full tracking-widest">Concluded</span>}
          </div>

          {/* Floating Tags Overlay */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {content.teamSize && <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg">{content.teamSize}</span>}
            {content.map && <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase text-[rgba(0,210,255,1)] bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 shadow-lg">{content.map}</span>}
          </div>
        </div>

        {/* ── Info Container ─────────────────────────────────────────── */}
        <div className="relative p-6">
          {/* Title and Countdown */}
          <div className="mb-4">
            {countdown && countdown !== 'Started' && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-orange-500 rounded-full animate-pulse" />
                  <span className="w-1 h-3 bg-orange-500/50 rounded-full animate-pulse delay-75" />
                </div>
                <span className="text-[10px] text-orange-400 font-black tracking-[0.2em] uppercase">Connect in {countdown}</span>
              </div>
            )}
            <h3 className="text-xl font-black text-white leading-tight tracking-tight group-hover:text-glow-primary transition-all duration-300">
              {content.title}
            </h3>
          </div>

          {/* ── Stats Grid: Prize & Kill ─────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
               <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block mb-1">Prize Pool</span>
               <span className="text-white font-black text-lg text-glow tracking-tighter italic">
                 {content.prizePool ? `₹${content.prizePool}` : '₹0'}
               </span>
             </div>
             <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
               <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block mb-1">Entry Fee</span>
               <span className="text-green-400 font-black text-lg tracking-tighter italic">
                 {content.entryFee ? `₹${content.entryFee}` : 'Free'}
               </span>
             </div>
          </div>

          {/* ── Footer Row: Players & Action ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center -space-x-2">
                 {slotsUsed === 0 ? (
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] flex items-center gap-2"><Users size={12} /> Be the first</span>
                 ) : (
                   <>
                     {visibleRegs.map((reg, i) => (
                       <div key={reg.id} title={reg.userEmail} className={`w-8 h-8 rounded-full border-2 border-[#121215] flex items-center justify-center text-[10px] font-black text-white ${getAvatarColor(reg.userEmail)} z-${10 - i} shadow-lg shadow-black/40`}>
                         {getInitials(reg.userEmail)}
                       </div>
                     ))}
                     {overflowCount > 0 && (
                       <div className="w-8 h-8 rounded-full border-2 border-[#121215] bg-surfaceHighlight flex items-center justify-center text-[9px] font-black text-white z-0 shadow-lg">
                         +{overflowCount}
                       </div>
                     )}
                   </>
                 )}
               </div>
               <div className="text-right">
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.1em] block mb-0.5">{slotsUsed}/{maxSlots} Registered</span>
                 <span className="text-xs text-orange-400 font-black tracking-widest uppercase italic">{spotsLeft} Spots left</span>
               </div>
            </div>

            {/* Progress Bar (Glow Style) */}
            <div className="relative h-2 bg-black/40 rounded-full overflow-hidden border border-white/[0.05]">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 to-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(235,27,36,0.6)]" style={{ width: `${slotPct}%` }} />
            </div>

            {/* Quick Button */}
            <button 
              className="w-full py-4 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white text-[11px] font-black tracking-[0.3em] uppercase hover:bg-primary hover:border-primary transition-all duration-300 shadow-xl group/btn overflow-hidden relative"
            >
              <span className="relative z-10">{isDone ? 'View Results' : 'Join Arena'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            </button>
          </div>
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
