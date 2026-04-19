import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, User as UserIcon, Shield, Crown, Play, Zap, LayoutDashboard, Heart, Activity, Wallet } from 'lucide-react';
import { User, Tournament } from '../types';
import { Button } from './Button';
import { Sidebar } from './Sidebar';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allContent: Tournament[];
}


export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  searchQuery,
  onSearchChange,
  allContent
}) => {
  /* Sidebar Logic */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Tournament[]>([]);

  // Filter content for search
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = allContent.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, allContent]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    if (!showSuggestions) setShowSuggestions(true);
  };

  const handleSuggestionClick = (id: string) => {
    navigate(`/content/${id}`);
    setShowSuggestions(false);
    onSearchChange('');
  };

  const handleDashboardClick = () => {
    if (!user) return;
    if (user.role === 'superadmin') navigate('/master-admin');
    else if (user.role === 'manager') navigate('/manager');
    else if (user.role === 'admin') navigate('/admin');
    else navigate('/profile');
  };

  return (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-black/30 backdrop-blur-xl pt-[env(safe-area-inset-top)] transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo / Sidebar Trigger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-4 group shrink-0 mr-4 focus:outline-none"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Zerox eSports"
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl object-cover shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative z-10 group-hover:scale-110 transition-all duration-500 border border-white/10"
              />
            </div>
            <div className="hidden sm:flex flex-col items-start translate-y-0.5">
              <span className="font-black text-white text-xl tracking-tighter group-hover:text-glow-primary transition-all duration-300 uppercase italic">Zerox<span className="text-primary italic-none tracking-normal">eSports</span></span>
              <span className="text-[10px] text-gray-500 font-black leading-none tracking-[0.2em] uppercase mt-1">Global Network</span>
            </div>
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative mx-4 md:mx-8" ref={searchRef}>
            <div className="relative group">
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery) setShowSuggestions(true);
                  if (window.location.hash !== '#/') navigate('/');
                }}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all focus:shadow-[0_0_20px_rgba(255,59,48,0.1)]"
              />
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-600 group-focus-within:text-primary transition-colors" />
            </div>

            {/* Live Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-[#0a0a0b]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="px-5 py-3 text-[10px] uppercase text-gray-500 font-black tracking-[0.2em] bg-white/[0.02] border-b border-white/[0.05]">
                  Detected Matches
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSuggestionClick(item.id)}
                    className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <img src={item.thumbnailUrl} alt="" className="w-10 h-10 object-cover rounded-xl bg-black/50 border border-white/10" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-gray-200 group-hover:text-white truncate uppercase tracking-tight">{item.title}</h4>
                      <div className="flex gap-1.5 mt-1">
                        {item.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-bold uppercase">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <Play className="h-4 w-4 text-gray-700 group-hover:text-primary transition-all scale-0 group-hover:scale-100" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <div className="flex items-center gap-4">

                {/* Quick Wallet Info */}
                <button
                  onClick={() => navigate('/wallet')}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-all shadow-lg"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-black font-mono tracking-tighter">₹{user.coins || 0}</span>
                </button>

                {/* Admin/Superadmin/Manager shortcut button — hidden for regular users */}
                {(user.role === 'superadmin' || user.role === 'admin' || user.role === 'manager') && (
                  <>
                    <button
                      onClick={handleDashboardClick}
                      className={`hidden md:flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border text-[11px] font-black tracking-[0.15em] transition-all shadow-xl
                        ${user.role === 'superadmin'
                          ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary hover:text-white hover:shadow-[0_0_25px_rgba(255,59,48,0.4)]'
                          : user.role === 'manager'
                            ? 'bg-blue-500/5 border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]'
                            : 'bg-purple-500/5 border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]'
                        }`}
                    >
                      {user.role === 'superadmin' && <Crown className="h-3.5 w-3.5" />}
                      {user.role === 'manager' && <Activity className="h-3.5 w-3.5" />}
                      {user.role === 'admin' && <Shield className="h-3.5 w-3.5" />}
                      <span className="uppercase">
                        {(user.role === 'superadmin' || user.role === 'masteradmin') ? 'Master Control'
                          : user.role === 'manager' ? 'Ops Panel'
                            : 'Moderator'}
                      </span>
                    </button>

                    {/* Mobile icon only */}
                    <button
                      onClick={handleDashboardClick}
                      className="md:hidden p-2 rounded-full bg-white/5 text-white hover:bg-white/10"
                    >
                      {user.role === 'superadmin' ? <Crown size={20} className="text-accent" /> : <Shield size={20} className="text-purple-400" />}
                    </button>
                  </>
                )}

              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login?mode=signin">
                  <Button variant="outline" size="sm" className="text-xs px-3">
                    Sign In
                  </Button>
                </Link>
                <Link to="/login?mode=signup">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>


        </div>
      </nav>
    </>
  );
};