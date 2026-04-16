import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { isAdminEmail, registerUser } from '../services/authService';
import { GameProfile, GameType } from '../types';
import { Gamepad2, Phone, User as UserIcon, Hash, Plus, Trash2, ChevronRight, Swords } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password?: string, secretKey?: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');

  // Registration Extra Fields
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [gameProfiles, setGameProfiles] = useState<GameProfile[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1); // 1: Personal Info, 2: Game Profiles

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  const isMasterEmail = isAdminEmail(email) && !isSignUp;

  const handleAddGameProfile = () => {
    setGameProfiles([...gameProfiles, { gameId: 'bgmi', inGameName: '', gameUID: '' }]);
  };

  const updateGameProfile = (index: number, field: keyof GameProfile, value: string) => {
    const updated = [...gameProfiles];
    updated[index] = { ...updated[index], [field]: value };
    // Clean up irrelevant fields if game changes to minecraft
    if (field === 'gameId' && value === 'minecraft') {
      updated[index].inGameName = undefined;
      updated[index].gameUID = undefined;
      updated[index].username = '';
    } else if (field === 'gameId' && value !== 'minecraft') {
      updated[index].username = undefined;
      if (!updated[index].inGameName) updated[index].inGameName = '';
      if (!updated[index].gameUID) updated[index].gameUID = '';
    }
    setGameProfiles(updated);
  };

  const removeGameProfile = (index: number) => {
    const updated = [...gameProfiles];
    updated.splice(index, 1);
    setGameProfiles(updated);
  };

  const validateStep1 = () => {
    if (!email || !password || !displayName || !phoneNumber) {
      setError('Please fill in all required fields marked with *');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    for (const profile of gameProfiles) {
      if (profile.gameId === 'minecraft' && !profile.username?.trim()) {
        setError('Minecraft profile requires a Username.');
        return false;
      }
      if (profile.gameId !== 'minecraft' && (!profile.inGameName?.trim() || !profile.gameUID?.trim())) {
        setError(`${profile.gameId.toUpperCase()} profile requires both IGN and Game UID.`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp && signupStep === 1) {
      if (validateStep1()) setSignupStep(2);
      return;
    }

    if (isSignUp && signupStep === 2 && !validateStep2()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await registerUser(email, password, displayName, phoneNumber, whatsapp, gameProfiles, referralCode);
        toast.success("Account Created! Welcome to Zerox eSports.", {
          description: "You just earned 50 Coins for signing up! Verification logic has been sent to your email.",
          duration: 8000,
          icon: "🎮"
        });
        navigate('/');
      } else {
        await onLogin(email, password, isMasterEmail ? secretKey : undefined);
        navigate(isMasterEmail ? '/master-admin' : '/');
      }
    } catch (err: any) {
      const cleanError = err.message.replace('Firebase: ', '').replace('Error: ', '');
      setError(cleanError || (isSignUp ? 'Registration failed.' : 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    try {
      setLoading(true);
      const { resetPassword } = await import('../services/authService');
      await resetPassword(email);
      alert('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Rendering Helpers ---

  const renderBasicInfo = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-widest">Email Address *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:border-primary focus:outline-none transition-all" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-widest">Password *</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:border-primary focus:outline-none transition-all" minLength={6} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-widest">Display Name *</label>
          <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:border-primary focus:outline-none transition-all" placeholder="Zerox Player" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-widest">Phone Number *</label>
          <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:border-primary focus:outline-none transition-all" placeholder="+91 XXXX" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-widest">WhatsApp Num</label>
          <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:border-primary focus:outline-none transition-all" placeholder="Same as phone if blank" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-purple-400 uppercase tracking-widest">Referral Code (Opt)</label>
          <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="w-full rounded-xl bg-purple-900/20 border border-purple-500/30 p-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-all uppercase placeholder:normal-case font-mono" placeholder="Earn rewards!" />
        </div>
      </div>
    </div>
  );

  const renderGameProfiles = () => (
    <div className="space-y-4 animate-fade-in max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
      {gameProfiles.length === 0 ? (
        <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
          <Gamepad2 className="mx-auto w-8 h-8 text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">No game profiles added yet.</p>
          <p className="text-xs text-gray-500">You can add them later or do it right now to jump into tournaments faster!</p>
        </div>
      ) : (
        gameProfiles.map((p, i) => (
          <div key={i} className="relative bg-white/5 border border-white/10 rounded-xl p-4 transition-all">
            <button type="button" onClick={() => removeGameProfile(i)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
            <div className="space-y-4 pr-6">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Game</label>
                <select value={p.gameId} onChange={(e) => updateGameProfile(i, 'gameId', e.target.value)} className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                  <option value="bgmi">BGMI</option>
                  <option value="freefire">Free Fire MAX</option>
                  <option value="valorant">Valorant</option>
                  <option value="minecraft">Minecraft</option>
                </select>
              </div>

              {p.gameId === 'minecraft' ? (
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Minecraft GamerTag</label>
                  <input type="text" value={p.username || ''} onChange={(e) => updateGameProfile(i, 'username', e.target.value)} className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" placeholder="Your Minecraft Username" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">In-Game Name</label>
                    <input type="text" value={p.inGameName || ''} onChange={(e) => updateGameProfile(i, 'inGameName', e.target.value)} className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" placeholder="Exactly as in-game" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Game UID</label>
                    <input type="text" value={p.gameUID || ''} onChange={(e) => updateGameProfile(i, 'gameUID', e.target.value)} className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary" placeholder="e.g. 512345678" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      <button type="button" onClick={handleAddGameProfile} className="w-full py-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest">
        <Plus size={16} /> Add Game Profile
      </button>
    </div>
  );

  const renderLoginFields = () => (
    <div className="space-y-4 animate-fade-in">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-black/50 border border-zinc-700 p-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all" placeholder="user@example.com" />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-black/50 border border-zinc-700 p-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all" placeholder="••••••••" minLength={6} />
      </div>

      {isMasterEmail && (
        <div className="animate-fade-in-down">
          <label className="mb-2 block text-sm font-medium text-accent">Master Secret Key</label>
          <input type="password" required value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full rounded-xl bg-black/50 border border-accent/50 p-3 text-white placeholder-gray-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-[0_0_10px_rgba(225,29,72,0.2)]" placeholder="Enter secret key..." />
        </div>
      )}
    </div>
  );

  // --- Main Render ---

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-20 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`w-full ${isSignUp ? 'max-w-2xl' : 'max-w-md'} rounded-3xl bg-surface/50 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-md transition-all duration-300`}>
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4 text-primary">
            {isSignUp ? <Swords size={24} /> : <UserIcon size={24} />}
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {isSignUp ? 'Join the Arena' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isSignUp ? 'Create your Zerox profile to compete' : 'Sign in to your Zerox account'}
          </p>
        </div>

        {isSignUp && (
          <div className="flex gap-2 mb-8 max-w-xs mx-auto">
            <div className={`h-1.5 rounded-full flex-1 transition-all ${signupStep >= 1 ? 'bg-primary shadow-[0_0_10px_rgba(235,27,36,0.5)]' : 'bg-white/10'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-all ${signupStep >= 2 ? 'bg-primary shadow-[0_0_10px_rgba(235,27,36,0.5)]' : 'bg-white/10'}`} />
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-900/30 border border-red-800 p-3 text-sm text-red-200 text-center animate-fade-in flex items-center justify-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp ? (signupStep === 1 ? renderBasicInfo() : renderGameProfiles()) : renderLoginFields()}

          <div className="pt-2 flex gap-3">
            {isSignUp && signupStep === 2 && (
              <button type="button" onClick={() => setSignupStep(1)} className="flex-none px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-sm font-bold uppercase tracking-widest transition-all">
                Back
              </button>
            )}
            <button type="submit" disabled={loading} className="flex-1 flex justify-center items-center gap-2 py-3.5 rounded-xl bg-primary text-white font-black tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(235,27,36,0.4)] hover:bg-primary/90 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : (
                isSignUp && signupStep === 1 ? 'Continue' :
                  isSignUp && signupStep === 2 ? 'Complete Setup' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center mt-6 pt-6 border-t border-white/5">
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setSignupStep(1); }} className="text-sm text-gray-400 hover:text-white transition-colors">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
            {!isSignUp && (
              <button type="button" onClick={handleForgotPassword} className="block mx-auto mt-2 text-xs text-primary hover:text-primary/80 transition-colors">
                Forgot Password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
