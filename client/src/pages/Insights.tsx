import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, StatCard } from '@/components/GlassCard';
import { getUserProfile } from '@/lib/store';
import {
  BarChart3, Clock, TrendingUp, Brain, Calendar, Activity,
  Zap, GitCompare, ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { exportLearningHistory, exportAbilityTrajectory } from '@/lib/export-csv';

const tooltipStyle = {
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(59,130,246,0.15)',
  borderRadius: '12px',
  fontSize: '11px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export default function Insights() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user) : null;

  const data = useMemo(() => {
    if (!profile) return null;

    const sessions = profile.sessionHistory;
    if (sessions.length === 0) return null;

    // Separate by mode
    const adaptiveSessions = sessions.filter(s => s.mode === 'adaptive' || !s.mode);
    const fixedSessions = sessions.filter(s => s.mode === 'fixed');

    // Daily breakdown
    const dailyMap: Record<string, { total: number; correct: number; time: number }> = {};
    for (const s of sessions) {
      const day = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyMap[day]) dailyMap[day] = { total: 0, correct: 0, time: 0 };
      dailyMap[day].total++;
      if (s.correct) dailyMap[day].correct++;
      dailyMap[day].time += s.timeSpent;
    }
    const dailyData = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      total: d.total,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
      avgTime: d.total > 0 ? Math.round(d.time / d.total) : 0,
    }));

    // Hourly distribution
    const hourMap: Record<number, number> = {};
    for (const s of sessions) {
      const hour = new Date(s.timestamp).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      count: hourMap[h] || 0,
    }));

    // Average time per question
    const totalTime = sessions.reduce((sum, s) => sum + s.timeSpent, 0);
    const avgTime = sessions.length > 0 ? Math.round(totalTime / sessions.length) : 0;

    // Study streak
    const uniqueDays = new Set(sessions.map(s => new Date(s.timestamp).toDateString()));

    // Difficulty distribution
    const diffMap = { easy: 0, medium: 0, hard: 0 };
    for (const s of sessions) {
      if (s.difficulty < 0.3) diffMap.easy++;
      else if (s.difficulty < 0.6) diffMap.medium++;
      else diffMap.hard++;
    }

    // ===== Adaptive vs Fixed Comparison =====
    const calcModeStats = (arr: typeof sessions) => {
      const total = arr.length;
      const correct = arr.filter(s => s.correct).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const avgT = total > 0 ? Math.round(arr.reduce((s, e) => s + e.timeSpent, 0) / total) : 0;

      // Concept accuracy
      const conceptMap: Record<string, { total: number; correct: number }> = {};
      for (const s of arr) {
        if (!conceptMap[s.concept]) conceptMap[s.concept] = { total: 0, correct: 0 };
        conceptMap[s.concept].total++;
        if (s.correct) conceptMap[s.concept].correct++;
      }

      // Difficulty accuracy
      const diffAcc = { easy: { t: 0, c: 0 }, medium: { t: 0, c: 0 }, hard: { t: 0, c: 0 } };
      for (const s of arr) {
        const d = s.difficulty < 0.3 ? 'easy' : s.difficulty < 0.6 ? 'medium' : 'hard';
        diffAcc[d].t++;
        if (s.correct) diffAcc[d].c++;
      }

      // Rolling accuracy (every 5 questions)
      const rolling: { step: number; accuracy: number }[] = [];
      let rc = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].correct) rc++;
        if ((i + 1) % 5 === 0 || i === arr.length - 1) {
          rolling.push({ step: i + 1, accuracy: Math.round((rc / (i + 1)) * 100) });
        }
      }

      // Ability trajectory
      const abilityTrajectory = arr
        .filter(s => s.abilityAfter !== undefined)
        .map((s, i) => ({ step: i + 1, ability: s.abilityAfter! }));

      // Entropy trajectory
      const entropyTrajectory = arr
        .filter(s => s.entropyAfter !== undefined)
        .map((s, i) => ({ step: i + 1, entropy: s.entropyAfter! }));

      return {
        total, correct, accuracy, avgTime: avgT,
        conceptMap, diffAcc, rolling, abilityTrajectory, entropyTrajectory
      };
    };

    const adaptiveStats = calcModeStats(adaptiveSessions);
    const fixedStats = calcModeStats(fixedSessions);

    // Concept comparison radar data
    const allConcepts = new Set([
      ...Object.keys(adaptiveStats.conceptMap),
      ...Object.keys(fixedStats.conceptMap)
    ]);
    const conceptRadarData = Array.from(allConcepts).map(concept => ({
      concept: concept.length > 12 ? concept.slice(0, 10) + '…' : concept,
      fullName: concept,
      adaptive: adaptiveStats.conceptMap[concept]
        ? Math.round((adaptiveStats.conceptMap[concept].correct / adaptiveStats.conceptMap[concept].total) * 100)
        : 0,
      fixed: fixedStats.conceptMap[concept]
        ? Math.round((fixedStats.conceptMap[concept].correct / fixedStats.conceptMap[concept].total) * 100)
        : 0,
    }));

    // Merge rolling accuracy for comparison chart
    const maxSteps = Math.max(
      adaptiveStats.rolling.length,
      fixedStats.rolling.length
    );
    const rollingComparison = Array.from({ length: maxSteps }, (_, i) => ({
      step: (i + 1) * 5,
      adaptive: adaptiveStats.rolling[i]?.accuracy ?? null,
      fixed: fixedStats.rolling[i]?.accuracy ?? null,
    }));

    // Merge ability trajectories
    const maxAbilitySteps = Math.max(
      adaptiveStats.abilityTrajectory.length,
      fixedStats.abilityTrajectory.length
    );
    const abilityComparison = Array.from({ length: maxAbilitySteps }, (_, i) => ({
      step: i + 1,
      adaptive: adaptiveStats.abilityTrajectory[i]?.ability ?? null,
      fixed: fixedStats.abilityTrajectory[i]?.ability ?? null,
    }));

    return {
      dailyData, hourlyData, avgTime, totalTime,
      totalSessions: sessions.length,
      uniqueDays: uniqueDays.size,
      diffMap,
      adaptiveStats, fixedStats,
      conceptRadarData, rollingComparison, abilityComparison,
      hasComparison: adaptiveSessions.length > 0 && fixedSessions.length > 0,
      hasAdaptive: adaptiveSessions.length > 0,
      hasFixed: fixedSessions.length > 0,
    };
  }, [profile]);

  if (!data) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={22} className="text-cyan-500" />
            Learning Insights
          </h1>
        </div>
        <GlassCard hover={false} className="p-10 text-center">
          <BarChart3 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Start answering questions to generate insights</p>
        </GlassCard>
      </div>
    );
  }

  const MetricDelta = ({ adaptive, fixed, label, unit = '', higherBetter = true }: {
    adaptive: number; fixed: number; label: string; unit?: string; higherBetter?: boolean;
  }) => {
    const delta = adaptive - fixed;
    const better = higherBetter ? delta > 0 : delta < 0;
    const pct = fixed > 0 ? Math.round(Math.abs(delta) / fixed * 100) : 0;
    return (
      <div className="p-3 rounded-xl bg-white/60 backdrop-blur border border-white/40">
        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-lg font-bold text-blue-600">{adaptive}{unit}</span>
            <span className="text-xs text-muted-foreground mx-1">vs</span>
            <span className="text-lg font-bold text-orange-500">{fixed}{unit}</span>
          </div>
          {delta !== 0 && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${better ? 'text-emerald-600' : 'text-red-500'}`}>
              {better ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {pct > 0 ? `${pct}%` : `${Math.abs(delta)}${unit}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={22} className="text-cyan-500" />
            Learning Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Deep dive into your learning patterns and mode comparison</p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 bg-white/60 backdrop-blur border-blue-200 hover:bg-blue-50"
              onClick={() => exportLearningHistory(user)}
            >
              <Download size={14} /> Export History
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 bg-white/60 backdrop-blur border-blue-200 hover:bg-blue-50"
              onClick={() => exportAbilityTrajectory(user)}
            >
              <Download size={14} /> Export Trajectory
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Activity size={18} />} label="Total Questions" value={data.totalSessions} color="blue" />
        <StatCard icon={<Clock size={18} />} label="Avg. Time" value={`${data.avgTime}s`} color="amber" />
        <StatCard icon={<Calendar size={18} />} label="Active Days" value={data.uniqueDays} color="green" />
        <StatCard icon={<Brain size={18} />} label="Total Study Time" value={`${Math.round(data.totalTime / 60)}m`} color="purple" />
      </div>

      {/* ===== ADAPTIVE VS FIXED COMPARISON ===== */}
      <GlassCard hover={false} className="border-2 border-blue-100/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <GitCompare size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Adaptive vs Fixed Sequence Comparison</h2>
            <p className="text-[10px] text-muted-foreground">Real-time performance comparison between learning modes</p>
          </div>
        </div>

        {!data.hasComparison ? (
          <div className="text-center py-6">
            <GitCompare size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {!data.hasAdaptive && !data.hasFixed
                ? 'Answer questions in both Adaptive and Fixed modes to see comparison'
                : !data.hasFixed
                  ? 'Try Fixed Sequence mode in Adaptive Learning page to enable comparison'
                  : 'Try Adaptive mode in Adaptive Learning page to enable comparison'
              }
            </p>
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span>Adaptive: {data.adaptiveStats.total} questions</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-sm bg-orange-500" />
                <span>Fixed: {data.fixedStats.total} questions</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Metrics Comparison */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricDelta
                adaptive={data.adaptiveStats.accuracy}
                fixed={data.fixedStats.accuracy}
                label="Accuracy"
                unit="%"
                higherBetter={true}
              />
              <MetricDelta
                adaptive={data.adaptiveStats.avgTime}
                fixed={data.fixedStats.avgTime}
                label="Avg. Time per Q"
                unit="s"
                higherBetter={false}
              />
              <MetricDelta
                adaptive={data.adaptiveStats.total}
                fixed={data.fixedStats.total}
                label="Questions Answered"
                higherBetter={true}
              />
              <MetricDelta
                adaptive={data.adaptiveStats.correct}
                fixed={data.fixedStats.correct}
                label="Correct Answers"
                higherBetter={true}
              />
            </div>

            {/* Rolling Accuracy Comparison */}
            {data.rollingComparison.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-blue-500" />
                  Rolling Accuracy Comparison
                </h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.rollingComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                      <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Questions', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="adaptive" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} name="Adaptive" connectNulls />
                      <Line type="monotone" dataKey="fixed" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3 }} name="Fixed Sequence" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ability Convergence Comparison */}
            {data.abilityComparison.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Brain size={14} className="text-purple-500" />
                  Ability Estimation Convergence
                </h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.abilityComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                      <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Steps', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v !== null ? v.toFixed(3) : 'N/A'} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="adaptive" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 2 }} name="Adaptive" connectNulls />
                      <Line type="monotone" dataKey="fixed" stroke="#F97316" strokeWidth={2.5} dot={{ r: 2 }} name="Fixed Sequence" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Concept Accuracy Radar */}
            {data.conceptRadarData.length > 2 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" />
                  Concept Accuracy by Mode
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data.conceptRadarData}>
                      <PolarGrid stroke="rgba(59,130,246,0.12)" />
                      <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Radar name="Adaptive" dataKey="adaptive" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                      <Radar name="Fixed" dataKey="fixed" stroke="#F97316" fill="#F97316" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Difficulty Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Accuracy by Difficulty Level</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(diff => {
                  const aD = data.adaptiveStats.diffAcc[diff];
                  const fD = data.fixedStats.diffAcc[diff];
                  const aAcc = aD.t > 0 ? Math.round((aD.c / aD.t) * 100) : 0;
                  const fAcc = fD.t > 0 ? Math.round((fD.c / fD.t) * 100) : 0;
                  const colors = { easy: 'emerald', medium: 'amber', hard: 'red' };
                  const color = colors[diff];
                  return (
                    <div key={diff} className={`p-3 rounded-xl bg-${color}-50/60 border border-${color}-100/50`}>
                      <p className={`text-xs font-semibold text-${color}-600 capitalize mb-2`}>{diff}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-600 font-medium">Adaptive</span>
                          <span className="text-xs font-bold text-blue-600">{aAcc}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-blue-100">
                          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${aAcc}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-orange-600 font-medium">Fixed</span>
                          <span className="text-xs font-bold text-orange-600">{fAcc}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-orange-100">
                          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${fAcc}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Daily Activity */}
      <GlassCard hover={false}>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          Daily Activity
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Questions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Daily Accuracy Trend */}
      <GlassCard hover={false}>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" />
          Daily Accuracy Trend
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyData}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="accuracy" stroke="#10B981" fill="url(#greenGrad)" strokeWidth={2} name="Accuracy %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Hourly Distribution */}
      <GlassCard hover={false}>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Study Time Distribution
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Questions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Difficulty Distribution */}
      <GlassCard hover={false}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Difficulty Distribution</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Easy', count: data.diffMap.easy, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Medium', count: data.diffMap.medium, color: 'bg-amber-100 text-amber-600' },
            { label: 'Hard', count: data.diffMap.hard, color: 'bg-red-100 text-red-600' },
          ].map(d => (
            <div key={d.label} className={`p-4 rounded-xl text-center ${d.color}`}>
              <p className="text-2xl font-bold">{d.count}</p>
              <p className="text-xs font-medium mt-1">{d.label}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
