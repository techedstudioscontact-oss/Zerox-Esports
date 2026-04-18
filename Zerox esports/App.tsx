import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { GlobalBackground } from './components/GlobalBackground';
import { User, Tournament, Role } from './types';
import { loginUser, logoutUser, updateUserInDb, subscribeToAuthChanges, getAllUsers, updateUserRoleInDb } from './services/authService';
import { subscribeToContent, addContentToDb, updateContentInDb, deleteContentFromDb } from './services/contentService';
import { subscribeToSystemSettings, SystemSettings } from './services/systemService';
import { Zap, AlertTriangle, Lock, LogOut } from 'lucide-react';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { Toaster, toast } from 'sonner';
import { initNotifications } from './services/notificationService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BiometricLock } from './components/BiometricLock';
import { AppUpdateBlocker } from './components/AppUpdateBlocker';
import GuardModule from './components/GuardModule';
import ScrollToTop from './components/ScrollToTop';
// Lazy Load Pages
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const TournamentDetail = lazy(() => import('./pages/TournamentDetail').then(module => ({ default: module.TournamentDetail })));
const MyList = lazy(() => import('./pages/MyList').then(module => ({ default: module.MyList })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const MasterAdminDashboard = lazy(() => import('./pages/MasterAdminDashboard').then(module => ({ default: module.MasterAdminDashboard })));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard').then(module => ({ default: module.ManagerDashboard })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Wallet = lazy(() => import('./pages/Wallet').then(module => ({ default: module.Wallet })));
const NewsPage = lazy(() => import('./pages/NewsPage').then(module => ({ default: module.NewsPage })));
const GamePage = lazy(() => import('./pages/GamePage').then(module => ({ default: module.GamePage })));




const preLoad = () => {
  // Trigger network requests in parallel
  import('./pages/Home');
  import('./pages/Login');
  import('./pages/TournamentDetail');
  import('./pages/MyList');
  import('./pages/AdminDashboard');
  import('./pages/MasterAdminDashboard');
  import('./pages/ManagerDashboard');
  import('./pages/Profile');
  import('./pages/Wallet');
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // INTRO LOGIC: Removed as per request
  const showIntro = false;

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    isLocked: false,
    broadcastMessage: "",
    commissionRate: 15
  });

  // Broadcast Dismissal State
  const [isBroadcastDismissed, setIsBroadcastDismissed] = useState(false);

  // Reset dismissal when message changes so valid new messages popup again
  useEffect(() => {
    if (systemSettings.broadcastMessage) {
      setIsBroadcastDismissed(false);
    }
  }, [systemSettings.broadcastMessage]);

  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Initial Data Load & Subscriptions
  useEffect(() => {
    let isMounted = true;

    // 1. Auth Listener
    const unsubscribeAuth = subscribeToAuthChanges(async (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        // Loading handled below to account for content

        // ... (Daily Reward Logic) ...
        // Check for Daily Reward
        if (currentUser) {
          // ... existing daily reward code ...
          try {
            const authService = await import('./services/authService');
            if (authService.checkDailyReward) {
              const result = await authService.checkDailyReward(currentUser);
              if (result.rewarded) {
                toast.success(`Daily Login Bonus! +${result.coins} Coins`, {
                  icon: <Zap className="text-yellow-400" />,
                  duration: 4000
                });
              }
            }
          } catch (err) {
            console.error("Daily reward check failed", err);
          }
        }
      }
    });

    // 1.5 Try Cache for Instant Content Load - HARDENED
    const cachedContent = localStorage.getItem('zerox_content_cache');
    if (cachedContent) {
      try {
        const parsed = JSON.parse(cachedContent);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          console.log("Loaded content from cache");
          setContent(parsed);
          setLoading(false);
        } else {
          console.warn("Invalid Cache Structure - Wiping");
          localStorage.removeItem('zerox_content_cache');
        }
      } catch (e) {
        console.error("Cache corrupted - Wiping to fix startup crash", e);
        localStorage.removeItem('zerox_content_cache');
      }
    }

    // 2. Real-time Content Listener
    // NOTE: content rule is `allow read: if true` — no auth needed once rules are published
    const unsubscribeContent = subscribeToContent((updatedContent) => {
      if (isMounted) {
        // Always update — even if empty (handles the case where last item is deleted)
        setContent(updatedContent);
        if (updatedContent.length > 0) {
          localStorage.setItem('zerox_content_cache', JSON.stringify(updatedContent));
        } else {
          localStorage.removeItem('zerox_content_cache');
        }
        setLoading(false);
      }
    });

    // 3. System Settings Listener
    // NOTE: settings rule is `allow read: if true` — works without login
    const unsubscribeSettings = subscribeToSystemSettings((settings) => {
      if (isMounted) {
        setSystemSettings(settings);
      }
    });

    // 4. Deep Link Listener (Native)
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', (data) => {
        console.log("Deep link opened:", data.url);

        // Handle: https://zeroxesports.com/watch/ID or custom schemes
        const slug = data.url.split(/\/watch\//).pop();
        if (slug) window.location.hash = `/watch/${slug}`;
      });
    });

    // 4.5 Web Deep Link Fallback (Query Params)
    // Checks for ?watch=ID when loaded on web/fallback URL
    const params = new URLSearchParams(window.location.search);
    const watchId = params.get('watch');
    if (watchId) {
      console.log("Found Web Query Param:", watchId);

      // Navigate to internal route
      window.location.hash = `/watch/${watchId}`;

      // SMART REDIRECT: Try to open the Native App
      // This uses the Custom Scheme or Intent URL
      // If app is installed, it opens. If not, we stay on web.
      setTimeout(() => {
        // Android Intent for Chrome
        if (Capacitor.getPlatform() === 'android') {
          const intentUrl = `intent://watch/${watchId}#Intent;scheme=zerox;package=com.zerox.esports.app;end`;
          window.location.href = intentUrl;
        }
      }, 500);
    }

    return () => {
      isMounted = false;
      unsubscribeAuth();
      unsubscribeContent();
      unsubscribeSettings();
    };
  }, []);

  // Hide Splash Screen and Init Notifications
  useEffect(() => {
    const initApp = async () => {
      preLoad(); // Start downloading Page Code immediately
      await initNotifications();
      await SplashScreen.hide();
    };
    setTimeout(initApp, 500);
  }, []);

  // Fetch all users if current user is Super Admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (user && user.role === 'superadmin') {
        const users = await getAllUsers();
        setAllUsers(users);
      }
    };
    fetchUsers();
  }, [user]);

  const handleLogin = async (email: string, password?: string, secretKey?: string) => {
    try {
      await loginUser(email, password, secretKey);
    } catch (e) {
      throw e;
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setAllUsers([]);
  };



  const handleAdminUpload = async (newContentData: Omit<Tournament, 'id' | 'createdAt' | 'uploadedBy'>) => {
    if (!user) return;
    const newContent: Tournament = {
      ...newContentData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      uploadedBy: user.uid
    };
    await addContentToDb(newContent);
  };

  const handleAdminUpdate = async (id: string, updates: Partial<Tournament>) => {
    await updateContentInDb(id, updates);
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await deleteContentFromDb(id);
      // Immediately remove from local state so UI updates without waiting for Firestore listener
      setContent(prev => prev.filter(item => item.id !== id));
      // Also clean the localStorage cache
      const cached = localStorage.getItem('zerox_content_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const updated = parsed.filter((item: any) => item.id !== id);
          if (updated.length > 0) {
            localStorage.setItem('zerox_content_cache', JSON.stringify(updated));
          } else {
            localStorage.removeItem('zerox_content_cache');
          }
        } catch {}
      }
      toast.success('Content deleted successfully.');
    } catch (error: any) {
      console.error("Failed to delete content:", error);
      toast.error(`Delete failed: ${error?.message || 'Permission denied. Check Firestore rules.'}`);
      throw error;
    }
  };

  const handleUpdateUserRole = async (uid: string, newRole: Role) => {
    // 1. Optimistic Update
    const previousUsers = [...allUsers];
    setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));

    try {
      // 2. Perform DB Update
      await updateUserRoleInDb(uid, newRole);
      toast.success("User role updated successfully");
    } catch (error: any) {
      // 3. Revert on Error
      console.error("Role update failed:", error);
      setAllUsers(previousUsers);
      toast.error(`Failed to update role: ${error.message || "Permission denied"}`);
      throw error; // Rethrow to stop dependent operations
    }
  };

  const handleUpdateUserPaymentStatus = async (uid: string, isPaid: boolean) => {
    // 1. Optimistic Update
    const previousUsers = [...allUsers];
    setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, paidUser: isPaid } : u));

    try {
      const userToUpdate = allUsers.find(u => u.uid === uid);
      if (userToUpdate) {
        await updateUserInDb({ ...userToUpdate, paidUser: isPaid });
        toast.success(`User status: ${isPaid ? 'Premium Unlocked' : 'Standard Tier'}`);
      }
    } catch (error: any) {
      console.error("Payment status update failed:", error);
      setAllUsers(previousUsers);
      toast.error(`Error: ${error.message || "Update failed"}`);
    }
  };


  // SYSTEM LOCKDOWN SCREEN
  // Bypassed if user is Super Admin
  if (systemSettings.isLocked && user?.role !== 'superadmin') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-red-500 font-mono p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z5a3Z5a3Z5a3Z5a3Z5a3Z5a3Z5a3Z5a3Z5a3Z5&rid=giphy.gif')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <Lock size={64} className="mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4 tracking-tighter neon-text-red">SYSTEM LOCKDOWN</h1>
        <p className="text-gray-400 max-w-md border-t border-b border-white/10 py-4">
          Access to the Zerox eSports network has been suspended by Master Control.
          Maintenance protocols are in effect.
        </p>
        <div className="mt-8 text-xs text-gray-600">ERROR_CODE: 503_SERVICE_UNAVAILABLE</div>

        {/* Emergency Logout for Admins stuck in preview */}
        <button
          onClick={handleLogout}
          className="mt-12 group flex items-center gap-2 px-6 py-2 bg-red-900/20 border border-red-500/30 rounded-full hover:bg-red-900/40 hover:border-red-500/60 transition-all"
        >
          <LogOut size={16} className="text-red-500" />
          <span className="text-xs font-mono text-red-400 uppercase tracking-widest group-hover:text-red-300">Emergency Disconnect</span>
        </button>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white font-display relative overflow-hidden">
      {/* Loading Visuals */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 to-red-900/10 animate-pulse"></div>
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 relative z-10"></div>
      <div className="text-xl tracking-[0.3em] font-bold text-glow relative z-10 animate-pulse">CONNECTING...</div>
    </div>
  );

  return (
    <GuardModule>
      <AppUpdateBlocker>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-[#050505] text-textMain relative font-sans selection:bg-primary selection:text-white">


          {/* GLOBAL BROADCAST POPUP */}
          {systemSettings.broadcastMessage && !isBroadcastDismissed && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-md bg-[#1a1a1e] border border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(234,88,12,0.3)] overflow-hidden transform transition-all animate-float">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 p-4 border-b border-orange-500/20 flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-full animate-pulse">
                    <AlertTriangle size={24} className="text-orange-500" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-wider">SYSTEM BROADCAST</h3>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                  <p className="text-gray-200 text-lg leading-relaxed font-medium">
                    {systemSettings.broadcastMessage}
                  </p>
                </div>

                {/* Footer / Action */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex justify-center">
                  <button
                    onClick={() => setIsBroadcastDismissed(true)}
                    className="px-8 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 hover:scale-105 transition-all text-sm uppercase tracking-widest"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Background System */}
          <GlobalBackground settings={systemSettings} user={user} />

          {/* Global Toaster for Notifications */}
          <Toaster position="top-center" theme="dark" richColors closeButton />

          {/* Content Wrapper */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <BiometricLock onAuthenticated={() => console.log("Biometric Unlock")} />
            <Navbar
              user={user}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              allContent={content}
            />

            <main className="flex-grow pt-[calc(4rem+env(safe-area-inset-top))]">
              <Suspense fallback={
                <div className="flex h-screen w-full flex-col gap-4 items-center justify-center bg-[#050505]">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white/50 text-xs font-mono animate-pulse">INITIALIZING MODULES...</p>
                </div>
              }>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Home user={user} content={content} searchQuery={searchQuery} />} />

                    <Route path="/login" element={<Login onLogin={handleLogin} />} />

                    <Route path="/watch/:id" element={<TournamentDetail user={user} contentList={content} />} />

                    <Route path="/mylist" element={<MyList user={user} content={content} />} />

                    <Route path="/news" element={<NewsPage />} />

                    <Route path="/game/:gameId" element={<GamePage user={user} content={content} />} />

                    {/* Normal Admin Route - Now allows Super Admin for Uploader access */}
                    <Route path="/admin" element={
                      user ? (
                        (user.role === 'admin' || user.role === 'manager' || user.role === 'masteradmin' || user.role === 'superadmin') ? (
                          <AdminDashboard
                            user={user}
                            userContent={content.filter(c => c.uploadedBy === user.uid)}
                            onUpload={handleAdminUpload}
                            onUpdate={handleAdminUpdate}
                            onDelete={handleDeleteContent}
                          />
                        ) : <Navigate to="/" />
                      ) : <Navigate to="/login" />
                    } />

                    {/* Master Admin Route - Strictly excludes Normal Admin/User */}
                    <Route path="/master-admin" element={
                      user ? (
                        (user.role === 'superadmin' || user.role === 'masteradmin') ? (
                          <Suspense fallback={<div />}>
                            <MasterAdminDashboard
                              user={user}
                              allUsers={allUsers}
                              allContent={content}
                              systemSettings={systemSettings}
                              onDeleteContent={handleDeleteContent}
                              onUpdateUserRole={handleUpdateUserRole}
                              onUpdateUserPaymentStatus={handleUpdateUserPaymentStatus}
                            />
                          </Suspense>
                        ) : <Navigate to="/" />
                      ) : <Navigate to="/login" />
                    } />

                    {/* MANAGER DASHBOARD */}
                    <Route path="/manager" element={
                      user ? (
                        (user.role === 'manager' || user.role === 'superadmin') ? (
                          <Suspense fallback={<div />}>
                            <ManagerDashboard
                              user={user}
                              allContent={content}
                              onDeleteContent={handleDeleteContent}
                            />
                          </Suspense>
                        ) : <Navigate to="/" />
                      ) : <Navigate to="/login" />
                    } />
                    <Route path="/profile" element={
                      user ? (
                        <Profile user={user} onLogout={handleLogout} />
                      ) : <Navigate to="/login" />
                    } />
                    <Route path="/wallet" element={
                      user ? (
                        <Wallet user={user} />
                      ) : <Navigate to="/login" />
                    } />
                  </Routes>
                </ErrorBoundary>
              </Suspense>
            </main>

            <div className="text-center font-display font-black tracking-[0.3em] text-xs text-white/20 mt-8 mb-4">
              <div className="flex justify-center items-center gap-4 mb-2">
                <span className="w-8 h-[1px] bg-white/10"></span>
                ZEROX ESPORTS &copy; 2026 // Esports System
                <span className="w-8 h-[1px] bg-white/10"></span>
              </div>
            </div>
          </div>
        </div>
      </Router>
    </AppUpdateBlocker>
    </GuardModule>
  );
};

export default App;