/**
 * Algorithm Demo Page
 * Design: Clean Blue Glass Tech Style
 * 
 * Showcases the Active Inference adaptive algorithm with:
 * - Key performance metrics hero section
 * - Convergence speed comparison (Adaptive vs Linear)
 * - Convergence steps boxplot by ability level
 * - Entropy reduction visualization
 * - Statistical summary table
 * - Algorithm workflow explanation
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Zap, Target, TrendingDown, BarChart3, Activity,
  CheckCircle, RefreshCw, ChevronDown, Info, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
  Cell, Area, AreaChart, ComposedChart, Scatter
} from 'recharts';
import {
  OVERALL_STATS, ABILITY_LEVEL_SUMMARY, REPRESENTATIVE_TRAJECTORIES,
  CONVERGENCE_RAW_DATA, ALGORITHM_STEPS
} from '@/lib/simulation-data';

// ============================================================
// Sub-components
// ============================================================

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorMap[color]} opacity-10 rounded-bl-[4rem]`} />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} text-white mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: {
  title: string; subtitle: string; icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
        <Icon size={22} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function AlgorithmDemo() {
  const [selectedAbility, setSelectedAbility] = useState(0.5);
  const [showAllLevels, setShowAllLevels] = useState(false);

  // Prepare convergence trajectory data for selected ability
  const trajectoryData = useMemo(() => {
    const adaptive = REPRESENTATIVE_TRAJECTORIES.find(
      t => t.trueAbility === selectedAbility && t.mode === 'Adaptive'
    );
    const linear = REPRESENTATIVE_TRAJECTORIES.find(
      t => t.trueAbility === selectedAbility && t.mode === 'Linear'
    );
    if (!adaptive || !linear) return [];

    const maxStep = Math.max(
      adaptive.trajectory[adaptive.trajectory.length - 1].step,
      linear.trajectory[linear.trajectory.length - 1].step
    );
    const data: { step: number; adaptive?: number; linear?: number; trueAbility: number }[] = [];
    for (let s = 0; s <= maxStep; s++) {
      const aPoint = adaptive.trajectory.find(p => p.step === s);
      const lPoint = linear.trajectory.find(p => p.step === s);
      data.push({
        step: s,
        adaptive: aPoint?.estimatedAbility,
        linear: lPoint?.estimatedAbility,
        trueAbility: selectedAbility,
      });
    }
    // Fill gaps with last known value
    let lastA: number | undefined, lastL: number | undefined;
    for (const d of data) {
      if (d.adaptive !== undefined) lastA = d.adaptive;
      else d.adaptive = lastA;
      if (d.linear !== undefined) lastL = d.linear;
      else d.linear = lastL;
    }
    return data;
  }, [selectedAbility]);

  // Prepare entropy trajectory data
  const entropyData = useMemo(() => {
    const adaptive = REPRESENTATIVE_TRAJECTORIES.find(
      t => t.trueAbility === selectedAbility && t.mode === 'Adaptive'
    );
    const linear = REPRESENTATIVE_TRAJECTORIES.find(
      t => t.trueAbility === selectedAbility && t.mode === 'Linear'
    );
    if (!adaptive || !linear) return [];

    const maxStep = Math.max(
      adaptive.trajectory[adaptive.trajectory.length - 1].step,
      linear.trajectory[linear.trajectory.length - 1].step
    );
    const data: { step: number; adaptive?: number; linear?: number }[] = [];
    for (let s = 0; s <= maxStep; s++) {
      const aPoint = adaptive.trajectory.find(p => p.step === s);
      const lPoint = linear.trajectory.find(p => p.step === s);
      data.push({
        step: s,
        adaptive: aPoint?.entropy,
        linear: lPoint?.entropy,
      });
    }
    let lastA: number | undefined, lastL: number | undefined;
    for (const d of data) {
      if (d.adaptive !== undefined) lastA = d.adaptive;
      else d.adaptive = lastA;
      if (d.linear !== undefined) lastL = d.linear;
      else d.linear = lastL;
    }
    return data;
  }, [selectedAbility]);

  // Prepare boxplot-style data (mean + std for each ability level)
  const boxplotData = useMemo(() => {
    return ABILITY_LEVEL_SUMMARY.map(s => ({
      ability: s.ability.toFixed(1),
      adaptiveMean: s.adaptiveMean,
      adaptiveStd: s.adaptiveStd,
      linearMean: s.linearMean,
      linearStd: s.linearStd,
      adaptiveHigh: Math.min(s.adaptiveMean + s.adaptiveStd, 50),
      adaptiveLow: Math.max(s.adaptiveMean - s.adaptiveStd, 0),
      linearHigh: Math.min(s.linearMean + s.linearStd, 50),
      linearLow: Math.max(s.linearMean - s.linearStd, 0),
    }));
  }, []);

  // Prepare improvement bar chart data
  const improvementData = useMemo(() => {
    return ABILITY_LEVEL_SUMMARY
      .filter(s => s.improvement > 0)
      .map(s => ({
        ability: `θ=${s.ability}`,
        improvement: s.improvement,
        significant: s.significant,
        pValue: s.pValue,
      }));
  }, []);

  const iconMap: Record<string, React.ElementType> = {
    'brain': Brain,
    'target': Target,
    'zap': Zap,
    'activity': Activity,
    'refresh-cw': RefreshCw,
    'check-circle': CheckCircle,
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 text-white shadow-2xl shadow-blue-500/25"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6TTI0IDI0aDEydjJIMjR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Brain size={28} />
            <span className="text-blue-100 text-sm font-medium tracking-wide uppercase">Algorithm Performance Analysis</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Active Inference vs Fixed Sequence</h1>
          <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
            Simulation results from 160 experiments (80 Adaptive + 80 Linear) across 8 ability levels
            demonstrate that the Active Inference algorithm converges significantly faster with higher reliability.
          </p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Faster Convergence"
          value={`${OVERALL_STATS.overallImprovement}%`}
          sub="Adaptive vs Linear"
          color="blue"
        />
        <StatCard
          icon={Target}
          label="p-value"
          value={`${OVERALL_STATS.pValue}`}
          sub="Highly Significant (***)"
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Adaptive Avg Steps"
          value={`${OVERALL_STATS.adaptive.meanSteps}`}
          sub={`vs ${OVERALL_STATS.linear.meanSteps} (Linear)`}
          color="purple"
        />
        <StatCard
          icon={CheckCircle}
          label="Convergence Rate"
          value={`${(OVERALL_STATS.adaptive.convergenceRate * 100).toFixed(0)}%`}
          sub={`vs ${(OVERALL_STATS.linear.convergenceRate * 100).toFixed(0)}% (Linear)`}
          color="amber"
        />
      </div>

      {/* Convergence Speed Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={TrendingDown}
          title="Ability Estimation Convergence"
          subtitle="How quickly each mode estimates the learner's true ability level"
        />

        {/* Ability Level Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[0.3, 0.5, 0.7, 0.9].map(a => (
            <button
              key={a}
              onClick={() => setSelectedAbility(a)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedAbility === a
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              True Ability = {a}
            </button>
          ))}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="step"
                label={{ value: 'Question Number', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                domain={[0, 1]}
                label={{ value: 'Estimated Ability', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [value?.toFixed(3), '']}
              />
              <Legend />
              <ReferenceLine
                y={selectedAbility}
                stroke="#ef4444"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ value: `True Ability (${selectedAbility})`, position: 'right', fill: '#ef4444', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="adaptive"
                name="Adaptive (AI)"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="linear"
                name="Linear (Control)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
                strokeDasharray="5 5"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-100">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            The <strong>blue line</strong> (Adaptive) converges to the red dashed line (true ability) much faster than
            the <strong>orange line</strong> (Linear/Fixed Sequence). This demonstrates that Active Inference selects
            more informative questions, reducing the number of questions needed to accurately estimate ability.
          </p>
        </div>
      </motion.div>

      {/* Entropy Reduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={TrendingDown}
          title="Entropy (Uncertainty) Reduction"
          subtitle="How quickly each mode reduces uncertainty about the learner's ability"
        />

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={entropyData}>
              <defs>
                <linearGradient id="adaptiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="linearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="step"
                label={{ value: 'Question Number', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'Entropy (nats)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: number) => [value?.toFixed(3), '']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="adaptive"
                name="Adaptive (AI)"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#adaptiveGrad)"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="linear"
                name="Linear (Control)"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#linearGrad)"
                strokeDasharray="5 5"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-100">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Entropy measures the system's uncertainty about the learner's ability. Lower entropy = more confident estimate.
            The Adaptive mode reduces entropy faster because it selects questions with the highest <strong>Expected Information Gain (EIG)</strong>.
          </p>
        </div>
      </motion.div>

      {/* Convergence Steps by Ability Level */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={BarChart3}
          title="Convergence Steps by Ability Level"
          subtitle="Average number of questions needed to converge (lower is better)"
        />

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={boxplotData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="ability"
                label={{ value: 'True Ability Level', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'Convergence Steps', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              <Legend />
              <Bar dataKey="adaptiveMean" name="Adaptive (AI)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="linearMean" name="Linear (Control)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Improvement Percentage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={Zap}
          title="Improvement Percentage"
          subtitle="How much faster Adaptive mode converges compared to Linear (only positive improvements shown)"
        />

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={improvementData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                domain={[0, 80]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Improvement (%)', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
              />
              <YAxis
                type="category"
                dataKey="ability"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: number, _: string, entry: any) => [
                  `${value.toFixed(1)}% ${entry.payload.significant ? '(p < 0.05 *)' : '(n.s.)'}`,
                  'Improvement'
                ]}
              />
              <Bar dataKey="improvement" radius={[0, 8, 8, 0]} maxBarSize={32}>
                {improvementData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.significant ? '#3b82f6' : '#93c5fd'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500" /> Statistically Significant (p &lt; 0.05)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-300" /> Not Significant
          </span>
        </div>
      </motion.div>

      {/* Statistical Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={BarChart3}
          title="Statistical Summary"
          subtitle="Detailed comparison across all ability levels with hypothesis testing results"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 text-slate-500 font-semibold">Ability</th>
                <th className="text-center py-3 px-3 text-blue-600 font-semibold">Adaptive Mean</th>
                <th className="text-center py-3 px-3 text-amber-600 font-semibold">Linear Mean</th>
                <th className="text-center py-3 px-3 text-slate-500 font-semibold">Improvement</th>
                <th className="text-center py-3 px-3 text-slate-500 font-semibold">p-value</th>
                <th className="text-center py-3 px-3 text-slate-500 font-semibold">Significant</th>
                <th className="text-center py-3 px-3 text-slate-500 font-semibold">Cohen's d</th>
              </tr>
            </thead>
            <tbody>
              {ABILITY_LEVEL_SUMMARY.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${row.significant ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-3 px-3 font-semibold text-slate-700">{row.ability.toFixed(1)}</td>
                  <td className="py-3 px-3 text-center text-blue-600 font-medium">{row.adaptiveMean.toFixed(1)} <span className="text-slate-400">({row.adaptiveStd.toFixed(1)})</span></td>
                  <td className="py-3 px-3 text-center text-amber-600 font-medium">{row.linearMean.toFixed(1)} <span className="text-slate-400">({row.linearStd.toFixed(1)})</span></td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.improvement > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.improvement > 0 ? '+' : ''}{row.improvement.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{row.pValue.toFixed(4)}</td>
                  <td className="py-3 px-3 text-center">
                    {row.significant ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle size={14} /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{row.cohensD.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-3 px-3 text-slate-700">Overall</td>
                <td className="py-3 px-3 text-center text-blue-600">{OVERALL_STATS.adaptive.meanSteps}</td>
                <td className="py-3 px-3 text-center text-amber-600">{OVERALL_STATS.linear.meanSteps}</td>
                <td className="py-3 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    +{OVERALL_STATS.overallImprovement}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-slate-600">{OVERALL_STATS.pValue}</td>
                <td className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                    <CheckCircle size={14} /> Yes (***)
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-slate-600">{OVERALL_STATS.cohensD}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
          <p className="text-sm text-green-800 font-medium mb-1">Key Finding</p>
          <p className="text-xs text-green-700 leading-relaxed">
            Using Welch's t-test, the Adaptive mode shows a statistically significant advantage over Linear mode
            (t = -3.986, p = 0.000124). The effect size (Cohen's d = {OVERALL_STATS.cohensD}) indicates a <strong>medium</strong> practical
            significance. The Adaptive mode achieves 100% convergence rate compared to 87.5% for Linear mode.
          </p>
        </div>
      </motion.div>

      {/* Algorithm Workflow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg p-6"
      >
        <SectionTitle
          icon={Brain}
          title="How Active Inference Works"
          subtitle="Step-by-step explanation of the adaptive question selection algorithm"
        />

        <div className="space-y-4">
          {ALGORITHM_STEPS.map((step, i) => {
            const StepIcon = iconMap[step.icon] || Brain;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-100 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StepIcon size={16} className="text-blue-500" />
                    <h3 className="font-semibold text-slate-800">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{step.description}</p>
                  <code className="inline-block px-3 py-1.5 rounded-lg bg-slate-800 text-blue-300 text-xs font-mono">
                    {step.formula}
                  </code>
                </div>
                {i < ALGORITHM_STEPS.length - 1 && (
                  <ArrowRight size={16} className="text-slate-300 flex-shrink-0 mt-3" />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Presentation Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6"
      >
        <h2 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
          <Info size={20} />
          Presentation Guide
        </h2>
        <div className="space-y-3 text-sm text-indigo-700 leading-relaxed">
          <p>
            <strong>1. Start with the key result:</strong> "Our Active Inference algorithm achieves 54.4% faster convergence
            than fixed-sequence approaches (p = 0.000124), with 100% convergence rate."
          </p>
          <p>
            <strong>2. Show the convergence chart:</strong> Select ability = 0.5 to demonstrate the most dramatic difference.
            The blue line (Adaptive) reaches the true ability in ~3 steps, while orange (Linear) takes 20+ steps.
          </p>
          <p>
            <strong>3. Highlight entropy reduction:</strong> This shows the information-theoretic advantage — Adaptive mode
            reduces uncertainty faster because it selects questions with maximum Expected Information Gain.
          </p>
          <p>
            <strong>4. Present the statistical table:</strong> Emphasize that 4 out of 8 ability levels show statistically
            significant improvement (p &lt; 0.05), with Cohen's d values indicating medium to large effect sizes.
          </p>
          <p>
            <strong>5. Explain the algorithm:</strong> Walk through the 6 steps, emphasizing that the key innovation is
            using EIG (Expected Information Gain) for question selection rather than a fixed order.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
