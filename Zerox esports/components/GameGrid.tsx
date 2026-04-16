import React from 'react';
import { Users, Trophy, ChevronRight } from 'lucide-react';

interface GameCardProps {
    id: string;
    name: string;
    image: string;
    totalTournaments: number;
    activePlayers: number;
    color: string;
    isNew?: boolean;
}

const games: GameCardProps[] = [
    {
        id: 'bgmi',
        name: 'BGMI',
        image: '/bgmi.jpg',
        totalTournaments: 12,
        activePlayers: 1540,
        color: 'from-orange-600 to-yellow-600'
    },
    {
        id: 'freefire',
        name: 'Free Fire MAX',
        image: '/ffmax.jpg',
        totalTournaments: 8,
        activePlayers: 980,
        color: 'from-red-600 to-orange-800'
    },
    {
        id: 'minecraft',
        name: 'Minecraft',
        image: '/minecraft.jfif',
        totalTournaments: 4,
        activePlayers: 450,
        color: 'from-green-600 to-emerald-800',
        isNew: true
    }
];

interface GameGridProps {
    onSelect: (gameId: string) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {games.map((game) => (
                <div
                    key={game.id}
                    onClick={() => onSelect(game.id)}
                    className="group relative h-48 md:h-64 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-primary-glow"
                >
                    {/* Background Image with Zoom Effect */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${game.image})` }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Content */}
                    <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-end">
                        {game.isNew && (
                            <div className="absolute top-3 right-3 md:top-4 md:right-4 px-2 py-0.5 md:px-3 md:py-1 bg-primary text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full animate-pulse shadow-lg shadow-red-500/30">
                                New
                            </div>
                        )}

                        <h3 className="text-xl md:text-2xl font-display font-black text-white mb-0.5 md:mb-1 uppercase tracking-wider group-hover:text-primary transition-colors">
                            {game.name}
                        </h3>

                        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-300 mb-2 md:mb-3">
                            <span className="flex items-center gap-1">
                                <Trophy size={12} className="text-yellow-500 md:w-3.5 md:h-3.5" />
                                {game.totalTournaments} Events
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={12} className="text-blue-400 md:w-3.5 md:h-3.5" />
                                {game.activePlayers} Live
                            </span>
                        </div>

                        {/* Button/CTA */}
                        <div className="flex items-center gap-2 text-sm font-bold text-white opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            PLAY NOW <ChevronRight size={16} className="text-primary" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
