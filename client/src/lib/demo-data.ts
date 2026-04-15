// Demo Data Generator
// Creates pre-populated demo accounts with realistic learning records
// for thesis presentation purposes

import { ACHIEVEMENT_DEFS, LEVELS, getLevelInfo } from './store';
import { CONCEPTS, questions as QUESTIONS, Question } from './questions';
import { createInitialBrainState, updateBelief, selectNextQuestion, ABILITY_GRID } from './adaptive-engine';

const STORAGE_KEY = 'adaptive_learning_users';
const PASSWORDS_KEY = 'adaptive_learning_passwords';
const CHALLENGE_HISTORY_KEY = 'adaptive_learning_challenges';
const DEMO_INIT_KEY = 'adaptive_learning_demo_initialized_v5';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Simulate a realistic learning session
function simulateSession(
  trueAbility: number,
  mode: 'adaptive' | 'fixed',
  numQuestions: number,
  startDate: Date,
  conceptFocus?: string
) {
  let brain = createInitialBrainState();
  const history: any[] = [];
  const answeredIds: number[] = [];
  let fixedIdx = 0;

  const availableQuestions = conceptFocus
    ? QUESTIONS.filter((q: Question) => q.concept === conceptFocus)
    : [...QUESTIONS];

  for (let i = 0; i < numQuestions; i++) {
    let question;
    if (mode === 'adaptive') {
      const unanswered = availableQuestions.filter((q: any) => !answeredIds.includes(q.id));
      question = selectNextQuestion(brain, unanswered.length > 0 ? unanswered : availableQuestions);
    } else {
      question = availableQuestions[fixedIdx % availableQuestions.length];
      fixedIdx++;
    }
    if (!question) break;

    // Simulate correctness based on true ability and difficulty
    const pCorrect = 1 / (1 + Math.exp(-1.7 * (trueAbility - question.difficulty)));
    const noise = (Math.random() - 0.5) * 0.15;
    const correct = Math.random() < (pCorrect + noise);

    // Update brain state
    brain = updateBelief(brain, question, correct);
    answeredIds.push(question.id);

    // Calculate entropy
    const entropy = brain.belief.reduce((s: number, p: number) =>
      s - (p > 0 ? p * Math.log2(p) : 0), 0);

    // Simulate time (harder questions take longer)
    const baseTime = 8 + question.difficulty * 25;
    const timeSpent = Math.round(baseTime + (Math.random() - 0.3) * 10);

    const timestamp = new Date(startDate.getTime() + i * 45000 + Math.random() * 15000);

    history.push({
      questionId: question.id,
      concept: question.concept,
      difficulty: question.difficulty,
      correct,
      timestamp: timestamp.toISOString(),
      timeSpent: Math.max(3, timeSpent),
      mode,
      abilityAfter: brain.estimatedAbility,
      entropyAfter: entropy,
    });
  }

  return { history, brain, answeredIds };
}

