import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { questions, Question, CONCEPTS } from '@/lib/questions';
import { recordAnswer, saveChallengeResult, getChallengeHistory, ChallengeResult } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Trophy, Target, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ChallengeState = 'setup' | 'playing' | 'finished';

export default function Challenge() {
  const { user, refreshProfile } = useAuth();
  const [state, setState] = useState<ChallengeState>('setup');
  const [timeLimit, setTimeLimit] = useState(120);
  const [numQuestions, setNumQuestions] = useState(10);
  const [selectedConcept, setSelectedConcept] = useState('all');
  const [challengeQuestions, setChallengeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; answer: string; correct: boolean; timeSpent: number }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(Date.now());
  const history = getChallengeHistory(user || '');

  const startChallenge = () => {
    let pool = [...questions];
    if (selectedConcept !== 'all') pool = pool.filter(q => q.concept === selectedConcept);
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, Math.min(numQuestions, pool.length));
    setChallengeQuestions(selected);
    setCurrentIndex(0);
    setAnswers([]);
    setTimeRemaining(timeLimit);
    setSelectedAnswer(null);
    setShowResult(false);
    setState('playing');
    questionStartRef.current = Date.now();
  };

  const finishChallenge = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('finished');
    if (!user) return;

    const totalCorrect = answers.filter(a => a.correct).length;
    const conceptBreakdown: Record<string, { total: number; correct: number }> = {};
    for (const a of answers) {
      const q = questions.find(qq => qq.id === a.questionId);
      if (!q) continue;
      if (!conceptBreakdown[q.concept]) conceptBreakdown[q.concept] = { total: 0, correct: 0 };
      conceptBreakdown[q.concept].total++;
      if (a.correct) conceptBreakdown[q.concept].correct++;
    }

    const result: ChallengeResult = {
      totalQuestions: answers.length,
      correctAnswers: totalCorrect,
      accuracy: answers.length > 0 ? Math.round((totalCorrect / answers.length) * 100) : 0,
      timeUsed: timeLimit - timeRemaining,
      timeLimit,
      conceptBreakdown,
      date: new Date().toISOString(),
    };
    saveChallengeResult(user, result);
    refreshProfile();
  }, [answers, timeLimit, timeRemaining, user, refreshProfile]);

  useEffect(() => {
    if (state !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          finishChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, finishChallenge]);

  const handleAnswer = (answer: string) => {
    if (showResult || !user) return;
    const q = challengeQuestions[currentIndex];
    const correct = answer === q.correct_answer;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);

    setSelectedAnswer(answer);
    setShowResult(true);

    const newAnswers = [...answers, { questionId: q.id, answer, correct, timeSpent }];
    setAnswers(newAnswers);
    recordAnswer(user, q, answer, correct, timeSpent);
    refreshProfile();

    // Auto advance after delay
    setTimeout(() => {
      if (currentIndex + 1 >= challengeQuestions.length) {
        // Use the updated answers
        const totalCorrect = newAnswers.filter(a => a.correct).length;
        const conceptBreakdown: Record<string, { total: number; correct: number }> = {};
        for (const a of newAnswers) {
          const qq = questions.find(qqq => qqq.id === a.questionId);
          if (!qq) continue;
          if (!conceptBreakdown[qq.concept]) conceptBreakdown[qq.concept] = { total: 0, correct: 0 };
          conceptBreakdown[qq.concept].total++;
          if (a.correct) conceptBreakdown[qq.concept].correct++;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setState('finished');
        const result: ChallengeResult = {
          totalQuestions: newAnswers.length,
          correctAnswers: totalCorrect,
          accuracy: newAnswers.length > 0 ? Math.round((totalCorrect / newAnswers.length) * 100) : 0,
          timeUsed: timeLimit - timeRemaining,
          timeLimit,
          conceptBreakdown,
          date: new Date().toISOString(),
        };
        saveChallengeResult(user, result);
        refreshProfile();
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        questionStartRef.current = Date.now();
      }
    }, 1200);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Setup Screen
  if (state === 'setup') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Timer size={22} className="text-amber-500" />
            Timed Challenge
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Complete as many questions as possible within the time limit</p>
        </div>

        <GlassCard hover={false} className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Time Limit</label>
            <div className="flex gap-2 flex-wrap">
              {[60, 120, 180, 300].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeLimit(t)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    timeLimit === t
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/60 text-muted-foreground hover:bg-blue-50'
                  )}
                >
                  {t >= 60 ? `${t / 60} min` : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Number of Questions</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setNumQuestions(n)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    numQuestions === n
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/60 text-muted-foreground hover:bg-blue-50'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Concept Filter</label>
            <select
              value={selectedConcept}
              onChange={e => setSelectedConcept(e.target.value)}
              className="text-sm bg-white/70 border border-white/80 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full max-w-xs"
            >
              <option value="all">All Concepts</option>
              {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startChallenge}
            className="btn-blue px-6 py-3 text-sm flex items-center gap-2"
          >
            <Play size={16} />
            Start Challenge
          </motion.button>
        </GlassCard>

        {/* History */}
        {history.length > 0 && (
          <GlassCard hover={false}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Challenge History
            </h3>
            <div className="space-y-2">
              {history.slice(-5).reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/50 text-xs">
                  <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="font-medium">{h.correctAnswers}/{h.totalQuestions}</span>
                  <span className={cn('font-bold', h.accuracy >= 80 ? 'text-emerald-500' : h.accuracy >= 60 ? 'text-amber-500' : 'text-red-500')}>
                    {h.accuracy}%
                  </span>
                  <span className="text-muted-foreground">{formatTime(h.timeUsed)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // Playing Screen
  if (state === 'playing') {
    const q = challengeQuestions[currentIndex];
    const options = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
    ];
    const progress = ((currentIndex) / challengeQuestions.length) * 100;
    const timePercent = (timeRemaining / timeLimit) * 100;

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Timer Bar */}
        <GlassCard hover={false} className="p-3">
          <div className="flex items-center gap-4">
            <div className={cn('flex items-center gap-1.5 text-sm font-bold', timeRemaining < 30 ? 'text-red-500' : 'text-blue-600')}>
              <Clock size={16} />
              {formatTime(timeRemaining)}
            </div>
            <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', timeRemaining < 30 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-400')}
                animate={{ width: `${timePercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {currentIndex + 1}/{challengeQuestions.length}
            </span>
          </div>
          <div className="mt-2 h-1 bg-blue-50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-300 rounded-full"
              animate={{ width: `${progress}%` }}
            />
          </div>
        </GlassCard>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <GlassCard hover={false} className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600">{q.concept}</span>
              </div>
              <h2 className="text-base font-semibold text-foreground leading-relaxed mb-4">{q.question}</h2>
              <div className="space-y-2">
                {options.map(opt => {
                  const isSelected = selectedAnswer === opt.key;
                  const isCorrectAnswer = opt.key === q.correct_answer;
                  let style = 'bg-white/60 border-white/80 hover:bg-blue-50/50';
                  if (showResult) {
                    if (isCorrectAnswer) style = 'bg-emerald-50 border-emerald-300';
                    else if (isSelected) style = 'bg-red-50 border-red-300';
                    else style = 'bg-white/40 border-white/60 opacity-50';
                  }
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswer(opt.key)}
                      disabled={showResult}
                      className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-start gap-3', style)}
                    >
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        showResult && isCorrectAnswer ? 'bg-emerald-500 text-white' :
                        showResult && isSelected ? 'bg-red-500 text-white' :
                        'bg-blue-100 text-blue-600'
                      )}>
                        {showResult && isCorrectAnswer ? <CheckCircle2 size={14} /> :
                         showResult && isSelected ? <XCircle size={14} /> : opt.key}
                      </span>
                      <span className="pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Finished Screen
  const totalCorrect = answers.filter(a => a.correct).length;
  const accuracy = answers.length > 0 ? Math.round((totalCorrect / answers.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <GlassCard hover={false} className="p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white mx-auto mb-4"
        >
          <Trophy size={36} />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Challenge Complete!</h2>
        <p className="text-muted-foreground text-sm mb-6">Here are your results</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card text-center">
            <Target size={20} className="text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div className="stat-card text-center">
            <Zap size={20} className="text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalCorrect}/{answers.length}</p>
            <p className="text-xs text-muted-foreground">Correct/Total</p>
          </div>
          <div className="stat-card text-center">
            <Clock size={20} className="text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{formatTime(timeLimit - timeRemaining)}</p>
            <p className="text-xs text-muted-foreground">Time Used</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setState('setup'); setAnswers([]); }}
            className="btn-blue px-6 py-2.5 text-sm flex items-center gap-2"
          >
            <Play size={14} />
            Try Again
          </motion.button>
        </div>
      </GlassCard>
    </div>
  );
}
