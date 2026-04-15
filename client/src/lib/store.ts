/**
 * User state management with localStorage persistence
 * Replaces the original Python user_manager, achievement_system, wrong_questions, etc.
 */
import { Question, questions } from './questions';
import { BrainState, createInitialBrainState } from './adaptive-engine';

// ============ Types ============

export interface UserProfile {
  username: string;
  createdAt: string;
  stats: UserStats;
  wrongQuestions: WrongQuestion[];
  achievements: Achievement[];
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  spacedRepetition: Record<string, SRItem>;
  notes: NoteData;
  brainState: BrainState;
  answeredQuestionIds: number[];
  sessionHistory: SessionEntry[];
  dailyGoal: number;
  dailyProgress: number;
}

export interface UserStats {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  totalStudyTime: number;
  conceptStats: Record<string, { total: number; correct: number }>;
}

export interface WrongQuestion {
  questionId: number;
  question: string;
  concept: string;
  difficulty: number;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  hint: string;
  firstWrongTime: string;
  lastWrongTime: string;
  wrongCount: number;
  mastered: boolean;
  masteredTime: string | null;
  reviewCount: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface SRItem {
  ease: number;
  interval: number;
  reps: number;
  nextReview: string;
  lastReview: string | null;
  history: { date: string; quality: number; interval: number }[];
}

export interface NoteData {
  questionNotes: Record<string, NoteEntry[]>;
  conceptNotes: Record<string, NoteEntry[]>;
  generalNotes: GeneralNote[];
}

export interface NoteEntry {
  text: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneralNote {
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionEntry {
  questionId: number;
  concept: string;
  difficulty: number;
  correct: boolean;
  timestamp: string;
  timeSpent: number;
  mode?: 'adaptive' | 'fixed';
  abilityAfter?: number;
  entropyAfter?: number;
}

export interface ChallengeResult {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeUsed: number;
  timeLimit: number;
  conceptBreakdown: Record<string, { total: number; correct: number }>;
  date: string;
}

// ============ Achievement Definitions ============

export const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  { id: 'first_step', name: 'First Step', description: 'Answer your first question', icon: '🎯', category: 'milestone', target: 1 },
  { id: 'ten_questions', name: 'Getting Started', description: 'Answer 10 questions', icon: '📝', category: 'milestone', target: 10 },
  { id: 'fifty_questions', name: 'Dedicated Learner', description: 'Answer 50 questions', icon: '📚', category: 'milestone', target: 50 },
  { id: 'hundred_questions', name: 'Century Club', description: 'Answer 100 questions', icon: '🏆', category: 'milestone', target: 100 },
  { id: 'perfect_ten', name: 'Perfect Ten', description: 'Get 10 correct answers in a row', icon: '⭐', category: 'streak', target: 10 },
  { id: 'streak_twenty', name: 'Unstoppable', description: 'Get 20 correct answers in a row', icon: '🔥', category: 'streak', target: 20 },
  { id: 'accuracy_80', name: 'Sharpshooter', description: 'Reach 80% overall accuracy', icon: '🎯', category: 'accuracy', target: 80 },
  { id: 'accuracy_90', name: 'Marksman', description: 'Reach 90% overall accuracy', icon: '💎', category: 'accuracy', target: 90 },
  { id: 'all_concepts', name: 'Well-Rounded', description: 'Get at least 1 correct in every concept', icon: '🌟', category: 'knowledge', target: 10 },
  { id: 'concept_master', name: 'Concept Master', description: 'Reach 90% accuracy in any concept', icon: '🧠', category: 'knowledge', target: 90 },
  { id: 'first_review', name: 'Review Starter', description: 'Complete your first spaced review', icon: '🔄', category: 'review', target: 1 },
  { id: 'review_ten', name: 'Review Pro', description: 'Complete 10 spaced reviews', icon: '📖', category: 'review', target: 10 },
  { id: 'daily_goal', name: 'Goal Crusher', description: 'Complete your daily goal', icon: '✅', category: 'habit', target: 1 },
  { id: 'streak_3days', name: 'Three-Day Streak', description: 'Study for 3 consecutive days', icon: '📅', category: 'habit', target: 3 },
  { id: 'streak_7days', name: 'Weekly Warrior', description: 'Study for 7 consecutive days', icon: '🗓️', category: 'habit', target: 7 },
  { id: 'challenge_complete', name: 'Challenger', description: 'Complete a timed challenge', icon: '⚡', category: 'special', target: 1 },
];

// ============ Level System ============

export const LEVELS = [
  { level: 1, title: 'Beginner', minXP: 0, icon: '🌱' },
  { level: 2, title: 'Apprentice', minXP: 100, icon: '📖' },
  { level: 3, title: 'Explorer', minXP: 300, icon: '🔍' },
  { level: 4, title: 'Practitioner', minXP: 600, icon: '⚡' },
  { level: 5, title: 'Proficient', minXP: 1000, icon: '🎯' },
  { level: 6, title: 'Expert', minXP: 1500, icon: '🏅' },
  { level: 7, title: 'Master', minXP: 2500, icon: '👑' },
  { level: 8, title: 'Legend', minXP: 4000, icon: '🌟' },
];

export function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) current = l;
  }
  const nextLevel = LEVELS.find(l => l.minXP > xp);
  const xpForNext = nextLevel ? nextLevel.minXP - xp : 0;
  const xpProgress = nextLevel
    ? ((xp - current.minXP) / (nextLevel.minXP - current.minXP)) * 100
    : 100;
  return { ...current, xpForNext, xpProgress, nextLevel };
}