function createDemoProfile(
  username: string,
  config: {
    trueAbility: number;
    totalAdaptive: number;
    totalFixed: number;
    daysActive: number;
    challengesDone: number;
    notesCount: number;
    reviewsDone: number;
  }
) {
  const now = new Date();
  const startDate = new Date(now.getTime() - config.daysActive * 86400000);

  // Simulate adaptive sessions spread across days
  const adaptivePerDay = Math.ceil(config.totalAdaptive / config.daysActive);
  let allHistory: any[] = [];
  let allAnsweredIds: number[] = [];
  let finalBrain = createInitialBrainState();

  for (let d = 0; d < config.daysActive; d++) {
    const dayStart = new Date(startDate.getTime() + d * 86400000 + 9 * 3600000 + Math.random() * 7200000);
    const questionsToday = Math.min(adaptivePerDay, config.totalAdaptive - allHistory.filter(h => h.mode === 'adaptive').length);
    if (questionsToday <= 0) break;

    const session = simulateSession(config.trueAbility, 'adaptive', questionsToday, dayStart);
    allHistory.push(...session.history);
    allAnsweredIds.push(...session.answeredIds);
    finalBrain = session.brain;
  }

  // Simulate fixed sessions (fewer, for comparison)
  if (config.totalFixed > 0) {
    const fixedStart = new Date(now.getTime() - 2 * 86400000 + 14 * 3600000);
    const fixedSession = simulateSession(config.trueAbility, 'fixed', config.totalFixed, fixedStart);
    allHistory.push(...fixedSession.history);
    allAnsweredIds.push(...fixedSession.answeredIds);
  }

  // Sort by timestamp
  allHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate stats
  const totalQ = allHistory.length;
  const correctQ = allHistory.filter(h => h.correct).length;
  const wrongQ = totalQ - correctQ;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

  // Concept stats
  const conceptStats: Record<string, { total: number; correct: number }> = {};
  for (const h of allHistory) {
    if (!conceptStats[h.concept]) conceptStats[h.concept] = { total: 0, correct: 0 };
    conceptStats[h.concept].total++;
    if (h.correct) conceptStats[h.concept].correct++;
  }

  // Best streak
  let currentStreak = 0;
  let bestStreak = 0;
  for (const h of allHistory) {
    if (h.correct) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Wrong questions
  const wrongQuestions: any[] = [];
  const wrongMap: Record<number, any> = {};
  for (const h of allHistory) {
    if (!h.correct) {
      const q = QUESTIONS.find((qq: any) => qq.id === h.questionId);
      if (!q) continue;
      if (wrongMap[h.questionId]) {
        wrongMap[h.questionId].wrongCount++;
        wrongMap[h.questionId].lastWrongTime = h.timestamp;
      } else {
        wrongMap[h.questionId] = {
          questionId: h.questionId,
          question: q.question,
          concept: q.concept,
          difficulty: q.difficulty,
          userAnswer: ['A', 'B', 'C', 'D'].filter(a => a !== q.correct_answer)[Math.floor(Math.random() * 3)],
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          hint: q.hint,
          firstWrongTime: h.timestamp,
          lastWrongTime: h.timestamp,
          wrongCount: 1,
          mastered: Math.random() > 0.6,
          masteredTime: Math.random() > 0.6 ? h.timestamp : null,
          reviewCount: Math.floor(Math.random() * 5),
        };
      }
    }
  }
  for (const wq of Object.values(wrongMap)) {
    wrongQuestions.push(wq);
  }

  // XP calculation
  let xp = 0;
  for (const h of allHistory) {
    xp += h.correct ? 10 + Math.round(h.difficulty * 10) : 2;
  }
  xp += config.challengesDone * 50;
  xp += config.reviewsDone * 5;

  const levelInfo = getLevelInfo(xp);

  // Achievements - match ACHIEVEMENT_DEFS structure exactly
  const achievements = ACHIEVEMENT_DEFS.map(a => {
    let progress = 0;
    let unlocked = false;
    switch (a.id) {
      case 'first_step': progress = Math.min(totalQ, 1); unlocked = totalQ >= 1; break;
      case 'ten_questions': progress = Math.min(totalQ, 10); unlocked = totalQ >= 10; break;
      case 'fifty_questions': progress = Math.min(totalQ, 50); unlocked = totalQ >= 50; break;
      case 'hundred_questions': progress = Math.min(totalQ, 100); unlocked = totalQ >= 100; break;
      case 'perfect_ten': progress = Math.min(bestStreak, 10); unlocked = bestStreak >= 10; break;
      case 'streak_twenty': progress = Math.min(bestStreak, 20); unlocked = bestStreak >= 20; break;
      case 'accuracy_80': progress = Math.min(accuracy, 80); unlocked = accuracy >= 80; break;
      case 'accuracy_90': progress = Math.min(accuracy, 90); unlocked = accuracy >= 90; break;
      case 'all_concepts': {
        const c = Object.keys(conceptStats).filter(k => conceptStats[k].correct > 0).length;
        progress = c; unlocked = c >= 10; break;
      }
      case 'concept_master': {
        const maxAcc = Math.max(...Object.values(conceptStats).map(s => s.total > 0 ? (s.correct / s.total) * 100 : 0));
        progress = Math.round(maxAcc); unlocked = maxAcc >= 90; break;
      }
      case 'first_review': progress = config.reviewsDone > 0 ? 1 : 0; unlocked = config.reviewsDone > 0; break;
      case 'review_ten': progress = Math.min(config.reviewsDone, 10); unlocked = config.reviewsDone >= 10; break;
      case 'daily_goal': progress = 1; unlocked = true; break;
      case 'streak_3days': progress = Math.min(config.daysActive, 3); unlocked = config.daysActive >= 3; break;
      case 'streak_7days': progress = Math.min(config.daysActive, 7); unlocked = config.daysActive >= 7; break;
      case 'challenge_complete': progress = config.challengesDone > 0 ? 1 : 0; unlocked = config.challengesDone > 0; break;
    }
    return {
      ...a,
      progress,
      unlockedAt: unlocked ? new Date(now.getTime() - Math.random() * config.daysActive * 86400000).toISOString() : null,
    };
  });

  // ============ NOTES - matching store.ts NoteData structure ============
  // conceptNotes: Record<string, NoteEntry[]> where NoteEntry = { text, tags, createdAt, updatedAt }
  // generalNotes: GeneralNote[] where GeneralNote = { title, content, tags, createdAt, updatedAt }
  const notes: {
    questionNotes: Record<string, any[]>;
    conceptNotes: Record<string, { text: string; tags: string[]; createdAt: string; updatedAt: string }[]>;
    generalNotes: { title: string; content: string; tags: string[]; createdAt: string; updatedAt: string }[];
  } = { questionNotes: {}, conceptNotes: {}, generalNotes: [] };

  if (config.notesCount > 0) {
    const conceptNoteTexts = [
      { concept: 'Neural Networks', text: 'Key insight: gradient descent converges faster with adaptive learning rates like Adam or RMSProp.', tags: ['optimization', 'gradient'] },
      { concept: 'Regularization', text: 'Remember: L1 regularization promotes sparsity while L2 promotes small weights. L1 is better for feature selection.', tags: ['L1', 'L2', 'sparsity'] },
      { concept: 'Cross-Validation', text: 'Important: k-fold cross-validation helps estimate generalization error. Use stratified k-fold for imbalanced datasets.', tags: ['k-fold', 'evaluation'] },
      { concept: 'Overfitting', text: 'The bias-variance tradeoff is fundamental to understanding overfitting. High complexity = low bias, high variance.', tags: ['bias-variance', 'complexity'] },
      { concept: 'Ensemble Methods', text: 'Ensemble methods reduce variance by combining multiple weak learners. Bagging reduces variance, boosting reduces bias.', tags: ['bagging', 'boosting'] },
      { concept: 'Neural Networks', text: 'Neural network depth vs width: deeper networks can represent more complex hierarchical features.', tags: ['architecture', 'depth'] },
      { concept: 'Model Evaluation', text: 'Precision-Recall tradeoff: depends on the cost of false positives vs false negatives. Use F1 for balanced evaluation.', tags: ['precision', 'recall', 'F1'] },
      { concept: 'Clustering', text: 'K-means is sensitive to initialization; use K-means++ for better results. Elbow method helps choose K.', tags: ['K-means', 'initialization'] },
      { concept: 'Gradient Descent', text: 'Backpropagation applies chain rule to compute gradients efficiently. Vanishing gradients are a problem in deep networks.', tags: ['backprop', 'chain-rule'] },
      { concept: 'Feature Engineering', text: 'Feature scaling is important for distance-based algorithms (KNN, SVM). Use StandardScaler or MinMaxScaler.', tags: ['scaling', 'normalization'] },
    ];

    for (let i = 0; i < Math.min(config.notesCount, conceptNoteTexts.length); i++) {
      const noteData = conceptNoteTexts[i];
      const concept = noteData.concept;
      if (!notes.conceptNotes[concept]) notes.conceptNotes[concept] = [];
      const createdAt = new Date(now.getTime() - (config.notesCount - i) * 86400000).toISOString();
      notes.conceptNotes[concept].push({
        text: noteData.text,
        tags: noteData.tags,
        createdAt,
        updatedAt: createdAt,
      });
    }

    // General notes with proper structure: { title, content, tags, createdAt, updatedAt }
    const generalNoteTemplates = [
      {
        title: 'Weekly Study Plan',
        content: 'Focus on Neural Networks and Optimization this week. Review Overfitting concepts before the quiz. The adaptive system shows I need more practice with Regularization.',
        tags: ['plan', 'weekly'],
      },
      {
        title: 'Adaptive Learning Observations',
        content: 'The adaptive learning system identifies my weak areas quickly. After 20 questions, it already focused on my weakest concepts. Much more efficient than random question selection.',
        tags: ['adaptive', 'reflection'],
      },
      {
        title: 'Exam Preparation Notes',
        content: 'Key topics for the midterm: 1) Backpropagation derivation, 2) Regularization comparison (L1 vs L2), 3) Cross-validation methodology, 4) Ensemble methods (Random Forest vs Gradient Boosting).',
        tags: ['exam', 'preparation'],
      },
      {
        title: 'Algorithm Comparison Insights',
        content: 'Compared my performance in Adaptive vs Fixed mode. Adaptive mode helped me reach 80% accuracy in 15 fewer questions. The information gain metric seems to be the key factor.',
        tags: ['comparison', 'analysis'],
      },
    ];

    const notesToAdd = Math.min(Math.ceil(config.notesCount / 2), generalNoteTemplates.length);
    for (let i = 0; i < notesToAdd; i++) {
      const template = generalNoteTemplates[i];
      const createdAt = new Date(now.getTime() - (notesToAdd - i) * 2 * 86400000).toISOString();
      notes.generalNotes.push({
        title: template.title,
        content: template.content,
        tags: template.tags,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // ============ SPACED REPETITION - matching store.ts SRItem structure ============
  // SRItem = { ease, interval, reps, nextReview, lastReview, history: { date, quality, interval }[] }
  const spacedRepetition: Record<string, {
    ease: number;
    interval: number;
    reps: number;
    nextReview: string;
    lastReview: string | null;
    history: { date: string; quality: number; interval: number }[];
  }> = {};

  const reviewableWrong = wrongQuestions.slice(0, Math.min(config.reviewsDone, wrongQuestions.length));
  for (const wq of reviewableWrong) {
    const reps = Math.floor(Math.random() * 5) + 1;
    const reviewHistory: { date: string; quality: number; interval: number }[] = [];
    let currentInterval = 1;
    let currentEase = 2.5;

    for (let r = 0; r < reps; r++) {
      const reviewDate = new Date(now.getTime() - (reps - r) * 2 * 86400000);
      const quality = Math.random() > 0.3 ? (3 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));

      // Simulate SM-2 interval progression
      if (quality >= 3) {
        if (r === 0) currentInterval = 1;
        else if (r === 1) currentInterval = 3;
        else currentInterval = Math.round(currentInterval * currentEase);
        currentEase = Math.max(1.3, currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      } else {
        currentInterval = 1;
      }

      reviewHistory.push({
        date: reviewDate.toISOString().split('T')[0],
        quality,
        interval: currentInterval,
      });
    }

    // Some items due today (for demo), some due in the future
    const dueOffset = Math.random() > 0.4
      ? Math.floor(Math.random() * 3) * -1  // due today or overdue
      : Math.floor(Math.random() * 7) + 1;   // due in future

    spacedRepetition[String(wq.questionId)] = {
      ease: currentEase,
      interval: currentInterval,
      reps,
      nextReview: new Date(now.getTime() + dueOffset * 86400000).toISOString().split('T')[0],
      lastReview: new Date(now.getTime() - Math.random() * 3 * 86400000).toISOString().split('T')[0],
      history: reviewHistory,
    };
  }

  // Also add some correctly-answered questions to spaced review (for variety)
  const correctQuestionIds = allHistory
    .filter(h => h.correct)
    .map(h => h.questionId)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .slice(0, Math.max(0, config.reviewsDone - reviewableWrong.length));

  for (const qid of correctQuestionIds) {
    if (spacedRepetition[String(qid)]) continue;
    const reps = Math.floor(Math.random() * 3) + 2;
    const reviewHistory: { date: string; quality: number; interval: number }[] = [];
    let currentInterval = 1;
    let currentEase = 2.5;

    for (let r = 0; r < reps; r++) {
      const reviewDate = new Date(now.getTime() - (reps - r) * 3 * 86400000);
      const quality = 3 + Math.floor(Math.random() * 3); // mostly good reviews
      if (r === 0) currentInterval = 1;
      else if (r === 1) currentInterval = 3;
      else currentInterval = Math.round(currentInterval * currentEase);
      currentEase = Math.max(1.3, currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      reviewHistory.push({
        date: reviewDate.toISOString().split('T')[0],
        quality,
        interval: currentInterval,
      });
    }

    spacedRepetition[String(qid)] = {
      ease: currentEase,
      interval: currentInterval,
      reps,
      nextReview: new Date(now.getTime() + Math.floor(Math.random() * 14) * 86400000).toISOString().split('T')[0],
      lastReview: new Date(now.getTime() - Math.random() * 5 * 86400000).toISOString().split('T')[0],
      history: reviewHistory,
    };
  }

  const totalStudyTime = allHistory.reduce((s, h) => s + h.timeSpent, 0);

  return {
    username,
    createdAt: startDate.toISOString(),
    stats: {
      totalQuestions: totalQ,
      correctAnswers: correctQ,
      wrongAnswers: wrongQ,
      accuracy,
      bestStreak,
      currentStreak: Math.min(currentStreak, 5),
      totalStudyTime,
      conceptStats,
    },
    wrongQuestions,
    achievements,
    xp,
    level: levelInfo.level,
    streak: Math.min(config.daysActive, 7),
    lastActiveDate: now.toISOString().split('T')[0],
    spacedRepetition,
    notes,
    brainState: finalBrain,
    answeredQuestionIds: Array.from(new Set(allAnsweredIds)),
    sessionHistory: allHistory,
    dailyGoal: 10,
    dailyProgress: allHistory.filter(h =>
      h.timestamp.startsWith(now.toISOString().split('T')[0])
    ).length,
  };
}

// ============ CHALLENGE HISTORY - matching store.ts ChallengeResult structure ============
// ChallengeResult = { totalQuestions, correctAnswers, accuracy, timeUsed, timeLimit, conceptBreakdown, date }
function createChallengeHistory(count: number): {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeUsed: number;
  timeLimit: number;
  conceptBreakdown: Record<string, { total: number; correct: number }>;
  date: string;
}[] {
  const results: any[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const totalQ = [10, 15, 20][Math.floor(Math.random() * 3)];
    const correctQ = Math.floor(totalQ * (0.5 + Math.random() * 0.45));
    const timeLimit = [60, 120, 180][Math.floor(Math.random() * 3)];
    const timeUsed = Math.round(timeLimit * (0.6 + Math.random() * 0.35));

    // Generate concept breakdown
    const conceptBreakdown: Record<string, { total: number; correct: number }> = {};
    const usedConcepts = CONCEPTS.slice(0, 3 + Math.floor(Math.random() * 4));
    let remaining = totalQ;
    let remainingCorrect = correctQ;
    for (let c = 0; c < usedConcepts.length; c++) {
      const isLast = c === usedConcepts.length - 1;
      const cTotal = isLast ? remaining : Math.max(1, Math.floor(remaining / (usedConcepts.length - c) + (Math.random() - 0.5) * 2));
      const cCorrect = Math.min(cTotal, isLast ? remainingCorrect : Math.floor(cTotal * (0.4 + Math.random() * 0.5)));
      conceptBreakdown[usedConcepts[c]] = { total: cTotal, correct: Math.max(0, cCorrect) };
      remaining -= cTotal;
      remainingCorrect -= cCorrect;
    }

    results.push({
      totalQuestions: totalQ,
      correctAnswers: correctQ,
      accuracy: Math.round((correctQ / totalQ) * 100),
      timeLimit,
      timeUsed,
      conceptBreakdown,
      date: new Date(now.getTime() - (count - i) * 86400000 + Math.random() * 43200000).toISOString(),
    });
  }

  return results;
}

export function initializeDemoData() {
  // Check if already initialized
  if (localStorage.getItem(DEMO_INIT_KEY)) return false;

  const existingUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const existingPasswords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');

  // Demo Account 1: Alice - Advanced learner, heavy user
  const alice = createDemoProfile('Alice', {
    trueAbility: 0.78,
    totalAdaptive: 85,
    totalFixed: 30,
    daysActive: 14,
    challengesDone: 8,
    notesCount: 8,
    reviewsDone: 15,
  });

  // Demo Account 2: Bob - Intermediate learner
  const bob = createDemoProfile('Bob', {
    trueAbility: 0.52,
    totalAdaptive: 45,
    totalFixed: 20,
    daysActive: 7,
    challengesDone: 3,
    notesCount: 4,
    reviewsDone: 6,
  });

  // Demo Account 3: Carol - Beginner
  const carol = createDemoProfile('Carol', {
    trueAbility: 0.30,
    totalAdaptive: 25,
    totalFixed: 15,
    daysActive: 4,
    challengesDone: 1,
    notesCount: 2,
    reviewsDone: 3,
  });

  // Demo Account 4: David - Expert
  const david = createDemoProfile('David', {
    trueAbility: 0.92,
    totalAdaptive: 100,
    totalFixed: 35,
    daysActive: 21,
    challengesDone: 12,
    notesCount: 10,
    reviewsDone: 20,
  });

  // Save all profiles
  const allUsers = {
    ...existingUsers,
    'Alice': alice,
    'Bob': bob,
    'Carol': carol,
    'David': david,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));

  // Save passwords (all use "demo123")
  const allPasswords = {
    ...existingPasswords,
    'Alice': simpleHash('demo123'),
    'Bob': simpleHash('demo123'),
    'Carol': simpleHash('demo123'),
    'David': simpleHash('demo123'),
  };
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(allPasswords));

  // Save challenge histories - using per-user key format matching store.ts
  // store.ts uses: `${CHALLENGE_HISTORY_KEY}_${username}`
  const challengeData: Record<string, ReturnType<typeof createChallengeHistory>> = {
    'Alice': createChallengeHistory(8),
    'Bob': createChallengeHistory(3),
    'Carol': createChallengeHistory(1),
    'David': createChallengeHistory(12),
  };
  for (const [username, challenges] of Object.entries(challengeData)) {
    const key = `${CHALLENGE_HISTORY_KEY}_${username}`;
    localStorage.setItem(key, JSON.stringify(challenges));
  }

  // Mark as initialized
  localStorage.setItem(DEMO_INIT_KEY, 'true');

  return true;
}

// Force re-initialize demo data (for reset)
export function resetDemoData() {
  localStorage.removeItem(DEMO_INIT_KEY);
  // Remove demo accounts
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
  for (const name of ['Alice', 'Bob', 'Carol', 'David']) {
    delete users[name];
    delete passwords[name];
    // Remove per-user challenge history
    localStorage.removeItem(`${CHALLENGE_HISTORY_KEY}_${name}`);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  // Re-initialize
  return initializeDemoData();
}

export const DEMO_ACCOUNTS = [
  { username: 'Alice', password: 'demo123', description: 'Advanced learner (Level 6) — 115 questions, 14 days active, rich data across all features' },
  { username: 'Bob', password: 'demo123', description: 'Intermediate learner (Level 4) — 65 questions, 7 days active, moderate usage' },
  { username: 'Carol', password: 'demo123', description: 'Beginner (Level 2) — 40 questions, 4 days active, early stage' },
  { username: 'David', password: 'demo123', description: 'Expert user (Level 7) — 135 questions, 21 days active, comprehensive data' },
];
