import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Filter, Map, Users } from 'lucide-react';
import { TournamentCard } from '../components/TournamentCard';
import { Tournament, User } from '../types';

interface GamePageProps {
    user: User | null;
    content: Tournament[];
}

const GAME_INFO: Record<string, { name: string, image: string, maps: string[], sizes: string[] }> = {
    'bgmi': {
        name: 'BGMI',
        image: '/bgmi.jpg',
        maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Karakin'],
        sizes: ['Solo', 'Duo', 'Squad']
    },
    'freefire': {
        name: 'Free Fire MAX',
        image: '/ffmax.jpg',
        maps: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NeXTerra'],
        sizes: ['Solo', 'Duo', 'Squad', '6man']
    },
    'minecraft': {
        name: 'Minecraft',
        image: '/minecraft.jfif',
        maps: ['Survival', 'Creative', 'Bedwars', 'Skywars', 'Hunger Games', 'OneBlock', 'Lifesteal SMP', 'Prison'],
        sizes: ['Solo', 'Duo', 'Squad', 'Open']
    }
};

export const GamePage: React.FC<GamePageProps> = ({ user, content }) => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();

    const [selectedMap, setSelectedMap] = useState<string>('All');
    const [selectedSize, setSelectedSize] = useState<string>('All');
    const [showFilters, setShowFilters] = useState(false);

    // Validate game ID
    if (!gameId || !GAME_INFO[gameId]) {
        return (
            <div className="min-h-screen pt-24 px-4 pb-24 text-center">
                <h1 className="text-white text-2xl font-bold mb-4">Game Not Found</h1>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-white rounded-lg">Go Home</button>
            </div>
        );
    }

    const gameData = GAME_INFO[gameId];

    // Filter content
    const filteredContent = useMemo(() => {
        let data = content.filter(c => c.status === 'published' || !c.status);

        // 1. Filter by game tag
        if (gameId === 'bgmi') {
            data = data.filter(t => t.tags.some(g => g.toLowerCase().includes('bgmi') || g.toLowerCase().includes('pubg')));
        } else if (gameId === 'freefire') {
            data = data.filter(t => t.tags.some(g => g.toLowerCase().includes('free')));
        } else if (gameId === 'minecraft') {
            data = data.filter(t => t.tags.some(g => g.toLowerCase().includes('mine')));
        }

        // 2. Filter by Map
        if (selectedMap !== 'All') {
            data = data.filter(t => (t as any).map?.toLowerCase().includes(selectedMap.toLowerCase()));
        }

        // 3. Filter by Team Size
        if (selectedSize !== 'All') {
            data = data.filter(t => (t as any).teamSize?.toLowerCase() === selectedSize.toLowerCase());
        }

        // Sort newest first
        return data.sort((a, b) => b.createdAt - a.createdAt);
    }, [content, gameId, selectedMap, selectedSize]);


    const handleCardClick = (item: Tournament) => {
        if (!user) { navigate('/login'); return; }
        navigate(`/watch/${item.id}`);
    };

    return (
        <div className="min-h-screen pb-24 bg-black">
            {/* Dynamic Header / Hero */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <div className="absolute inset-0">
                    <img src={gameData.image} alt={gameData.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                </div>

                {/* Back Button */}
                <div className="absolute top-[env(safe-area-inset-top,env(safe-area-inset-top))] left-4 pt-16 z-20">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight drop-shadow-lg mb-2">
                            {gameData.name}
                        </h1>
                        <p className="text-gray-300 font-medium">
                            {filteredContent.length} {filteredContent.length === 1 ? 'Tournament' : 'Tournaments'} Available
                        </p>
                    </div>

                    {/* Mobile Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="md:hidden flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-bold active:scale-95 transition-transform"
                    >
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className={`container mx-auto px-4 py-6 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:block'}`}>
                <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">

                    {/* Map Filter */}
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Map size={14} className="text-primary" /> Map / Arena
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedMap('All')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all 
                            ${selectedMap === 'All' ? 'bg-primary text-white' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}`}
                            >
                                Any
                            </button>
                            {gameData.maps.map(map => (
                                <button
                                    key={map}
                                    onClick={() => setSelectedMap(map)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all 
                                ${selectedMap === map ? 'bg-primary text-white' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    {map}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team Size Filter */}
                    <div className="flex-1 md:border-l md:border-white/10 md:pl-6">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Users size={14} className="text-blue-500" /> Team Size
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedSize('All')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all 
                            ${selectedSize === 'All' ? 'bg-primary text-white' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}`}
                            >
                                Any
                            </button>
                            {gameData.sizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all 
                                ${selectedSize === size ? 'bg-primary text-white' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Content Grid */}
            <div className="container mx-auto px-4 mt-4">
                {filteredContent.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                        {filteredContent.map((item) => (
                            <TournamentCard
                                key={item.id}
                                content={item}
                                isUnlocked={true}
                                onClick={() => handleCardClick(item)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-black/20 rounded-2xl border border-white/5 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Filter size={24} className="text-gray-500" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">No Tournaments Found</h3>
                        <p className="text-gray-500 text-sm max-w-sm">
                            We could not find any active tournaments for {gameData.name} matching your selected filters. Try changing the Map or Team Size.
                        </p>
                        <button
                            onClick={() => { setSelectedMap('All'); setSelectedSize('All'); }}
                            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
