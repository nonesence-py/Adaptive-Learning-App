import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createUser, loginUser } from '@/lib/store';
import { DEMO_ACCOUNTS, resetDemoData } from '@/lib/demo-data';
import { motion } from 'framer-motion';
import { Zap, User, Lock, ArrowRight, UserPlus, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

const HERO_IMG = '';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (isRegister) {
        const ok = createUser(username.trim(), password);
        if (ok) {
          toast.success('Account created successfully!');
          login(username.trim());
          navigate('/dashboard');
        } else {
          toast.error('Username already exists');
        }
      } else {
        const ok = loginUser(username.trim(), password);
        if (ok) {
          toast.success('Welcome back!');
          login(username.trim());
          navigate('/dashboard');
        } else {
          toast.error('Invalid username or password');
        }
      }
      setLoading(false);
    }, 300);
  };

  const handleGuest = () => {
    const guestName = `guest_${Date.now().toString(36)}`;
    createUser(guestName, 'guest');
    login(guestName);
    toast.success('Guest account created');
    navigate('/dashboard');
  };

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    login(account.username);
    toast.success(`Logged in as ${account.username}`);
    navigate('/dashboard');
  };

  const handleResetDemo = () => {
    resetDemoData();
    toast.success('Demo data has been reset');
  };

  const levelColors: Record<string, string> = {
    'Alice': 'from-blue-500 to-cyan-500',
    'Bob': 'from-amber-500 to-orange-500',
    'Carol': 'from-emerald-500 to-teal-500',
    'David': 'from-purple-500 to-pink-500',
  };

  const levelIcons: Record<string, string> = {
    'Alice': '🏅',
    'Bob': '⚡',
    'Carol': '📖',
    'David': '👑',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full grid lg:grid-cols-2 gap-0 glass-card overflow-hidden p-0"
        >
          {/* Left - Branding */}
          <div className="hidden lg:flex flex-col justify-center p-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-6">
                <Zap size={28} />
              </div>
              <h2 className="text-3xl font-extrabold mb-3">AdaptLearn</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                An intelligent adaptive learning platform powered by Active Inference and IRT models.
                Algorithm-driven personalized question selection matches every question to your ability level.
              </p>
              <div className="space-y-3 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                  Active Inference Question Selection
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                  SM-2 Spaced Repetition Algorithm
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                  Knowledge Graph & Learning Paths
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                  Real-time Algorithm Visualization
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="p-8 lg:p-10 flex flex-col justify-center">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold">AdaptLearn</h1>
                <p className="text-xs text-muted-foreground">Intelligent Learning</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {isRegister ? 'Sign up to start your learning journey' : 'Sign in to continue your learning journey'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isRegister ? <UserPlus size={16} /> : <ArrowRight size={16} />}
                    {isRegister ? 'Sign Up' : 'Sign In'}
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleGuest}
                className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Try as Guest
              </button>
              <button
                onClick={() => setShowDemoPanel(!showDemoPanel)}
                className="flex-1 py-2.5 rounded-xl border border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Users size={14} />
                Demo Accounts
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-blue-500 font-medium ml-1 hover:underline"
              >
                {isRegister ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Demo Accounts Panel */}
        {showDemoPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Demo Accounts</h3>
                  <p className="text-[10px] text-muted-foreground">Pre-populated with realistic learning data for demonstration</p>
                </div>
              </div>
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                <RefreshCw size={12} />
                Reset Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEMO_ACCOUNTS.map(account => (
                <motion.button
                  key={account.username}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDemoLogin(account)}
                  className="text-left p-4 rounded-xl bg-white/60 backdrop-blur border border-white/50 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${levelColors[account.username] || 'from-blue-500 to-cyan-500'} flex items-center justify-center text-lg`}>
                      {levelIcons[account.username] || '🎓'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">{account.username}</p>
                      <p className="text-[10px] text-muted-foreground">Password: {account.password}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{account.description}</p>
                  <div className="mt-2 text-[10px] font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <ArrowRight size={10} /> Click to login
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-lg bg-amber-50/80 border border-amber-100">
              <p className="text-[10px] text-amber-700">
                <strong>Presentation Tip:</strong> Login as <strong>David</strong> (Expert) to showcase the richest data, or compare <strong>Alice</strong> (Advanced) vs <strong>Carol</strong> (Beginner) to demonstrate how the adaptive algorithm adjusts to different ability levels. Check the <strong>Algorithm Demo</strong> page for simulation comparison data.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
