import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getLeaderboard, getLevelInfo } from '@/lib/store';
import { motion } from 'framer-motion';
import { Crown, Medal, Trophy, Star, Target, Flame, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Leaderboard() {
  const { user } = useAuth();

  const leaderboard = getLeaderboard();

  const sorted = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.xp - a.xp);
  }, [leaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-amber-500" />;
    if (rank === 2) return <Medal size={18} className="text-gray-400" />;
    if (rank === 3) return <Medal size={18} className="text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground w-[18px] text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-200';
    return '';
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" />
          Leaderboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compare with other learners (data stored locally)
        </p>
      </div>

      {sorted.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Trophy size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No leaderboard data yet</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, i) => {
            const rank = i + 1;
            const levelInfo = getLevelInfo(entry.xp);
            const isCurrentUser = entry.username === user;
            return (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard
                  hover={false}
                  className={cn(
                    'p-4',
                    getRankBg(rank),
                    isCurrentUser && 'ring-2 ring-blue-400/50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-8 flex justify-center shrink-0">
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0',
                      rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                      'bg-blue-100 text-blue-600'
                    )}>
                      {levelInfo.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {entry.username}
                          {isCurrentUser && <span className="text-[10px] text-blue-500 ml-1">(You)</span>}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Lv.{levelInfo.level} {levelInfo.title}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1" title="Accuracy">
                        <Target size={12} className="text-emerald-500" />
                        <span>{entry.accuracy}%</span>
                      </div>
                      <div className="flex items-center gap-1" title="Streak">
                        <Flame size={12} className="text-amber-500" />
                        <span>{entry.bestStreak}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Questions">
                        <BookOpen size={12} className="text-blue-500" />
                        <span>{entry.totalQuestions}</span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1">
                        <Star size={14} className="text-amber-500" />
                        {entry.xp}
                      </p>
                      <p className="text-[10px] text-muted-foreground">XP</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
