import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, StatCard } from '@/components/GlassCard';
import { generateReport, getLevelInfo } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  FileText, Target, BookOpen, Flame, Star, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Brain, Lightbulb, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import {
  exportLearningHistory, exportAbilityTrajectory,
  exportWrongQuestions, exportConceptMastery, exportAllData
} from '@/lib/export-csv';

const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Report() {
  const { user } = useAuth();
  if (!user) return null;

  const report = generateReport(user);
  if (!report) return null;

  const { overview, conceptBreakdown, strengths, weaknesses, recommendations, xp, level, streak, wrongQuestionCount } = report;

  const barData = conceptBreakdown.map(c => ({
    concept: c.concept.length > 10 ? c.concept.slice(0, 8) + '…' : c.concept,
    accuracy: c.accuracy,
    total: c.total,
    fullName: c.concept,
  }));

  const pieData = conceptBreakdown.filter(c => c.total > 0).map(c => ({
    name: c.concept,
    value: c.total,
  }));

  if (overview.totalQuestions === 0) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={22} className="text-blue-500" />
            Study Report
          </h1>
        </div>
        <GlassCard hover={false} className="p-10 text-center">
          <FileText size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Start answering questions to generate your report</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={22} className="text-blue-500" />
            Study Report
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Comprehensive learning analysis & recommendations</p>
        </div>
        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 bg-white/60 backdrop-blur border-blue-200 hover:bg-blue-50"
              onClick={() => exportAllData(user)}
            >
              <Download size={14} />
              Export All CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Export Options Panel */}
      <GlassCard hover={false} className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Download size={16} className="text-blue-500" />
          Data Export for Thesis Analysis
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => exportLearningHistory(user)}
            className="flex items-center gap-2 p-3 rounded-lg bg-blue-50/80 hover:bg-blue-100/80 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Learning History</p>
              <p className="text-[10px] text-muted-foreground">All answers & timestamps</p>
            </div>
          </button>
          <button
            onClick={() => exportAbilityTrajectory(user)}
            className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Ability Trajectory</p>
              <p className="text-[10px] text-muted-foreground">Convergence & entropy</p>
            </div>
          </button>
          <button
            onClick={() => exportWrongQuestions(user)}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50/80 hover:bg-red-100/80 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={14} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Wrong Questions</p>
              <p className="text-[10px] text-muted-foreground">Error analysis data</p>
            </div>
          </button>
          <button
            onClick={() => exportConceptMastery(user)}
            className="flex items-center gap-2 p-3 rounded-lg bg-purple-50/80 hover:bg-purple-100/80 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain size={14} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Concept Mastery</p>
              <p className="text-[10px] text-muted-foreground">Per-concept statistics</p>
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen size={18} />} label="Total Questions" value={overview.totalQuestions} color="blue" />
        <StatCard icon={<Target size={18} />} label="Accuracy" value={`${overview.accuracy}%`} color="green" />
        <StatCard icon={<Flame size={18} />} label="Best Streak" value={overview.bestStreak} color="amber" />
        <StatCard icon={<Star size={18} />} label="Level" value={`Lv.${level.level}`} sub={`${level.title} · ${xp} XP`} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Concept Accuracy */}
        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Brain size={16} className="text-blue-500" />
            Concept Accuracy
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="concept" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.total} Q)`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Question Distribution */}
        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target size={16} className="text-blue-500" />
            Question Distribution
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Strengths
          </h3>
          {strengths.length === 0 ? (
            <p className="text-xs text-muted-foreground">More data needed for analysis</p>
          ) : (
            <div className="space-y-2">
              {strengths.map(s => (
                <div key={s.concept} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50">
                  <span className="text-xs font-medium text-foreground">{s.concept}</span>
                  <span className="text-xs font-bold text-emerald-600">{s.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-red-500 mb-3 flex items-center gap-2">
            <TrendingDown size={16} />
            Weaknesses
          </h3>
          {weaknesses.length === 0 ? (
            <p className="text-xs text-muted-foreground">More data needed for analysis</p>
          ) : (
            <div className="space-y-2">
              {weaknesses.map(w => (
                <div key={w.concept} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50">
                  <span className="text-xs font-medium text-foreground">{w.concept}</span>
                  <span className="text-xs font-bold text-red-500">{w.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            Recommendations
          </h3>
          <div className="space-y-2">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 text-xs text-amber-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Summary */}
      <GlassCard hover={false} className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{streak}</p>
            <p className="text-[10px] text-muted-foreground">Study Streak (days)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{wrongQuestionCount}</p>
            <p className="text-[10px] text-muted-foreground">Questions to Review</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{Math.round(overview.totalStudyTime / 60)}</p>
            <p className="text-[10px] text-muted-foreground">Total Study Time (min)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{Object.keys(overview.conceptStats).length}</p>
            <p className="text-[10px] text-muted-foreground">Concepts Studied</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
