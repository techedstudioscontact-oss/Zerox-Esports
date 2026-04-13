import React, { useState, useEffect } from 'react';
import { Tournament, User, PlayerInput } from '../types';
import { registerForTournament } from '../services/registrationService';
import { getTeammatesProfiles } from '../services/teamService';
import { toast } from 'sonner';
import { X, CheckCircle, ShieldAlert } from 'lucide-react';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    user: User;
    onSuccess: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, tournament, user, onSuccess }) => {
    const entryFee = tournament.entryFee || 0;
    const teamSize = tournament.teamSize || 'solo';
    const isTeam = teamSize !== 'solo' && teamSize !== 'open'; // simplify for now, 'open' is tricky, assume team if not solo strictly

    const [step, setStep] = useState<1 | 2>(1);
    const [teamName, setTeamName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    // Initialize Player 1 with the current user's details
    const [players, setPlayers] = useState<PlayerInput[]>([
        { ign: user.ign || '', characterId: user.characterId || '', appUid: user.appUid }
    ]);
    const [teammates, setTeammates] = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine how many player inputs we need
    const maxPlayers = teamSize === 'duo' ? 2 : teamSize === 'squad' ? 4 : teamSize === '6man' ? 6 : 1;

    // Fetch teammates when modal opens
    useEffect(() => {
        if (isOpen && user.teamMembers && user.teamMembers.length > 0 && isTeam) {
            getTeammatesProfiles(user.teamMembers).then(profiles => {
                setTeammates(profiles);
            }).catch(err => {
                console.error("Error loading teammates:", err);
            });
        }
    }, [isOpen, user.teamMembers, isTeam]);

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setTeamName('');
            setContactNumber('');
            setPlayers([{ ign: user.ign || '', characterId: user.characterId || '', appUid: user.appUid }]);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleNext = () => {
        // Validation
        if (isTeam && !teamName) return toast.error("Team Name is required.");
        if (!contactNumber) return toast.error("Contact number is required.");
        for (let i = 0; i < players.length; i++) {
            if (!players[i].ign || !players[i].characterId) {
                return toast.error("All player Details are required.");
            }
        }
        setStep(2);
    };

    const handlePlayerChange = (index: number, field: keyof PlayerInput, value: string) => {
        const newPlayers = [...players];
        if (!newPlayers[index]) newPlayers[index] = { ign: '', characterId: '' };
        newPlayers[index][field] = value;
        setPlayers(newPlayers);
    };

    const handleSelectTeammate = (index: number, teammateUid: string) => {
        if (!teammateUid) {
            // Clear if unselected
            const newPlayers = [...players];
            newPlayers[index] = { ign: '', characterId: '', appUid: '' };
            setPlayers(newPlayers);
            return;
        }

        const tm = teammates.find(t => t.uid === teammateUid);
        if (tm) {
            const newPlayers = [...players];
            newPlayers[index] = {
                ign: tm.ign || '',
                characterId: tm.characterId || '',
                appUid: tm.appUid || ''
            };
            setPlayers(newPlayers);
        }
    };

    const handleAddPlayer = () => {
        if (players.length < maxPlayers || maxPlayers === 1 /* open */) {
            setPlayers([...players, { ign: '', characterId: '' }]);
        }
    };

    const handleRegister = async () => {
        setIsSubmitting(true);
        try {
            await registerForTournament({
                tournamentId: tournament.id,
                userId: user.uid,
                userEmail: user.email,
                teamName: isTeam ? teamName : undefined,
                players: players.filter(p => p.ign && p.characterId), // filter empty rows
                contactNumber
            }, entryFee);

            toast.success("Registration Successful!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Registration failed. Do you have enough coins?");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl relative">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 sticky top-0 z-10">
                    <h3 className="text-xl font-display font-bold text-white tracking-widest">{tournament.title} Registration</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4 animate-slide-up">
                            {isTeam && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Team Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none"
                                        placeholder="e.g. Team Liquid"
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Number (WhatsApp)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none"
                                    placeholder="+91 99999 99999"
                                    value={contactNumber}
                                    onChange={e => setContactNumber(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-end">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Player Details</label>
                                    <span className="text-[10px] text-gray-500">{players.length} / {maxPlayers === 1 ? '∞' : maxPlayers} Players</span>
                                </div>
                                {players.map((player, idx) => (
                                    <div key={idx} className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/5">
                                        <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                                            <span>Player {idx + 1} {idx === 0 ? '(You)' : ''}</span>
                                        </div>
                                        {idx > 0 && teammates.length > 0 && (
                                            <select
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none mb-1"
                                                onChange={(e) => handleSelectTeammate(idx, e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="">-- Select Teammate to Auto-fill --</option>
                                                {teammates.map(tm => (
                                                    <option key={tm.uid} value={tm.uid}>
                                                        {tm.displayName || 'Unknown'} (IGN: {tm.ign || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none"
                                                placeholder="In-Game Name (IGN)"
                                                value={player.ign}
                                                onChange={e => handlePlayerChange(idx, 'ign', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none"
                                                placeholder="Character ID"
                                                value={player.characterId}
                                                onChange={e => handlePlayerChange(idx, 'characterId', e.target.value)}
                                            />
                                        </div>
                                        {player.appUid && (
                                            <div className="text-[10px] text-primary flex items-center gap-1">
                                                <CheckCircle size={10} /> App UID Linked: {player.appUid}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {players.length < maxPlayers && (
                                    <button
                                        onClick={handleAddPlayer}
                                        className="text-xs text-primary font-bold uppercase tracking-widest hover:text-primary-hover w-full text-left mt-2 block"
                                    >
                                        + Add Another Player
                                    </button>
                                )}
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={handleNext}
                                    className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest uppercase transition-all"
                                >
                                    Review & Pay
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-slide-left text-center">

                            <div className="bg-black/40 border border-white/10 p-6 rounded-xl">
                                <h4 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Entry Fee</h4>
                                <div className="flex justify-center items-end gap-2 text-yellow-500">
                                    <span className="text-5xl font-black">{entryFee}</span>
                                    <span className="text-xl pb-1 font-bold">Coins</span>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Your Current Balance:</span>
                                    <span className={`font-bold ${((user.coins || 0) >= entryFee) ? 'text-green-400' : 'text-red-400 flex items-center gap-1'}`}>
                                        {user.coins || 0} Coins
                                        {((user.coins || 0) < entryFee) && <ShieldAlert size={14} />}
                                    </span>
                                </div>
                            </div>

                            {((user.coins || 0) < entryFee) ? (
                                <div className="text-red-400 text-sm p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
                                    Insufficient balance. Please add coins to your wallet to register for this tournament.
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">
                                    By clicking register, {entryFee} coins will be instantly deducted from your balance.
                                </p>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold tracking-widest uppercase transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleRegister}
                                    disabled={isSubmitting || (user.coins || 0) < entryFee}
                                    className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-bold tracking-widest uppercase transition-all
                                        ${isSubmitting || (user.coins || 0) < entryFee
                                            ? 'bg-primary/50 text-white/50 cursor-not-allowed'
                                            : 'bg-primary hover:bg-primary-hover text-black shadow-[0_0_20px_rgba(205,255,0,0.3)] hover:shadow-[0_0_30px_rgba(205,255,0,0.5)]'
                                        }`}
                                >
                                    {isSubmitting ? 'Registering...' : (
                                        <>
                                            <CheckCircle size={18} /> Confirm Registration
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
