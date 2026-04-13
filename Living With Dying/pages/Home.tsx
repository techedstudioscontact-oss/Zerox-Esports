import React, { useState, useMemo, useRef } from 'react';
import { TournamentCard } from '../components/TournamentCard';
import { HeroCarousel } from '../components/HeroCarousel';
import { User, Tournament } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy, AlertCircle } from 'lucide-react';
import { subscribeToNews } from '../services/newsService';
import { NewsItem } from '../types';

interface HomeProps {
  user: User | null;
  content: Tournament[];
  searchQuery: string;
}

const games = [
  { id: 'bgmi', name: 'BGMI', image: '/bgmi.jpg', color: 'from-orange-800 to-yellow-700' },
  { id: 'freefire', name: 'Free Fire MAX', image: '/ffmax.jpg', color: 'from-red-800 to-orange-700' },
  { id: 'minecraft', name: 'Minecraft', image: '/minecraft.jfif', color: 'from-green-800 to-emerald-700', isNew: true },
];

export const Home: React.FC<HomeProps> = ({ user, content, searchQuery }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const gameScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const unsub = subscribeToNews((data) => {
      setNews(data.filter(n => n.published));
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (news.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('filter') === 'news') {
        const scrollToNews = () => {
          const el = document.getElementById('news-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Optional: Remove '?filter=news' from URL so clicking it again works
            window.history.replaceState({}, '', '/');
          }
        };
        // Run immediately if possible, but also wait a bit for images/layout to shift
        setTimeout(scrollToNews, 100);
        setTimeout(scrollToNews, 500);
      }
    }
  }, [news.length, location.search]);

  const handleCardClick = (item: Tournament) => {
    if (!user) { navigate('/login'); return; }
    navigate(`/watch/${item.id}`);
  };

  const scrollGames = (dir: 'left' | 'right') => {
    gameScrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const filteredContent = useMemo(() => {
    let data = content.filter(c => c.status === 'published' || !c.status);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return data.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [content, searchQuery]);

  const featured = content.filter(c => c.status === 'published' || !c.status).slice(0, 6);

  // Extract Live Scrims
  const liveScrims = content.filter(c => (c.status === 'published' || !c.status) && c.isFeatured).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen pb-24">

      {/* ── Platform News (TOP) ────────────────────────────────────── */}
      {!searchQuery && (
        <section id="news-section" className="container mx-auto px-4 pt-4 mb-6 relative scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Platform News
            </h2>
          </div>

          {news.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory -mx-4 px-4">
              {news.map(item => (
                <div
                  key={item.id}
                  className="snap-start shrink-0 relative rounded-2xl overflow-hidden border-2 border-white/5 bg-black/40 
                    w-[calc(85vw-32px)] md:w-[400px] aspect-[21/9]"
                >
                  {/* Background Image */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-black" />
                  )}

                  {/* Gradient Overlay for Text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-bold uppercase rounded-sm shadow-lg">
                      News
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-300 text-xs line-clamp-1 drop-shadow-md mb-2">
                      {item.content}
                    </p>
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-bold text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read More <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-2xl border border-white/5 mx-4">
              <AlertCircle size={32} className="text-gray-500 mb-3" />
              <p className="text-gray-400 font-semibold">No recent news available.</p>
              <p className="text-gray-600 text-sm mt-1">Check back later for updates from the Master Admin.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Main Stream Scrims (Featured) ─────────────────────────── */}
      {!searchQuery && liveScrims.length > 0 && (
        <section className="container mx-auto px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black text-lg flex items-center gap-2 uppercase tracking-wide">
              <span className="w-1.5 h-6 bg-yellow-500 rounded-full inline-block animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
              Main Stream Scrims
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory -mx-4 px-4">
            {liveScrims.map(scrim => (
              <div key={scrim.id} className="snap-start shrink-0 w-[75vw] md:w-[40vw] lg:w-[25vw]">
                <TournamentCard
                  content={scrim}
                  isUnlocked={true}
                  onClick={() => handleCardClick(scrim)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Hero Carousel (Featured Tournaments) ─────────────────── */}
      {!searchQuery && <HeroCarousel content={featured} />}

      {/* ── Pick a Game — horizontal strip (like Aniryx) ───────── */}
      {!searchQuery && (
        <section className="container mx-auto px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Pick a Game
            </h2>
            <div className="flex gap-1">
              <button onClick={() => scrollGames('left')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => scrollGames('right')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div ref={gameScrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory -mx-4 px-4">
            {games.map(game => (
              <div
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className={`snap-start shrink-0 relative rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-white/20 hover:scale-[1.02] transition-all duration-300 w-[calc(50vw-20px)] aspect-video`}
              >
                {/* Background image */}
                <img
                  src={game.image}
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/320x180/1a1a1a/ffffff?text=' + game.name; }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Badge */}
                {game.isNew && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-[9px] font-bold uppercase rounded-full animate-pulse shadow-lg shadow-primary/40">
                    New
                  </div>
                )}

                {/* Title at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-black text-sm uppercase tracking-wide leading-tight">{game.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}





    </div>
  );
};