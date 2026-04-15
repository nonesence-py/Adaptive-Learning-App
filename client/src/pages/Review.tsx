import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, StatCard } from '@/components/GlassCard';
import { getDueReviews, recordReview, getReviewStats } from '@/lib/store';
import { getQuestionById } from '@/lib/questions';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Calendar, Brain, CheckCircle2, XCircle, ArrowRight, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function Review() {
  const { user, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  if (!user) return null;

  const dueReviews = getDueReviews(user);
  const stats = getReviewStats(user);
  const forecastData = Object.entries(stats.forecast).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  const handleReveal = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
    setShowAnswer(true);
  };

  const handleRate = (quality: number) => {
    const review = dueReviews[currentIndex];
    if (!review) return;
    recordReview(user, review.questionId, quality);
    refreshProfile();
    toast.success(quality >= 3 ? 'Remembered!' : 'Keep going!', { duration: 1000 });

    setShowAnswer(false);
    setSelectedAnswer(null);
    startTime.current = Date.now();
    if (currentIndex + 1 < dueReviews.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const currentReview = dueReviews[currentIndex];
  const currentQuestion = currentReview ? getQuestionById(currentReview.questionId) : null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <RefreshCw size={22} className="text-emerald-500" />
          Spaced Review
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Scientific review system based on SM-2 algorithm</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Brain size={18} />} label="Total Cards" value={stats.totalCards} color="blue" />
        <StatCard icon={<Calendar size={18} />} label="Due Today" value={stats.dueToday} color="amber" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Retention" value={`${stats.retentionRate}%`} color="green" />
        <StatCard icon={<BarChart3 size={18} />} label="Total Reviews" value={stats.totalReviews} color="purple" />
      </div>

      {/* Forecast Chart */}
      {forecastData.some(d => d.count > 0) && (
        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold text-foreground mb-3">7-Day Review Forecast</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Due Cards" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Review Card */}
      {dueReviews.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">All reviews done for today!</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalCards > 0 ? 'Come back tomorrow for more reviews' : 'Wrong answers will automatically be added to the review queue'}
          </p>
        </GlassCard>
      ) : currentQuestion ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentReview.questionId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard hover={false} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600">
                  {currentQuestion.concept}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1}/{dueReviews.length}
                </span>
              </div>

              <h2 className="text-base font-semibold text-foreground leading-relaxed mb-5">
                {currentQuestion.question}
              </h2>

              {/* Options */}
              <div className="space-y-2.5">
                {[
                  { key: 'A', text: currentQuestion.option_a },
                  { key: 'B', text: currentQuestion.option_b },
                  { key: 'C', text: currentQuestion.option_c },
                  { key: 'D', text: currentQuestion.option_d },
                ].map(opt => {
                  const isSelected = selectedAnswer === opt.key;
                  const isCorrectAnswer = opt.key === currentQuestion.correct_answer;
                  let style = 'bg-white/60 border-white/80 hover:bg-blue-50/50';
                  if (showAnswer) {
                    if (isCorrectAnswer) style = 'bg-emerald-50 border-emerald-300';
                    else if (isSelected) style = 'bg-red-50 border-red-300';
                    else style = 'bg-white/40 border-white/60 opacity-50';
                  }
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleReveal(opt.key)}
                      disabled={showAnswer}
                      className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-start gap-3', style)}
                    >
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        showAnswer && isCorrectAnswer ? 'bg-emerald-500 text-white' :
                        showAnswer && isSelected && !isCorrectAnswer ? 'bg-red-500 text-white' :
                        'bg-blue-100 text-blue-600'
                      )}>
                        {showAnswer && isCorrectAnswer ? <CheckCircle2 size={14} /> :
                         showAnswer && isSelected && !isCorrectAnswer ? <XCircle size={14} /> : opt.key}
                      </span>
                      <span className="pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Rating */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-3 rounded-lg bg-blue-50/50 text-xs text-blue-700">
                      {currentQuestion.explanation}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">How well did you remember this?</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { q: 0, label: 'Forgot', color: 'bg-red-100 text-red-600 hover:bg-red-200' },
                          { q: 1, label: 'Vague', color: 'bg-orange-100 text-orange-600 hover:bg-orange-200' },
                          { q: 2, label: 'Familiar', color: 'bg-amber-100 text-amber-600 hover:bg-amber-200' },
                          { q: 3, label: 'Recalled', color: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
                          { q: 4, label: 'Clear', color: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' },
                          { q: 5, label: 'Perfect', color: 'bg-green-100 text-green-600 hover:bg-green-200' },
                        ].map(r => (
                          <button
                            key={r.q}
                            onClick={() => handleRate(r.q)}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', r.color)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      ) : null}
    </div>
  );
}
