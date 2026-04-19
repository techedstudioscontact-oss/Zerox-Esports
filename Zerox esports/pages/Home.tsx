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

const BASE = import.meta.env.BASE_URL || '/';

const games = [
  { id: 'bgmi', name: 'BGMI', image: `${BASE}bgmi.jpg`, color: 'from-orange-800 to-yellow-700' },
  { id: 'freefire', name: 'Free Fire MAX', image: `${BASE}ffmax.jpg`, color: 'from-red-800 to-orange-700' },
  { id: 'minecraft', name: 'Minecraft', image: `${BASE}minecraft.jfif`, color: 'from-green-800 to-emerald-700', isNew: true },
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

      {/* ── Platform News (TOP) ─────────────      {/* ── Platform News (TOP) ────────────────────────────────────── */}
      {!searchQuery && (
        <section id="news-section" className="container mx-auto px-4 pt-4 mb-10 relative scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
              <span className="w-2 h-7 bg-primary rounded-full inline-block shadow-[0_0_15px_rgba(255,59,48,0.5)]" />
              Platform News
            </h2>
          </div>

          {news.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-6 snap-x snap-mandatory -mx-4 px-4">
              {news.map(item => (
                <div
                  key={item.id}
                  className="snap-start shrink-0 relative rounded-[32px] overflow-hidden border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl
                    w-[calc(90vw-32px)] md:w-[480px] aspect-[21/9] shadow-[0_20px_50px_rgba(0,0,0,0.4)] group cursor-pointer"
                >
                  {/* Background Image */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-1000"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-black" />
                  )}

                  {/* Gradient Overlay for Text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-full shadow-[0_4px_15px_rgba(255,59,48,0.4)] tracking-widest">
                      LATEST
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-black text-xl leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-1 mb-4 font-medium tracking-wide">
                      {item.content}
                    </p>
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read Details <ChevronRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 rounded-[32px] border border-white/[0.05] bg-white/[0.02] backdrop-blur-md mx-4">
              <AlertCircle size={40} className="text-gray-700 mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-sm">Silence in the Arena</p>
              <p className="text-gray-600 text-xs mt-2 uppercase tracking-widest">Intelligence report pending...</p>
            </div>
          )}
        </section>
      )}

      {/* ── Main Stream Scrims (Featured) ─────────────────────────── */}
      {!searchQuery && liveScrims.length > 0 && (
        <section className="container mx-auto px-4 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
              <span className="w-2.5 h-7 bg-yellow-500 rounded-full inline-block animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
              Daily Scrims
            </h2>
          </div>

          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-6 snap-x snap-mandatory -mx-4 px-4">
            {liveScrims.map(scrim => (
              <div key={scrim.id} className="snap-start shrink-0 w-[85vw] md:w-[45vw] lg:w-[30vw]">
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
        <section className="container mx-auto px-4 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
              <span className="w-2 h-7 bg-secondary rounded-full inline-block shadow-[0_0_15px_rgba(0,210,255,0.5)]" />
              Arena Select
            </h2>
            <div className="flex gap-2">
              <button onClick={() => scrollGames('left')} className="p-2.5 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-lg"><ChevronLeft size={18} /></button>
              <button onClick={() => scrollGames('right')} className="p-2.5 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-lg"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div ref={gameScrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-6 snap-x snap-mandatory -mx-4 px-4">
            {games.map(game => (
              <div
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="snap-start shrink-0 relative rounded-[32px] overflow-hidden cursor-pointer border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-white/20 hover:scale-[1.03] transition-all duration-500 w-[calc(65vw-20px)] md:w-[320px] aspect-video shadow-[0_20px_40px_rgba(0,0,0,0.5)] group"
              >
                {/* Background image */}
                <img
                  src={game.image}
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-all duration-1000 group-hover:scale-115 group-hover:opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/080808/ffffff?text=' + game.name; }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Badge */}
                {game.isNew && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-secondary text-black font-black text-[9px] uppercase rounded-full shadow-[0_0_20px_rgba(0,210,255,0.4)] tracking-widest italic">
                    NEW SECTOR
                  </div>
                )}

                {/* Title at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-black text-lg uppercase tracking-tight group-hover:text-glow-secondary transition-all">
                    {game.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}





    </div>
  );
};