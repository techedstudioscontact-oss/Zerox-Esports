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

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md pt-[env(safe-area-inset-top)] transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Sidebar Trigger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-3 group shrink-0 mr-4 focus:outline-none"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/40 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img
                src="/logo.png"
                alt="Zerox eSports"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded object-cover shadow-lg shadow-purple-900/30 relative z-10 group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="font-bold text-white text-lg tracking-tight group-hover:text-primary transition-colors">Zerox eSports</span>
              <span className="text-[9px] text-gray-400 leading-none tracking-widest uppercase">Esports & Scrims</span>
            </div>
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg relative mx-2 md:mx-4" ref={searchRef}>
            <div className="relative group">
              <input
                type="text"
                placeholder="Search tournaments or games..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery) setShowSuggestions(true);
                  if (window.location.hash !== '#/') navigate('/');
                }}
                className="w-full bg-surfaceHighlight/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:bg-surfaceHighlight transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
            </div>

            {/* Live Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surfaceHighlight border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="px-3 py-2 text-[10px] uppercase text-gray-500 font-bold tracking-wider bg-black/20">
                  Suggestions
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSuggestionClick(item.id)}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <img src={item.thumbnailUrl} alt="" className="w-8 h-10 object-cover rounded bg-black/50" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{item.title}</h4>
                      <div className="flex gap-1 mt-0.5">
                        {item.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1 rounded bg-white/5 text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <Play className="h-3 w-3 text-gray-600 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">

                {/* Quick Wallet Info */}
                <button
                  onClick={() => navigate('/wallet')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold font-mono leading-none">{user.coins || 0}</span>
                </button>

                {/* Admin/Superadmin/Manager shortcut button — hidden for regular users */}
                {(user.role === 'superadmin' || user.role === 'admin' || user.role === 'manager') && (
                  <>
                    <button
                      onClick={handleDashboardClick}
                      className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-wider transition-all shadow-lg
                        ${user.role === 'superadmin'
                          ? 'bg-accent/10 border-accent/50 text-accent hover:bg-accent/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                          : user.role === 'manager'
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                            : 'bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        }`}
                    >
                      {user.role === 'superadmin' && <Crown className="h-3.5 w-3.5" />}
                      {user.role === 'manager' && <Activity className="h-3.5 w-3.5" />}
                      {user.role === 'admin' && <Shield className="h-3.5 w-3.5" />}
                      <span className="uppercase">
                        {(user.role === 'superadmin' || user.role === 'masteradmin') ? 'Master Panel'
                          : user.role === 'manager' ? 'Manager'
                            : 'Moderator Panel'}
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