// ============ Knowledge Graph ============

export const KNOWLEDGE_GRAPH: Record<string, string[]> = {
  "Theory": [],
  "Supervised Learning": ["Theory"],
  "Unsupervised Learning": ["Theory"],
  "Optimization": ["Theory"],
  "Metrics": ["Supervised Learning"],
  "Overfitting": ["Supervised Learning", "Optimization"],
  "Regularization": ["Overfitting"],
  "Neural Networks": ["Supervised Learning", "Optimization"],
  "Ensemble": ["Supervised Learning"],
  "Methodology": ["Theory"],
};

// ============ Storage Helpers ============

const STORAGE_KEY = 'adaptive_learning_users';
const CURRENT_USER_KEY = 'adaptive_learning_current_user';
const CHALLENGE_HISTORY_KEY = 'adaptive_learning_challenges';

function getAllUsers(): Record<string, UserProfile> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function saveAllUsers(users: Record<string, UserProfile>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function getCurrentUser(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function setCurrentUser(username: string | null) {
  if (username) localStorage.setItem(CURRENT_USER_KEY, username);
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function getUserProfile(username: string): UserProfile | null {
  const users = getAllUsers();
  const profile = users[username] || null;
  if (profile) {
    // Migrate achievements: update names/descriptions from latest ACHIEVEMENT_DEFS
    let migrated = false;
    for (const ach of profile.achievements) {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === ach.id);
      if (def && (ach.name !== def.name || ach.description !== def.description)) {
        ach.name = def.name;
        ach.description = def.description;
        ach.icon = def.icon;
        migrated = true;
      }
    }
    // Add any new achievements that don't exist in old profile
    for (const def of ACHIEVEMENT_DEFS) {
      if (!profile.achievements.find(a => a.id === def.id)) {
        profile.achievements.push({ ...def, unlockedAt: null, progress: 0 });
        migrated = true;
      }
    }
    if (migrated) {
      users[username] = profile;
      saveAllUsers(users);
    }
  }
  return profile;
}

export function saveUserProfile(profile: UserProfile) {
  const users = getAllUsers();
  users[profile.username] = profile;
  saveAllUsers(users);
}

export function createUser(username: string, password: string): boolean {
  const users = getAllUsers();
  if (users[username]) return false;

  const now = new Date().toISOString();
  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map(a => ({
    ...a,
    unlockedAt: null,
    progress: 0,
  }));

  const profile: UserProfile = {
    username,
    createdAt: now,
    stats: {
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      accuracy: 0,
      bestStreak: 0,
      currentStreak: 0,
      totalStudyTime: 0,
      conceptStats: {},
    },
    wrongQuestions: [],
    achievements,
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: now.split('T')[0],
    spacedRepetition: {},
    notes: { questionNotes: {}, conceptNotes: {}, generalNotes: [] },
    brainState: createInitialBrainState(),
    answeredQuestionIds: [],
    sessionHistory: [],
    dailyGoal: 10,
    dailyProgress: 0,
  };

  // Store password hash separately
  const passwords = JSON.parse(localStorage.getItem('adaptive_learning_passwords') || '{}');
  passwords[username] = simpleHash(password);
  localStorage.setItem('adaptive_learning_passwords', JSON.stringify(passwords));

  users[username] = profile;
  saveAllUsers(users);
  return true;
}

export function loginUser(username: string, password: string): boolean {
  const users = getAllUsers();
  if (!users[username]) return false;
  const passwords = JSON.parse(localStorage.getItem('adaptive_learning_passwords') || '{}');
  return passwords[username] === simpleHash(password);
}

export function getAllUsernames(): string[] {
  return Object.keys(getAllUsers());
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ============ Answer Recording ============

export function recordAnswer(
  username: string,
  question: Question,
  userAnswer: string,
  correct: boolean,
  timeSpent: number,
  mode: 'adaptive' | 'fixed' = 'adaptive',
  abilityAfter?: number,
  entropyAfter?: number
): { xpGained: number; newAchievements: Achievement[] } {
  const profile = getUserProfile(username);
  if (!profile) return { xpGained: 0, newAchievements: [] };

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Update stats
  profile.stats.totalQuestions++;
  if (correct) {
    profile.stats.correctAnswers++;
    profile.stats.currentStreak++;
    if (profile.stats.currentStreak > profile.stats.bestStreak) {
      profile.stats.bestStreak = profile.stats.currentStreak;
    }
  } else {
    profile.stats.wrongAnswers++;
    profile.stats.currentStreak = 0;
  }
  profile.stats.accuracy = profile.stats.totalQuestions > 0
    ? Math.round((profile.stats.correctAnswers / profile.stats.totalQuestions) * 100)
    : 0;
  profile.stats.totalStudyTime += timeSpent;

  // Update concept stats
  if (!profile.stats.conceptStats[question.concept]) {
    profile.stats.conceptStats[question.concept] = { total: 0, correct: 0 };
  }
  profile.stats.conceptStats[question.concept].total++;
  if (correct) profile.stats.conceptStats[question.concept].correct++;

  // Add to session history
  profile.sessionHistory.push({
    questionId: question.id,
    concept: question.concept,
    difficulty: question.difficulty,
    correct,
    timestamp: now,
    timeSpent,
    mode,
    abilityAfter,
    entropyAfter,
  });

  // Track answered questions
  if (!profile.answeredQuestionIds.includes(question.id)) {
    profile.answeredQuestionIds.push(question.id);
  }

  // Wrong question management
  if (!correct) {
    const existing = profile.wrongQuestions.find(w => w.questionId === question.id);
    if (existing) {
      existing.wrongCount++;
      existing.lastWrongTime = now;
      existing.userAnswer = userAnswer;
    } else {
      profile.wrongQuestions.push({
        questionId: question.id,
        question: question.question,
        concept: question.concept,
        difficulty: question.difficulty,
        userAnswer,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        hint: question.hint,
        firstWrongTime: now,
        lastWrongTime: now,
        wrongCount: 1,
        mastered: false,
        masteredTime: null,
        reviewCount: 0,
      });
    }
  }

  // XP calculation
  let xpGained = correct ? 10 : 2;
  if (correct && question.difficulty > 0.5) xpGained += Math.round(question.difficulty * 10);
  if (profile.stats.currentStreak >= 5) xpGained += 5;
  profile.xp += xpGained;

  // Level update
  const levelInfo = getLevelInfo(profile.xp);
  profile.level = levelInfo.level;

  // Streak tracking
  if (profile.lastActiveDate !== today) {
    const lastDate = new Date(profile.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      profile.streak++;
    } else if (diffDays > 1) {
      profile.streak = 1;
    }
    profile.lastActiveDate = today;
    profile.dailyProgress = 0;
  }
  profile.dailyProgress++;

  // Check achievements
  const newAchievements = checkAchievements(profile);

  saveUserProfile(profile);
  return { xpGained, newAchievements };
}

// ============ Achievement Checking ============

function checkAchievements(profile: UserProfile): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  for (const ach of profile.achievements) {
    if (ach.unlockedAt) continue;

    let progress = 0;
    switch (ach.id) {
      case 'first_step': progress = Math.min(profile.stats.totalQuestions, 1); break;
      case 'ten_questions': progress = Math.min(profile.stats.totalQuestions, 10); break;
      case 'fifty_questions': progress = Math.min(profile.stats.totalQuestions, 50); break;
      case 'hundred_questions': progress = Math.min(profile.stats.totalQuestions, 100); break;
      case 'perfect_ten': progress = Math.min(profile.stats.currentStreak, 10); break;
      case 'streak_twenty': progress = Math.min(profile.stats.currentStreak, 20); break;
      case 'accuracy_80': progress = Math.min(profile.stats.accuracy, 80); break;
      case 'accuracy_90': progress = Math.min(profile.stats.accuracy, 90); break;
      case 'all_concepts': {
        const conceptsWithCorrect = Object.keys(profile.stats.conceptStats).filter(
          c => profile.stats.conceptStats[c].correct > 0
        ).length;
        progress = conceptsWithCorrect;
        break;
      }
      case 'concept_master': {
        let maxAcc = 0;
        for (const [, s] of Object.entries(profile.stats.conceptStats)) {
          if (s.total >= 3) {
            const acc = Math.round((s.correct / s.total) * 100);
            if (acc > maxAcc) maxAcc = acc;
          }
        }
        progress = maxAcc;
        break;
      }
      case 'first_review': {
        const totalReviews = Object.values(profile.spacedRepetition).reduce(
          (sum, item) => sum + item.history.length, 0
        );
        progress = Math.min(totalReviews, 1);
        break;
      }
      case 'review_ten': {
        const totalReviews = Object.values(profile.spacedRepetition).reduce(
          (sum, item) => sum + item.history.length, 0
        );
        progress = Math.min(totalReviews, 10);
        break;
      }
      case 'daily_goal':
        progress = profile.dailyProgress >= profile.dailyGoal ? 1 : 0;
        break;
      case 'streak_3days': progress = Math.min(profile.streak, 3); break;
      case 'streak_7days': progress = Math.min(profile.streak, 7); break;
      case 'challenge_complete': {
        const challenges = getChallengeHistory(profile.username);
        progress = challenges.length > 0 ? 1 : 0;
        break;
      }
    }

    ach.progress = progress;
    if (progress >= ach.target && !ach.unlockedAt) {
      ach.unlockedAt = now;
      profile.xp += 50;
      newlyUnlocked.push(ach);
    }
  }

  return newlyUnlocked;
}

// ============ Spaced Repetition (SM-2) ============

export function addToReview(username: string, questionId: number) {
  const profile = getUserProfile(username);
  if (!profile) return;
  const qid = String(questionId);
  if (!profile.spacedRepetition[qid]) {
    profile.spacedRepetition[qid] = {
      ease: 2.5,
      interval: 0,
      reps: 0,
      nextReview: new Date().toISOString().split('T')[0],
      lastReview: null,
      history: [],
    };
    saveUserProfile(profile);
  }
}

export function recordReview(username: string, questionId: number, quality: number) {
  const profile = getUserProfile(username);
  if (!profile) return;
  const qid = String(questionId);
  const item = profile.spacedRepetition[qid];
  if (!item) return;

  quality = Math.max(0, Math.min(5, quality));
  const oldEase = item.ease;
  let newEase = oldEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEase = Math.max(1.3, newEase);

  if (quality >= 3) {
    item.reps++;
    if (item.reps <= 1) item.interval = 1;
    else if (item.reps === 2) item.interval = 3;
    else item.interval = Math.max(1, Math.round(item.interval * newEase));
  } else {
    item.reps = 0;
    item.interval = 1;
  }

  item.ease = Math.round(newEase * 10000) / 10000;
  const now = new Date();
  item.lastReview = now.toISOString();
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + item.interval);
  item.nextReview = nextDate.toISOString().split('T')[0];
  item.history.push({
    date: now.toISOString(),
    quality,
    interval: item.interval,
  });

  saveUserProfile(profile);
}

export function getDueReviews(username: string): { questionId: number; item: SRItem }[] {
  const profile = getUserProfile(username);
  if (!profile) return [];
  const today = new Date().toISOString().split('T')[0];
  const due: { questionId: number; item: SRItem }[] = [];
  for (const [qid, item] of Object.entries(profile.spacedRepetition)) {
    if (item.nextReview <= today) {
      due.push({ questionId: parseInt(qid), item });
    }
  }
  due.sort((a, b) => a.item.nextReview.localeCompare(b.item.nextReview));
  return due;
}

export function getReviewStats(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return { totalCards: 0, dueToday: 0, mature: 0, learning: 0, retentionRate: 0, totalReviews: 0, forecast: {} as Record<string, number> };
  const sr = profile.spacedRepetition;
  const today = new Date().toISOString().split('T')[0];
  const total = Object.keys(sr).length;
  const dueToday = Object.values(sr).filter(i => i.nextReview <= today).length;
  const mature = Object.values(sr).filter(i => i.interval >= 21).length;
  const learning = total - mature;
  const totalReviews = Object.values(sr).reduce((s, i) => s + (i.history?.length || 0), 0);
  const correctReviews = Object.values(sr).reduce(
    (s, i) => s + (i.history?.filter((h: any) => h.quality >= 3)?.length || 0), 0
  );
  const retentionRate = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100 * 10) / 10 : 0;

  const forecast: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    forecast[ds] = Object.values(sr).filter(item => item.nextReview === ds).length;
  }

  return { totalCards: total, dueToday, mature, learning, retentionRate, totalReviews, forecast };
}

