import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { questions, Question, CONCEPTS } from '@/lib/questions';
import {
  selectNextQuestion, updateBelief, createInitialBrainState, BrainState,
  expectedInformationGain, ABILITY_GRID
} from '@/lib/adaptive-engine';
import { recordAnswer, getUserProfile, saveUserProfile, addToReview } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Lightbulb, CheckCircle2, XCircle, ArrowRight, Filter, Zap,
  BarChart3, TrendingUp, Shuffle, ListOrdered, Activity, Target, Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LineChart, Line, Legend, ReferenceLine
} from 'recharts';

type LearningMode = 'adaptive' | 'fixed';

interface StepRecord {
  step: number;
  ability: number;
  uncertainty: number;
  eig: number;
  correct: boolean;
  difficulty: number;
  concept: string;
}

export default function Learn() {
  const { user, refreshProfile } = useAuth();
  const [brainState, setBrainState] = useState<BrainState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string>('all');
  const [answeredIds, setAnsweredIds] = useState<number[]>([]);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [stepRecords, setStepRecords] = useState<StepRecord[]>([]);
  const [currentEIG, setCurrentEIG] = useState<number>(0);
  const startTime = useRef(Date.now());

  // Mode
  const [mode, setMode] = useState<LearningMode>('adaptive');
  const [fixedIndex, setFixedIndex] = useState(0);

  // Active tab for right panel
  const [activeTab, setActiveTab] = useState<'inference' | 'knowledge' | 'stats'>('inference');

  useEffect(() => {
    if (!user) return;
    const profile = getUserProfile(user);
    if (profile) {
      setBrainState(profile.brainState);
      setAnsweredIds([...profile.answeredQuestionIds]);
    } else {
      setBrainState(createInitialBrainState());
    }
  }, [user]);

  useEffect(() => {
    if (brainState && !currentQuestion) pickNext();
  }, [brainState]);

  // Compute EIG for current question
  useEffect(() => {
    if (brainState && currentQuestion && mode === 'adaptive') {
      const eig = expectedInformationGain(brainState.belief, currentQuestion);
      setCurrentEIG(eig);
    } else {
      setCurrentEIG(0);
    }
  }, [brainState, currentQuestion, mode]);

  const getFilteredQuestions = (concept?: string) => {
    const c = concept ?? selectedConcept;
    return c === 'all' ? [...questions] : questions.filter(q => q.concept === c);
  };

  const pickNext = () => {
    if (!brainState) return;
    if (mode === 'adaptive') {
      let available = questions.filter(q => !answeredIds.includes(q.id));
      if (selectedConcept !== 'all') available = available.filter(q => q.concept === selectedConcept);
      if (available.length === 0) {
        setAnsweredIds([]);
        available = getFilteredQuestions();
      }
      const next = selectNextQuestion(brainState, available);
      setCurrentQuestion(next);
    } else {
      const pool = getFilteredQuestions();
      if (pool.length === 0) return;
      const idx = fixedIndex % pool.length;
      setCurrentQuestion(pool[idx]);
      setFixedIndex(idx + 1);
    }
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    startTime.current = Date.now();
  };

  const handleAnswer = (answer: string) => {
    if (showResult || !currentQuestion || !user || !brainState) return;
    setSelectedAnswer(answer);
    setShowResult(true);

    const correct = answer === currentQuestion.correct_answer;
    setIsCorrect(correct);

    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    const eigBefore = mode === 'adaptive' ? expectedInformationGain(brainState.belief, currentQuestion) : 0;
    const newBrain = updateBelief(brainState, currentQuestion, correct);
    setBrainState(newBrain);

    // Record step data for charts
    setStepRecords(prev => [...prev, {
      step: prev.length + 1,
      ability: Math.round(newBrain.estimatedAbility * 100),
      uncertainty: Math.round(newBrain.uncertainty * 100) / 100,
      eig: Math.round(eigBefore * 1000) / 1000,
      correct,
      difficulty: currentQuestion.difficulty,
      concept: currentQuestion.concept,
    }]);

    // Save brain state
    const profile = getUserProfile(user);
    if (profile) {
      profile.brainState = newBrain;
      saveUserProfile(profile);
    }

    const { xpGained, newAchievements } = recordAnswer(
      user, currentQuestion, answer, correct, timeSpent,
      mode,
      newBrain.estimatedAbility,
      newBrain.belief.reduce((s: number, p: number) => s - (p > 0 ? p * Math.log2(p) : 0), 0)
    );
    setAnsweredIds(prev => [...prev, currentQuestion!.id]);
    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }));

    if (!correct) addToReview(user, currentQuestion.id);
    if (xpGained > 0) toast.success(`+${xpGained} XP`, { duration: 1500 });
    for (const ach of newAchievements) {
      toast(`Achievement Unlocked: ${ach.name}`, { description: ach.description, duration: 3000 });
    }
    refreshProfile();
  };

  const handleNext = () => pickNext();

  const handleConceptChange = (concept: string) => {
    setSelectedConcept(concept);
    setCurrentQuestion(null);
    setShowResult(false);
    setSelectedAnswer(null);
    setFixedIndex(0);
    setTimeout(() => {
      if (brainState) {
        if (mode === 'adaptive') {
          let available = questions.filter(q => !answeredIds.includes(q.id));
          if (concept !== 'all') available = available.filter(q => q.concept === concept);
          if (available.length === 0) available = concept === 'all' ? [...questions] : questions.filter(q => q.concept === concept);
          setCurrentQuestion(selectNextQuestion(brainState, available));
        } else {
          const pool = concept === 'all' ? [...questions] : questions.filter(q => q.concept === concept);
          if (pool.length > 0) { setCurrentQuestion(pool[0]); setFixedIndex(1); }
        }
        startTime.current = Date.now();
      }
    }, 100);
  };

  const handleModeSwitch = (newMode: LearningMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setCurrentQuestion(null);
    setShowResult(false);
    setSelectedAnswer(null);
    setSessionStats({ total: 0, correct: 0 });
    setStepRecords([]);
    setFixedIndex(0);
    setTimeout(() => {
      if (brainState) {
        if (newMode === 'adaptive') {
          let available = questions.filter(q => !answeredIds.includes(q.id));
          if (selectedConcept !== 'all') available = available.filter(q => q.concept === selectedConcept);
          if (available.length === 0) available = getFilteredQuestions();
          setCurrentQuestion(selectNextQuestion(brainState, available));
        } else {
          const pool = getFilteredQuestions();
          if (pool.length > 0) { setCurrentQuestion(pool[0]); setFixedIndex(1); }
        }
        startTime.current = Date.now();
      }
    }, 100);
  };

  // Belief distribution data for visualization
  const beliefDistData = useMemo(() => {
    if (!brainState) return [];
    return ABILITY_GRID.map((ability, i) => ({
      ability: Math.round(ability * 100),
      probability: Math.round(brainState.belief[i] * 10000) / 100,
    }));
  }, [brainState]);

  // Concept mastery from profile
  const profile = user ? getUserProfile(user) : null;
  const radarData = useMemo(() => {
    if (!profile) return [];
    const stats = profile.stats.conceptStats;
    return CONCEPTS.map(concept => {
      const s = stats[concept];
      const mastery = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return { concept: concept.length > 10 ? concept.slice(0, 8) + '...' : concept, fullName: concept, mastery };
    });
  }, [profile]);

  // Convergence + entropy data
  const convergenceData = useMemo(() => {
    return stepRecords.map(r => ({
      step: r.step,
      ability: r.ability,
      uncertainty: r.uncertainty,
      eig: r.eig,
    }));
  }, [stepRecords]);

  // Difficulty selection pattern
  const difficultyPattern = useMemo(() => {
    return stepRecords.map(r => ({
      step: r.step,
      difficulty: Math.round(r.difficulty * 100),
      ability: r.ability,
      correct: r.correct ? 1 : 0,
    }));
  }, [stepRecords]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Selecting the best question for you...</p>
        </div>
      </div>
    );
  }

  const options = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ];

  const difficultyLabel = currentQuestion.difficulty < 0.3 ? 'Easy' : currentQuestion.difficulty < 0.6 ? 'Medium' : 'Hard';
  const difficultyColor = currentQuestion.difficulty < 0.3 ? 'text-emerald-500 bg-emerald-50' : currentQuestion.difficulty < 0.6 ? 'text-amber-500 bg-amber-50' : 'text-red-500 bg-red-50';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain size={22} className="text-blue-500" />
            {mode === 'adaptive' ? 'Adaptive Learning' : 'Fixed Sequence'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === 'adaptive'
              ? `Active Inference selects optimal questions · Session: ${sessionStats.total} answered`
              : `Fixed order baseline · Session: ${sessionStats.total} answered`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex items-center bg-white/70 border border-white/80 rounded-xl p-0.5">
            <button
              onClick={() => handleModeSwitch('adaptive')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                mode === 'adaptive' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shuffle size={12} /> Adaptive
            </button>
            <button
              onClick={() => handleModeSwitch('fixed')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                mode === 'fixed' ? 'bg-slate-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListOrdered size={12} /> Fixed Sequence
            </button>
          </div>
          {/* Concept Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={selectedConcept}
              onChange={e => handleConceptChange(e.target.value)}
              className="text-xs bg-white/70 border border-white/80 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All Concepts</option>
              {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Active Inference Real-time Dashboard */}
      {mode === 'adaptive' && brainState && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard hover={false} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Target size={13} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ability</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{Math.round(brainState.estimatedAbility * 100)}%</p>
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden mt-1.5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                animate={{ width: `${brainState.estimatedAbility * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </GlassCard>
          <GlassCard hover={false} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Activity size={13} className="text-purple-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uncertainty</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{brainState.uncertainty.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {brainState.uncertainty < 1.5 ? 'Low (Converged)' : brainState.uncertainty < 3 ? 'Medium' : 'High (Exploring)'}
            </p>
          </GlassCard>
          <GlassCard hover={false} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Zap size={13} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">EIG</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{currentEIG.toFixed(3)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Expected Info Gain</p>
          </GlassCard>
          <GlassCard hover={false} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Gauge size={13} className="text-emerald-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sessionStats.correct}/{sessionStats.total} correct</p>
          </GlassCard>
        </div>
      )}

      {/* Fixed mode banner */}
      {mode === 'fixed' && (
        <GlassCard hover={false} className="p-3 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-2">
            <ListOrdered size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Fixed Sequence Mode (Baseline)</p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Questions in fixed order without adaptation. Compare with Adaptive mode to see the advantage of Active Inference.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* Left: Question Area */}
        <div className="space-y-4">
          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover={false} className="p-6">
                {/* Question Meta */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600">
                    {currentQuestion.concept}
                  </span>
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', difficultyColor)}>
                    {difficultyLabel} ({Math.round(currentQuestion.difficulty * 100)}%)
                  </span>
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-lg',
                    mode === 'adaptive' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500'
                  )}>
                    {mode === 'adaptive' ? `AI Selected · EIG: ${currentEIG.toFixed(3)}` : 'Sequential'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">#{currentQuestion.id}</span>
                </div>

                {/* Question Text */}
                <h2 className="text-base font-semibold text-foreground leading-relaxed mb-5">
                  {currentQuestion.question}
                </h2>

                {/* Options */}
                <div className="space-y-2.5">
                  {options.map((opt) => {
                    const isSelected = selectedAnswer === opt.key;
                    const isCorrectAnswer = opt.key === currentQuestion.correct_answer;
                    let optionStyle = 'bg-white/60 border-white/80 hover:bg-blue-50/50 hover:border-blue-200';
                    if (showResult) {
                      if (isCorrectAnswer) optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-700';
                      else if (isSelected && !isCorrectAnswer) optionStyle = 'bg-red-50 border-red-300 text-red-700';
                      else optionStyle = 'bg-white/40 border-white/60 opacity-60';
                    }
                    return (
                      <motion.button
                        key={opt.key}
                        whileHover={!showResult ? { scale: 1.005 } : undefined}
                        whileTap={!showResult ? { scale: 0.995 } : undefined}
                        onClick={() => handleAnswer(opt.key)}
                        disabled={showResult}
                        className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-start gap-3', optionStyle)}
                      >
                        <span className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                          showResult && isCorrectAnswer ? 'bg-emerald-500 text-white' :
                          showResult && isSelected && !isCorrectAnswer ? 'bg-red-500 text-white' :
                          isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                        )}>
                          {showResult && isCorrectAnswer ? <CheckCircle2 size={14} /> :
                           showResult && isSelected && !isCorrectAnswer ? <XCircle size={14} /> : opt.key}
                        </span>
                        <span className="pt-0.5">{opt.text}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Hint */}
                {!showResult && (
                  <button onClick={() => setShowHint(!showHint)} className="mt-4 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                    <Lightbulb size={13} />
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                  </button>
                )}
                <AnimatePresence>
                  {showHint && !showResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">{currentQuestion.hint}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Result */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className={cn('mt-4 p-4 rounded-xl border text-sm', isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
                          <span className={cn('font-semibold', isCorrect ? 'text-emerald-700' : 'text-red-700')}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <p className={cn('text-xs leading-relaxed', isCorrect ? 'text-emerald-600' : 'text-red-600')}>
                          {currentQuestion.explanation}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNext} className="btn-blue px-5 py-2.5 text-sm flex items-center gap-2">
                          Next Question <ArrowRight size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Analytics Panel with Tabs */}
        <div className="space-y-3">
          {/* Tab Switcher */}
          <div className="flex bg-white/70 border border-white/80 rounded-xl p-0.5">
            {[
              { id: 'inference' as const, label: 'Active Inference', icon: Brain },
              { id: 'knowledge' as const, label: 'Knowledge', icon: BarChart3 },
              { id: 'stats' as const, label: 'Session', icon: TrendingUp },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                    activeTab === tab.id ? 'bg-blue-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={12} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'inference' && (
            <div className="space-y-3">
              {/* Posterior Belief Distribution */}
              <GlassCard hover={false} className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Activity size={14} className="text-purple-500" />
                  Posterior Belief Distribution
                </h3>
                <p className="text-[10px] text-muted-foreground mb-2">
                  P(ability | observations) — The model's belief about your ability level
                </p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={beliefDistData}>
                      <defs>
                        <linearGradient id="beliefGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
                      <XAxis dataKey="ability" tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'Ability (%)', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'P(θ)', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '10px', fontSize: '11px' }}
                        formatter={(value: number) => [`${value}%`, 'Probability']}
                        labelFormatter={(label) => `Ability: ${label}%`}
                      />
                      {brainState && (
                        <ReferenceLine x={Math.round(brainState.estimatedAbility * 100)} stroke="#3B82F6" strokeDasharray="5 5" label={{ value: 'θ̂', position: 'top', fontSize: 10, fill: '#3B82F6' }} />
                      )}
                      <Area type="monotone" dataKey="probability" stroke="#8B5CF6" fill="url(#beliefGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Ability Convergence + Entropy */}
              {convergenceData.length > 0 && (
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-500" />
                    Ability Convergence & Entropy
                  </h3>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    How ability estimate stabilizes while uncertainty decreases
                  </p>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={convergenceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                        <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'Question #', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '10px', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="ability" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} name="Ability (%)" />
                        <Line yAxisId="right" type="monotone" dataKey="uncertainty" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} name="Entropy (bits)" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {/* EIG per Question */}
              {convergenceData.length > 0 && (
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    Expected Information Gain (EIG) per Question
                  </h3>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    How much information each question provides about your ability
                  </p>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={convergenceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,158,11,0.08)" />
                        <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '10px', fontSize: '11px' }}
                          formatter={(value: number) => [value.toFixed(3), 'EIG (bits)']}
                        />
                        <Bar dataKey="eig" fill="#F59E0B" radius={[4, 4, 0, 0]} name="EIG" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {/* Difficulty Adaptation Pattern */}
              {difficultyPattern.length > 0 && (
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Target size={14} className="text-emerald-500" />
                    Difficulty Adaptation Pattern
                  </h3>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    How question difficulty adapts to match your ability level
                  </p>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={difficultyPattern}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.08)" />
                        <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#94a3b8' }} label={{ value: 'Question #', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '10px', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="difficulty" stroke="#10B981" strokeWidth={2} dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              key={`dot-${payload.step}`}
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={payload.correct ? '#10B981' : '#EF4444'}
                              stroke="white"
                              strokeWidth={1.5}
                            />
                          );
                        }} name="Difficulty (%)" />
                        <Line type="monotone" dataKey="ability" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Ability (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Incorrect
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              {/* Knowledge Radar */}
              <GlassCard hover={false} className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-blue-500" />
                  Knowledge Radar
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="rgba(59,130,246,0.15)" />
                      <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                      <Radar name="Mastery" dataKey="mastery" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '10px', fontSize: '11px' }}
                        formatter={(value: number) => [`${value}%`, 'Mastery']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Concept Breakdown */}
              <GlassCard hover={false} className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Concept Mastery Breakdown</h3>
                <div className="space-y-2">
                  {radarData.map(d => (
                    <div key={d.fullName}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-muted-foreground truncate mr-2">{d.fullName}</span>
                        <span className="font-medium text-foreground">{d.mastery}%</span>
                      </div>
                      <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: d.mastery >= 80 ? '#10B981' : d.mastery >= 50 ? '#3B82F6' : '#F59E0B' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${d.mastery}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-3">
              {/* Session Stats */}
              <GlassCard hover={false} className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  Session Statistics ({mode === 'adaptive' ? 'Adaptive' : 'Fixed'})
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-blue-50/50">
                    <p className="text-2xl font-bold text-blue-600">{sessionStats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Answered</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50">
                    <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
                    <p className="text-[10px] text-muted-foreground">Correct</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/50">
                    <p className="text-2xl font-bold text-amber-600">
                      {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Accuracy</p>
                  </div>
                </div>
              </GlassCard>

              {/* Answer History */}
              {stepRecords.length > 0 && (
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-xs font-semibold text-foreground mb-3">Answer History</h3>
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                    {stepRecords.map((r, i) => (
                      <div key={i} className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]',
                        r.correct ? 'bg-emerald-50/50' : 'bg-red-50/50'
                      )}>
                        <span className="font-mono text-muted-foreground w-5">#{r.step}</span>
                        <span className={cn('font-medium', r.correct ? 'text-emerald-600' : 'text-red-600')}>
                          {r.correct ? '✓' : '✗'}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">{r.concept}</span>
                        <span className="text-muted-foreground">D:{Math.round(r.difficulty * 100)}%</span>
                        <span className="text-blue-600 font-medium">θ:{r.ability}%</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
