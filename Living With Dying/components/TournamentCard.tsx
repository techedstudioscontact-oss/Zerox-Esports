import React, { useState, useEffect } from 'react';
import { Tournament } from '../types';
import { ShieldAlert } from 'lucide-react';
import { getSessionUser, toggleSavedTournament } from '../services/authService';
import { Button } from './Button';

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

export const TournamentCard: React.FC<TournamentCardProps> = ({ content, isUnlocked, onClick }) => {
  const user = getSessionUser();
  const [showWarning, setShowWarning] = useState(false);

  const countdown = useCountdown(content.startDate);
  const formattedDate = formatDate(content.startDate);

  // Slot info
  const maxSlots = content.maxSlots ?? 200;
  // We don't have a real "joined" count server-side here, so show 0 by default
  // (In a real integration you'd pass registeredCount as a prop)
  const spotsLeft = maxSlots;
  const slotsUsed = 0;
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

  // Determine which status badge to show
  const isUpcoming = content.status === 'upcoming' || content.status === 'published';
  const isOngoing = content.status === 'ongoing';
  const isDone = content.status === 'completed';

  return (
    <>
      {/* ── Card shell ──────────────────────────────────────────── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white shadow-lg"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Status tab at top */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          {isOngoing && (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              LIVE
            </span>
          )}
          {isUpcoming && (
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              ↑ UPCOMING
            </span>
          )}
          {isDone && (
            <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
              ○ RESULTS
            </span>
          )}
        </div>

        {/* ── Tag row ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-1">
          {/* Team size */}
          {content.teamSize && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#4A9EFF]">
              {content.teamSize}
            </span>
          )}
          {/* Map */}
          {content.map && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#4A9EFF]">
              {content.map}
            </span>
          )}
          {/* Countdown segments */}
          {countdown && countdown !== 'Started' && countdown.split('  ').map((part, i) => (
            <span key={i} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white
              ${i === 0 ? 'bg-[#F5A623]' : i === 1 ? 'bg-[#F5A623]' : 'bg-[#F5A623]'}`}>
              {part.trim()}
            </span>
          ))}
          {countdown === 'Started' && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-green-500">
              Live Now
            </span>
          )}
        </div>

        {/* ── Tournament Name ─────────────────────────────────────── */}
        <div className="px-4 pt-1 pb-2">
          <h3 className="text-[15px] font-black text-gray-900 leading-snug line-clamp-2">
            {content.title}
          </h3>
        </div>

        {/* ── Meta row: Date | Prize Pool | Per Kill ─────────────── */}
        <div className="px-4 pb-3 flex items-start gap-4 text-[11px]">
          {formattedDate && (
            <div className="flex flex-col">
              <span className="text-gray-400 font-medium">{formattedDate.split('|')[0]?.trim()}</span>
              <span className="text-gray-500 font-medium">| {formattedDate.split('|')[1]?.trim()}</span>
            </div>
          )}
          <div className="flex flex-col items-start ml-auto gap-0.5">
            <span className="text-gray-400 font-medium">Price Pool</span>
            <span className="text-gray-900 font-black text-sm">
              {content.prizePool ? `₹${content.prizePool}` : '₹0'}
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-green-600 font-bold text-[11px]">Per Kill ₹0</span>
          </div>
        </div>

        {/* ── Slot progress bar ────────────────────────────────────── */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-orange-500">
              ({slotsUsed}/{maxSlots})&nbsp;Only {spotsLeft} Sports Left
            </span>
            <span
              onClick={handleCardClick}
              className="px-3 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold cursor-pointer hover:bg-green-600 transition-colors"
            >
              {content.entryFee && content.entryFee > 0 ? `₹${content.entryFee} Join` : 'Free Join'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${slotPct}%` }}
            />
          </div>
        </div>

        {/* ── Action buttons ───────────────────────────────────────── */}
        <div className="px-4 pb-4 flex gap-2">
          {isDone ? (
            <button
              onClick={handleCardClick}
              className="flex-1 py-2 rounded-lg bg-[#E53935] text-white text-xs font-bold tracking-wide hover:bg-red-700 transition-colors"
            >
              Resultus
            </button>
          ) : (
            <button
              onClick={handleCardClick}
              className="flex-1 py-2 rounded-lg bg-[#E53935] text-white text-xs font-bold tracking-wide hover:bg-red-700 transition-colors"
            >
              {content.entryFee && content.entryFee > 0 ? `Pay ₹${content.entryFee} & Join` : 'Free Join'}
            </button>
          )}
          <button
            onClick={handleCardClick}
            className="flex-1 py-2 rounded-lg bg-[#1C2340] text-white text-xs font-bold tracking-wide hover:bg-[#2a3360] transition-colors"
          >
            Id &amp; Password
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
