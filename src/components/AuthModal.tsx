import React, { useState, useEffect } from 'react';
import { X, Settings, LogOut } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'initial' | 'login' | 'signup' | 'profile';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('initial');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setMode('profile');
      } else {
        setMode('initial');
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRepeatPassword('');
    setNickname('');
    setError('');
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
      // Mode will auto-switch via onAuthStateChanged
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        if (password !== repeatPassword) {
          throw new Error("Passwords don't match");
        }
        if (!nickname.trim()) {
          throw new Error("Nickname is required");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: nickname.trim()
        });
        // Force refresh user to get new display name
        setUser({ ...userCredential.user });
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMode('initial');
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  const renderInitial = () => (
    <div className="flex flex-row justify-center gap-4 w-full mt-4">
      <button
        onClick={() => handleModeChange('login')}
        className="flex-1 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black px-4 py-2.5 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all"
      >
        Log in
      </button>
      <button
        onClick={() => handleModeChange('signup')}
        className="flex-1 bg-[#111116] text-[#00f2fe] border border-[#00f2fe]/50 px-4 py-2.5 rounded-xl font-medium hover:bg-[#00f2fe]/10 hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all"
      >
        Sign up
      </button>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 w-full">
      {mode === 'signup' && (
        <input
          type="text"
          placeholder="Come up with a nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
          required
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
        required
      />
      {mode === 'signup' && (
        <input
          type="password"
          placeholder="Repeat password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
          required
        />
      )}
      
      {error && <div className="text-red-400 text-xs mt-1">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black px-6 py-3 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">or</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="w-full bg-[#1a1a24] text-white border border-white/10 px-6 py-3 rounded-xl font-medium hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => handleModeChange('initial')}
        className="mt-4 text-gray-400 hover:text-white text-sm"
      >
        Back
      </button>
    </form>
  );

  const renderProfile = () => {
    // Determine display name and avatar
    const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
    const photoURL = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

    return (
      <div className="flex flex-col w-full h-full">
        {/* Profile Header */}
        <div className="flex justify-between items-center mb-8 w-full">
          <button className="text-gray-400 hover:text-white transition-colors p-2 -ml-2">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00f2fe]/30 shadow-[0_0_20px_rgba(0,242,254,0.15)] mb-4 bg-[#1a1a24]">
            <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-medium text-white mb-1">{displayName}</h3>
          <p className="text-gray-400 text-sm mb-8">{user?.email}</p>

          <div className="flex-1 w-full flex flex-col items-center justify-center border-t border-white/5 py-8 mt-4">
             <p className="text-gray-500 text-sm italic">Workspace reserved for saved styles and library...</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full mt-auto bg-white/5 text-red-400 border border-red-500/20 px-6 py-3 rounded-xl font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className={cn(
          "bg-[#111116] border border-[#00f2fe]/20 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_40px_rgba(0,242,254,0.1)] animate-in fade-in zoom-in-95 relative flex flex-col items-center",
          mode === 'profile' ? "min-h-[500px]" : ""
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {mode !== 'profile' && (
          <div className="w-full flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#00f2fe] to-[#4facfe] drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">
              {mode === 'initial' ? 'Welcome' : mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white p-2 transition-colors -mr-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {mode === 'initial' && renderInitial()}
        {(mode === 'login' || mode === 'signup') && renderForm()}
        {mode === 'profile' && renderProfile()}
      </div>
    </div>
  );
};
