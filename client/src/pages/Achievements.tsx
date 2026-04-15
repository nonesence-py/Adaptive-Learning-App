import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getLevelInfo, LEVELS } from '@/lib/store';
import { motion } from 'framer-motion';
import { Trophy, Lock, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Achievements() {
  const { profile } = useAuth();
  if (!profile) return null;

  const levelInfo = getLevelInfo(profile.xp);
  const unlocked = profile.achievements.filter(a => a.unlockedAt);
  const locked = profile.achievements.filter(a => !a.unlockedAt);

  const categories = [
    { key: 'milestone', label: 'Milestone' },
    { key: 'streak', label: 'Streak' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'knowledge', label: 'Knowledge' },
    { key: 'review', label: 'Review' },
    { key: 'habit', label: 'Habit' },
    { key: 'special', label: 'Special' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" />
          Achievements
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {unlocked.length}/{profile.achievements.length} unlocked
        </p>
      </div>

      {/* Level & XP Card */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
            {levelInfo.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Lv.{levelInfo.level} {levelInfo.title}</h2>
            <p className="text-sm text-muted-foreground">{profile.xp} XP</p>
          </div>
        </div>
        {/* Level Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Level Progress</span>
            <span>{levelInfo.xpForNext ? `${levelInfo.xpForNext} XP to next level` : 'Max Level'}</span>
          </div>
          <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.xpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
        {/* Level Roadmap */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {LEVELS.map(l => (
            <div
              key={l.level}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap shrink-0',
                profile.level >= l.level
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-white/40 text-muted-foreground'
              )}
            >
              <span>{l.icon}</span>
              <span>Lv.{l.level}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Achievement Grid by Category */}
      {categories.map(cat => {
        const catAchievements = profile.achievements.filter(a => a.category === cat.key);
        if (catAchievements.length === 0) return null;
        return (
          <div key={cat.key}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star size={14} className="text-blue-500" />
              {cat.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catAchievements.map(ach => {
                const isUnlocked = !!ach.unlockedAt;
                const progress = Math.min((ach.progress / ach.target) * 100, 100);
                return (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={isUnlocked ? { scale: 1.02 } : undefined}
                  >
                    <GlassCard
                      hover={false}
                      className={cn('p-4', !isUnlocked && 'opacity-60')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
                          isUnlocked
                            ? 'bg-gradient-to-br from-amber-100 to-amber-200 shadow-sm'
                            : 'bg-gray-100'
                        )}>
                          {isUnlocked ? ach.icon : <Lock size={18} className="text-gray-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-foreground">{ach.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ach.description}</p>
                          {isUnlocked ? (
                            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                              <Zap size={10} />
                              Unlocked {new Date(ach.unlockedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          ) : (
                            <div className="mt-1.5">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ach.progress}/{ach.target}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
