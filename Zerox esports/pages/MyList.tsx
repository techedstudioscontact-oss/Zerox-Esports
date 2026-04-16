import React, { useEffect, useState } from 'react';
import { Tournament, User } from '../types';
import { TournamentCard } from '../components/TournamentCard';
import { Heart } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface MyListProps {
    user: User | null;
    content: Tournament[];
}

export const MyList: React.FC<MyListProps> = ({ user, content }) => {
    const [savedTournaments, setSavedTournaments] = useState<Tournament[]>([]);
    const navigate = useNavigate();

    const handleCardClick = (item: Tournament) => {
        navigate(`/watch/${item.id}`);
    };

    useEffect(() => {
        if (user && user.savedTournaments) {
            const userFavs = content.filter(c => user.savedTournaments?.includes(c.id));
            setSavedTournaments(userFavs);
        }
    }, [user, content]);

    if (!user) {
        return (
            <div className="min-h-screen bg-black pt-24 px-6 flex flex-col items-center justify-center text-center">
                <Heart className="w-16 h-16 text-gray-700 mb-4" />
                <h2 className="text-2xl font-bold text-gray-500">Sign in to view your list</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-20">
            <div className="container mx-auto px-4 pt-8">
                <h1 className="text-3xl font-display font-bold text-white mb-8 flex items-center gap-3">
                    <Heart className="text-primary fill-primary" /> My List
                </h1>

                {savedTournaments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-white/5 rounded-2xl bg-white/5">
                        <Heart className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg">Your list is empty.</p>
                        <p className="text-sm mt-1">Save tournaments to track what you want to watch.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {savedTournaments.map((item) => {
                            return (
                                <TournamentCard
                                    key={item.id}
                                    content={item}
                                    onClick={() => handleCardClick(item)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
