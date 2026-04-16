import React, { useState, useEffect } from 'react';
import { subscribeToNews } from '../services/newsService';
import { NewsItem } from '../types';
import { Newspaper, ChevronLeft, Clock, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NewsPage: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = subscribeToNews((data) => {
            setNews(data.filter(n => n.published));
            setLoading(false);
        });
        return unsub;
    }, []);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-bg pb-24 px-4 pt-12 md:pt-16 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition animate-fade-in"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20 text-primary animate-pulse shadow-[0_0_15px_rgba(235,27,36,0.2)]">
                        <Newspaper size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Platform News</h1>
                        <p className="text-gray-400 text-sm font-medium">Latest updates from Zerox eSports</p>
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : news.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                    <Newspaper size={48} className="mx-auto text-gray-600 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">No News Yet</h2>
                    <p className="text-gray-400">Check back later for updates from the Admin.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {news.map((item, idx) => (
                        <article
                            key={item.id}
                            className="bg-surface rounded-2xl overflow-hidden border border-white/5 shadow-xl animate-slide-up"
                            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                        >
                            {/* Image Header */}
                            {item.imageUrl && (
                                <div className="w-full aspect-video md:aspect-[21/9] relative bg-black">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
                                </div>
                            )}

                            {/* Content Body */}
                            <div className="p-5 md:p-8">
                                <div className="flex items-center gap-4 mb-3 text-xs md:text-sm font-semibold text-primary uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded">
                                        <CalendarDays size={14} />
                                        {formatDate(item.createdAt)}
                                    </span>
                                </div>

                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                                    {item.title}
                                </h2>

                                <div className="prose prose-invert prose-p:text-gray-300 prose-p:leading-relaxed max-w-none">
                                    {item.content.split('\n').map((paragraph, i) => (
                                        <p key={i} className="mb-4 last:mb-0">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>

                                {item.linkUrl && (
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <a
                                            href={item.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(235,27,36,0.3)] hover:shadow-[0_0_30px_rgba(235,27,36,0.5)]"
                                        >
                                            Read Full Article
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};
