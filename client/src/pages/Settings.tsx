import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getUserProfile, saveUserProfile, resetUserData } from '@/lib/store';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Target, Save, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, refreshProfile, logout } = useAuth();
  const profile = user ? getUserProfile(user) : null;
  const [dailyGoal, setDailyGoal] = useState(profile?.dailyGoal || 10);
  const [showReset, setShowReset] = useState(false);

  if (!profile || !user) return null;

  const handleSave = () => {
    profile.dailyGoal = dailyGoal;
    saveUserProfile(profile);
    refreshProfile();
    toast.success('Settings saved');
  };

  const handleReset = () => {
    resetUserData(user);
    refreshProfile();
    toast.success('Data has been reset');
    setShowReset(false);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon size={22} className="text-gray-500" />
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Personalize your learning experience</p>
      </div>

      {/* Daily Goal */}
      <GlassCard hover={false} className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target size={16} className="text-blue-500" />
          Daily Learning Goal
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={50}
            value={dailyGoal}
            onChange={e => setDailyGoal(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-lg font-bold text-foreground w-12 text-center">{dailyGoal}</span>
          <span className="text-xs text-muted-foreground">Q/day</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="btn-blue px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Save size={14} />
          Save Settings
        </motion.button>
      </GlassCard>

      {/* Account Info */}
      <GlassCard hover={false} className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Account Info</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-3 rounded-lg bg-white/50">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium text-foreground">{user}</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-white/50">
            <span className="text-muted-foreground">Registered</span>
            <span className="font-medium text-foreground">
              {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-white/50">
            <span className="text-muted-foreground">Total Questions</span>
            <span className="font-medium text-foreground">{profile.stats.totalQuestions}</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-white/50">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium text-foreground">Local (localStorage)</span>
          </div>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard hover={false} className="p-5 space-y-3 border-red-200">
        <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
          <AlertTriangle size={16} />
          Danger Zone
        </h3>
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            Reset All Learning Data
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
            <p className="text-xs text-red-600">
              This will clear all learning records, achievements, wrong questions, and notes. This action cannot be undone!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
