import React, { useState, useEffect } from 'react';
import { Tournament, Registration } from '../types';
import { getRegistrationsForTournament } from '../services/registrationService';
import { Users, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

interface RegistrationsManagerProps {
    userContent: Tournament[];
}

export const RegistrationsManager: React.FC<RegistrationsManagerProps> = ({ userContent }) => {
    const [selectedTournament, setSelectedTournament] = useState<string>('');
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedTournament) {
            setRegistrations([]);
            return;
        }

        const fetchRegistrations = async () => {
            setIsLoading(true);
            try {
                const data = await getRegistrationsForTournament(selectedTournament);
                setRegistrations(data);
            } catch (error) {
                console.error("Failed to load registrations", error);
                toast.error("Failed to load registrations.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRegistrations();
    }, [selectedTournament]);

    const handleExport = () => {
        if (registrations.length === 0) return toast.info("No registrations to export.");

        const headers = ['Team Name', 'Contact Number', 'Registered At', 'Entry Fee Paid', 'Player IGNs', 'Player IDs', 'App UIDs'];
        const csvRows = [headers.join(',')];

        registrations.forEach(r => {
            const date = new Date(r.registeredAt).toLocaleString().replace(/,/g, '');
            const igns = r.players.map(p => p.ign).join(' | ');
            const ids = r.players.map(p => p.characterId).join(' | ');
            const appUids = r.players.map(p => p.appUid || 'N/A').join(' | ');

            const row = [
                r.teamName || 'Solo',
                r.contactNumber,
                `"${date}"`,
                r.entryFeePaid,
                `"${igns}"`,
                `"${ids}"`,
                `"${appUids}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registrations-${selectedTournament}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <Users className="text-primary" /> Registrations
                </h2>

                <select
                    className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none min-w-[200px]"
                    value={selectedTournament}
                    onChange={e => setSelectedTournament(e.target.value)}
                >
                    <option value="">-- Select a Tournament --</option>
                    {userContent.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.contentType})</option>
                    ))}
                </select>
            </div>

            {selectedTournament ? (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 text-sm">Total Registrations: <strong className="text-white">{registrations.length}</strong></span>
                        <button
                            onClick={handleExport}
                            disabled={registrations.length === 0}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10 text-gray-500">Loading registrations...</div>
                    ) : registrations.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 border border-white/5 rounded-lg bg-black/20">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            No users have registered for this tournament yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                    <tr>
                                        <th className="p-3 rounded-tl-lg">Team / Player</th>
                                        <th className="p-3">Contact</th>
                                        <th className="p-3">Roster (IGN - ID - App UID)</th>
                                        <th className="p-3">Fee Paid</th>
                                        <th className="p-3 rounded-tr-lg text-right">Registered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations.map(reg => (
                                        <tr key={reg.id} className="border-b border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                                            <td className="p-3">
                                                <div className="font-bold text-white">{reg.teamName || 'Solo Player'}</div>
                                                <div className="text-xs text-gray-500">{reg.userEmail}</div>
                                            </td>
                                            <td className="p-3 font-mono text-xs">{reg.contactNumber}</td>
                                            <td className="p-3">
                                                <ul className="space-y-1">
                                                    {reg.players.map((p, i) => (
                                                        <li key={i} className="text-xs break-words">
                                                            <span className="text-gray-400">{i + 1}.</span> <span className="text-primary font-bold">{p.ign}</span> <span className="text-gray-500">({p.characterId})</span>
                                                            {p.appUid && <span className="text-blue-400 ml-1 block sm:inline">[{p.appUid}]</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-2 py-1 rounded border border-yellow-500/20 font-bold">
                                                    {reg.entryFeePaid} Coins
                                                </span>
                                            </td>
                                            <td className="p-3 text-right text-xs text-gray-500 font-mono">
                                                {new Date(reg.registeredAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-gray-500 border border-white/5 rounded-lg bg-black/20">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    Please select a tournament from the dropdown above to view its registrations.
                </div>
            )}
        </div>
    );
};
