import React, { useRef, useEffect } from 'react';
import { Tournament } from '../types';
import { Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroCarouselProps {
  content: Tournament[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ content }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Featured items (take first 5 valid items)
  const featured = content.slice(0, 5);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Optional: Auto-scroll logic could go here, 
    // but for "touch/drag support", native overflow is best.
  }, []);

  if (featured.length === 0) return null;

  return (
    <div className="w-full relative mt-16 mb-8 group">
      <div className="container mx-auto px-4">
        <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full"></span>
          Featured Tournaments & Scrims
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 scrollbar-hide container mx-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {featured.map((item) => (
          <div
            key={item.id}
            className="snap-center shrink-0 w-[85vw] sm:w-[60vw] md:w-[40vw] lg:w-[30vw] relative aspect-video rounded-xl overflow-hidden cursor-pointer ring-1 ring-white/10 hover:ring-primary/50 transition-all shadow-lg"
            onClick={() => navigate(`/watch/${item.id}`)}
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Content Text */}
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <div className="flex gap-2 mb-2">
                {item.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-primary/80 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-1 drop-shadow-lg">{item.title}</h3>
              <p className="text-gray-300 text-xs line-clamp-2 max-w-[90%] mb-3">{item.description}</p>

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <Play className="fill-current w-3 h-3" />
                <span>View Details</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Decorative fade edges for scroll hint */}
      <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none md:block hidden" />
    </div>
  );
};
