import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getUserProfile, saveUserProfile, addToReview } from '@/lib/store';
import { questions, CONCEPTS } from '@/lib/questions';
import { motion, AnimatePresence } from 'framer-motion';
import { BookX, Filter, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WrongQuestions() {
  const { user, refreshProfile } = useAuth();
  const [filterConcept, setFilterConcept] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unmastered' | 'mastered'>('unmastered');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const profile = user ? getUserProfile(user) : null;
  if (!profile) return null;

  let wrongList = [...profile.wrongQuestions];
  if (filterConcept !== 'all') wrongList = wrongList.filter(w => w.concept === filterConcept);
  if (filterStatus === 'unmastered') wrongList = wrongList.filter(w => !w.mastered);
  else if (filterStatus === 'mastered') wrongList = wrongList.filter(w => w.mastered);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    wrongList = wrongList.filter(w => w.question.toLowerCase().includes(q) || w.concept.toLowerCase().includes(q));
  }
  wrongList.sort((a, b) => new Date(b.lastWrongTime).getTime() - new Date(a.lastWrongTime).getTime());

  const handleMarkMastered = (questionId: number) => {
    const wq = profile.wrongQuestions.find(w => w.questionId === questionId);
    if (wq) {
      wq.mastered = true;
      wq.masteredTime = new Date().toISOString();
      saveUserProfile(profile);
      refreshProfile();
      toast.success('Marked as mastered');
    }
  };

  const handleAddToReview = (questionId: number) => {
    if (user) {
      addToReview(user, questionId);
      toast.success('Added to spaced review');
    }
  };

  const handleDelete = (questionId: number) => {
    profile.wrongQuestions = profile.wrongQuestions.filter(w => w.questionId !== questionId);
    saveUserProfile(profile);
    refreshProfile();
    toast.success('Deleted');
  };

  const unmasteredCount = profile.wrongQuestions.filter(w => !w.mastered).length;
  const masteredCount = profile.wrongQuestions.filter(w => w.mastered).length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookX size={22} className="text-red-500" />
          Wrong Questions
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {profile.wrongQuestions.length} total, {unmasteredCount} to review, {masteredCount} mastered
        </p>
      </div>

      {/* Filters */}
      <GlassCard hover={false} className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/60 border border-white/80 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select
            value={filterConcept}
            onChange={e => setFilterConcept(e.target.value)}
            className="text-xs bg-white/60 border border-white/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">All Concepts</option>
            {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-1">
            {(['all', 'unmastered', 'mastered'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filterStatus === s ? 'bg-blue-500 text-white' : 'bg-white/60 text-muted-foreground hover:bg-blue-50'
                )}
              >
                {s === 'all' ? 'All' : s === 'unmastered' ? 'To Review' : 'Mastered'}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Wrong Questions List */}
      {wrongList.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <BookX size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {profile.wrongQuestions.length === 0 ? 'No wrong questions yet, keep it up!' : 'No questions match the current filter'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {wrongList.map((wq) => {
            const isExpanded = expandedId === wq.questionId;
            return (
              <motion.div
                key={wq.questionId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard hover={false} className="p-0 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : wq.questionId)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                      wq.mastered ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    )}>
                      {wq.mastered ? <CheckCircle2 size={14} /> : wq.wrongCount}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{wq.question}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600">{wq.concept}</span>
                        <span className="text-[10px] text-muted-foreground">Wrong {wq.wrongCount}x</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(wq.lastWrongTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0 mt-1" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0 mt-1" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/60 pt-3">
                          <div className="text-xs space-y-1">
                            <p><span className="text-red-500 font-medium">Your Answer: </span>{wq.userAnswer}</p>
                            <p><span className="text-emerald-500 font-medium">Correct Answer: </span>{wq.correctAnswer}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50/50 text-xs text-blue-700">
                            <strong>Explanation: </strong>{wq.explanation}
                          </div>
                          {wq.hint && (
                            <div className="p-3 rounded-lg bg-amber-50/50 text-xs text-amber-700">
                              <strong>Hint: </strong>{wq.hint}
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {!wq.mastered && (
                              <button
                                onClick={() => handleMarkMastered(wq.questionId)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Mark Mastered
                              </button>
                            )}
                            <button
                              onClick={() => handleAddToReview(wq.questionId)}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                              <RotateCcw size={12} /> Add to Review
                            </button>
                            <button
                              onClick={() => handleDelete(wq.questionId)}
                              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
