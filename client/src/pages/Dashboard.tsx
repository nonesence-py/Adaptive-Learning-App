import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, StatCard } from '@/components/GlassCard';
import { getLevelInfo, getReviewStats, getChallengeHistory } from '@/lib/store';
import { questions, CONCEPTS } from '@/lib/questions';
import { motion } from 'framer-motion';
import {
  Brain, Target, Flame, Star, BookOpen, Clock, TrendingUp, Zap
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { useLocation } from 'wouter';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [, navigate] = useLocation();

  if (!profile || !user) return null;

  const levelInfo = getLevelInfo(profile.xp);
  const reviewStats = getReviewStats(user);
  const challengeHistory = getChallengeHistory(user);

  // Concept mastery for radar chart
  const radarData = CONCEPTS.map(c => {
    const s = profile.stats.conceptStats[c];
    const accuracy = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return { concept: c.length > 12 ? c.slice(0, 10) + '…' : c, accuracy, fullName: c };
  });

  // Ability trend from session history
  const trendData = profile.sessionHistory.slice(-30).reduce((acc, entry, i) => {
    const correct = profile.sessionHistory.slice(0, i + 1).filter(e => e.correct).length;
    const total = i + 1;
    acc.push({
      index: i + 1,
      accuracy: Math.round((correct / total) * 100),
    });
    return acc;
  }, [] as { index: number; accuracy: number }[]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl lg:text-3xl font-extrabold text-foreground"
          >
            Welcome back, {user}
          </motion.h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
        </div>
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/learn')}
          className="btn-blue px-5 py-2.5 text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Brain size={16} />
          Start Learning
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen size={20} />}
          label="Questions"
          value={profile.stats.totalQuestions}
          sub={`Today ${profile.dailyProgress}/${profile.dailyGoal}`}
          color="blue"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Accuracy"
          value={`${profile.stats.accuracy}%`}
          sub={`${profile.stats.correctAnswers}/${profile.stats.totalQuestions}`}
          color="green"
        />
        <StatCard
          icon={<Flame size={20} />}
          label="Best Streak"
          value={profile.stats.bestStreak}
          sub={`Current ${profile.stats.currentStreak}`}
          color="amber"
        />
        <StatCard
          icon={<Star size={20} />}
          label="Experience"
          value={`${profile.xp} XP`}
          sub={`${levelInfo.icon} Lv.${levelInfo.level} ${levelInfo.title}`}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain size={16} className="text-blue-500" />
            Concept Mastery
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(59,130,246,0.15)" />
                <PolarAngleAxis
                  dataKey="concept"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                />
                <Radar
                  name="Mastery"
                  dataKey="accuracy"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Accuracy Trend */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Accuracy Trend
          </h3>
          <div className="h-[280px]">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                  <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.8)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#3B82F6"
                    fill="url(#blueGrad)"
                    strokeWidth={2}
                    name="Accuracy %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Start answering questions to see your trend
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Timed Challenge', icon: Clock, path: '/challenge', desc: `${challengeHistory.length} completed`, color: 'from-amber-500 to-orange-500' },
          { label: 'Wrong Questions', icon: BookOpen, path: '/wrong-questions', desc: `${profile.wrongQuestions.filter(w => !w.mastered).length} to review`, color: 'from-red-500 to-pink-500' },
          { label: 'Spaced Review', icon: Zap, path: '/review', desc: `${reviewStats.dueToday} due today`, color: 'from-emerald-500 to-teal-500' },
          { label: 'Knowledge Graph', icon: Brain, path: '/knowledge-graph', desc: 'View knowledge map', color: 'from-violet-500 to-purple-500' },
        ].map((item) => (
          <motion.button
            key={item.path}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(item.path)}
            className="glass-card p-4 text-left group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-3 group-hover:shadow-lg transition-shadow`}>
              <item.icon size={18} />
            </div>
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