// ============ Challenge History ============

export function saveChallengeResult(username: string, result: ChallengeResult) {
  const key = `${CHALLENGE_HISTORY_KEY}_${username}`;
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.push(result);
  localStorage.setItem(key, JSON.stringify(history));
}

export function getChallengeHistory(username: string): ChallengeResult[] {
  const key = `${CHALLENGE_HISTORY_KEY}_${username}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

// ============ Notes ============

export function addQuestionNote(username: string, questionId: number, text: string, tags: string[] = []) {
  const profile = getUserProfile(username);
  if (!profile) return;
  const qid = String(questionId);
  if (!profile.notes.questionNotes[qid]) profile.notes.questionNotes[qid] = [];
  const now = new Date().toISOString();
  profile.notes.questionNotes[qid].push({ text, tags, createdAt: now, updatedAt: now });
  saveUserProfile(profile);
}

export function addConceptNote(username: string, concept: string, text: string) {
  const profile = getUserProfile(username);
  if (!profile) return;
  if (!profile.notes.conceptNotes[concept]) profile.notes.conceptNotes[concept] = [];
  const now = new Date().toISOString();
  profile.notes.conceptNotes[concept].push({ text, tags: [], createdAt: now, updatedAt: now });
  saveUserProfile(profile);
}

export function addGeneralNote(username: string, title: string, content: string, tags: string[] = []) {
  const profile = getUserProfile(username);
  if (!profile) return;
  const now = new Date().toISOString();
  profile.notes.generalNotes.push({ title, content, tags, createdAt: now, updatedAt: now });
  saveUserProfile(profile);
}

export function deleteGeneralNote(username: string, index: number) {
  const profile = getUserProfile(username);
  if (!profile) return;
  profile.notes.generalNotes.splice(index, 1);
  saveUserProfile(profile);
}

// ============ Leaderboard ============

export function getLeaderboard(metric: 'totalQuestions' | 'accuracy' | 'bestStreak' | 'xp' = 'xp') {
  const users = getAllUsers();
  const entries = Object.values(users).map(u => ({
    username: u.username,
    totalQuestions: u.stats.totalQuestions,
    accuracy: u.stats.accuracy,
    bestStreak: u.stats.bestStreak,
    xp: u.xp,
    level: u.level,
    levelInfo: getLevelInfo(u.xp),
  }));
  entries.sort((a, b) => {
    const av = a[metric] as number;
    const bv = b[metric] as number;
    return bv - av;
  });
  return entries.slice(0, 20);
}

// ============ Report Generation ============

export function generateReport(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return null;

  const conceptBreakdown = Object.entries(profile.stats.conceptStats).map(([concept, s]) => ({
    concept,
    total: s.total,
    correct: s.correct,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100 * 10) / 10 : 0,
  })).sort((a, b) => a.accuracy - b.accuracy);

  const strengths = [...conceptBreakdown].filter(c => c.total >= 2).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const weaknesses = [...conceptBreakdown].filter(c => c.total >= 2).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

  const recommendations: string[] = [];
  if (profile.stats.accuracy < 60) recommendations.push('Consider reviewing foundational concepts before tackling harder questions.');
  if (profile.stats.accuracy >= 80) recommendations.push('Great accuracy! Try challenging yourself with harder questions.');
  for (const w of weaknesses) {
    if (w.accuracy < 50) recommendations.push(`Concept "${w.concept}" needs more practice (accuracy: ${w.accuracy}%).`);
  }
  if (profile.stats.totalQuestions < 20) recommendations.push('Answer more questions for a more accurate ability assessment.');

  return {
    overview: profile.stats,
    conceptBreakdown,
    strengths,
    weaknesses,
    recommendations,
    xp: profile.xp,
    level: getLevelInfo(profile.xp),
    streak: profile.streak,
    wrongQuestionCount: profile.wrongQuestions.filter(w => !w.mastered).length,
  };
}

export function resetUserData(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return;
  profile.stats = {
    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
    totalStudyTime: 0,
    bestStreak: 0,
    currentStreak: 0,
    conceptStats: {},
  };
  profile.wrongQuestions = [];
  profile.achievements = ACHIEVEMENT_DEFS.map(a => ({ ...a, unlockedAt: null, progress: 0 }));
  profile.xp = 0;
  profile.level = 1;
  profile.streak = 0;
  profile.spacedRepetition = {};
  profile.notes = { questionNotes: {}, generalNotes: [], conceptNotes: {} };
  profile.brainState = createInitialBrainState();
  profile.answeredQuestionIds = [];
  profile.sessionHistory = [];
  profile.dailyProgress = 0;
  saveUserProfile(profile);
}
