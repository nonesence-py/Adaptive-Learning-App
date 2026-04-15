/**
 * Adaptive Learning Engine
 * Implements Active Inference with 4PL IRT model
 * Ported from the original Python algo.py
 */
import { Question } from './questions';

const GRID_SIZE = 20;
const ABILITY_MIN = 0.01;
const ABILITY_MAX = 0.99;

// Create ability grid
function linspace(start: number, end: number, n: number): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

export const ABILITY_GRID = linspace(ABILITY_MIN, ABILITY_MAX, GRID_SIZE);

// 4PL IRT model
function irt4pl(
  ability: number,
  difficulty: number,
  discrimination: number = 1.5,
  guessing: number = 0.2,
  slipping: number = 0.05
): number {
  const z = discrimination * (ability - difficulty);
  const expZ = Math.exp(z);
  return guessing + (1 - guessing - slipping) * (expZ / (1 + expZ));
}

// Entropy of a distribution
function entropy(dist: number[]): number {
  let h = 0;
  for (const p of dist) {
    if (p > 1e-10) h -= p * Math.log2(p);
  }
  return h;
}

// Normalize distribution
function normalize(dist: number[]): number[] {
  const sum = dist.reduce((a, b) => a + b, 0);
  if (sum < 1e-10) return dist.map(() => 1 / dist.length);
  return dist.map(v => v / sum);
}

export interface BrainState {
  belief: number[];
  estimatedAbility: number;
  uncertainty: number;
  history: { questionId: number; correct: boolean; ability: number }[];
}

export function createInitialBrainState(): BrainState {
  const uniform = Array(GRID_SIZE).fill(1 / GRID_SIZE);
  return {
    belief: uniform,
    estimatedAbility: 0.5,
    uncertainty: entropy(uniform),
    history: [],
  };
}

// Update belief after observing answer
export function updateBelief(
  state: BrainState,
  question: Question,
  correct: boolean
): BrainState {
  const newBelief = [...state.belief];
  for (let i = 0; i < GRID_SIZE; i++) {
    const pCorrect = irt4pl(ABILITY_GRID[i], question.difficulty);
    const likelihood = correct ? pCorrect : 1 - pCorrect;
    newBelief[i] *= likelihood;
  }
  const normalizedBelief = normalize(newBelief);

  // Compute estimated ability (expected value)
  let estimatedAbility = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    estimatedAbility += ABILITY_GRID[i] * normalizedBelief[i];
  }

  const newHistory = [
    ...state.history,
    { questionId: question.id, correct, ability: estimatedAbility },
  ];

  return {
    belief: normalizedBelief,
    estimatedAbility,
    uncertainty: entropy(normalizedBelief),
    history: newHistory,
  };
}

// Expected Information Gain for a question
export function expectedInformationGain(
  belief: number[],
  question: Question
): number {
  const priorEntropy = entropy(belief);
  let expectedPosteriorEntropy = 0;

  // P(correct) marginalized over ability
  let pCorrectMarginal = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    pCorrectMarginal += irt4pl(ABILITY_GRID[i], question.difficulty) * belief[i];
  }
  const pWrongMarginal = 1 - pCorrectMarginal;

  // Posterior if correct
  const beliefIfCorrect = belief.map(
    (b, i) => b * irt4pl(ABILITY_GRID[i], question.difficulty)
  );
  const normCorrect = normalize(beliefIfCorrect);

  // Posterior if wrong
  const beliefIfWrong = belief.map(
    (b, i) => b * (1 - irt4pl(ABILITY_GRID[i], question.difficulty))
  );
  const normWrong = normalize(beliefIfWrong);

  expectedPosteriorEntropy =
    pCorrectMarginal * entropy(normCorrect) +
    pWrongMarginal * entropy(normWrong);

  return priorEntropy - expectedPosteriorEntropy;
}

// Select next question using Active Inference (max EIG)
export function selectNextQuestion(
  state: BrainState,
  availableQuestions: Question[]
): Question | null {
  if (availableQuestions.length === 0) return null;

  let bestQuestion = availableQuestions[0];
  let bestEIG = -Infinity;

  for (const q of availableQuestions) {
    const eig = expectedInformationGain(state.belief, q);
    if (eig > bestEIG) {
      bestEIG = eig;
      bestQuestion = q;
    }
  }

  return bestQuestion;
}

// Get ability grid for visualization
export function getAbilityGrid(): number[] {
  return [...ABILITY_GRID];
}

// Get concept mastery from history
export function getConceptMastery(
  history: { questionId: number; correct: boolean }[],
  allQuestions: Question[]
): Record<string, { total: number; correct: number; accuracy: number }> {
  const mastery: Record<string, { total: number; correct: number; accuracy: number }> = {};

  for (const entry of history) {
    const q = allQuestions.find(qq => qq.id === entry.questionId);
    if (!q) continue;
    if (!mastery[q.concept]) mastery[q.concept] = { total: 0, correct: 0, accuracy: 0 };
    mastery[q.concept].total++;
    if (entry.correct) mastery[q.concept].correct++;
  }

  for (const key of Object.keys(mastery)) {
    mastery[key].accuracy =
      mastery[key].total > 0
        ? Math.round((mastery[key].correct / mastery[key].total) * 100)
        : 0;
  }

  return mastery;
}
