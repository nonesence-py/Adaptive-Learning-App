/**
 * Simulation Data Module
 * Contains pre-computed simulation results from 160 experiments
 * (80 Adaptive + 80 Linear, 8 ability levels × 10 students each)
 * 
 * Design: Clean Blue Glass Tech Style
 * This data powers the Algorithm Demo page to showcase
 * Active Inference vs Linear (Fixed Sequence) performance
 */

// ============================================================
// Overall Statistics
// ============================================================
export const OVERALL_STATS = {
  totalExperiments: 160,
  adaptiveCount: 80,
  linearCount: 80,
  abilityLevels: 8,
  studentsPerLevel: 10,
  convergenceThreshold: 0.05,
  maxQuestions: 50,

  adaptive: {
    meanSteps: 5.90,
    medianSteps: 3,
    stdSteps: 6.06,
    convergenceRate: 1.0,
    meanError: 0.0307,
  },
  linear: {
    meanSteps: 12.95,
    medianSteps: 9,
    stdSteps: 14.61,
    convergenceRate: 0.875,
    meanError: 0.0405,
  },

  overallImprovement: 54.4,
  pValue: 0.000124,
  cohensD: 0.6303,
  effectSize: 'Medium',
  testMethod: "Welch's t-test",
};

// ============================================================
// Per-Ability-Level Summary
// ============================================================
export interface AbilityLevelSummary {
  ability: number;
  adaptiveMean: number;
  adaptiveStd: number;
  adaptiveMedian: number;
  adaptiveConvergenceRate: number;
  adaptiveMeanError: number;
  linearMean: number;
  linearStd: number;
  linearMedian: number;
  linearConvergenceRate: number;
  linearMeanError: number;
  improvement: number;
  pValue: number;
  significant: boolean;
  cohensD: number;
}

export const ABILITY_LEVEL_SUMMARY: AbilityLevelSummary[] = [
  { ability: 0.2, adaptiveMean: 6.20, adaptiveStd: 3.22, adaptiveMedian: 7, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0152, linearMean: 5.10, linearStd: 5.45, linearMedian: 2.5, linearConvergenceRate: 1.0, linearMeanError: 0.0371, improvement: -21.6, pValue: 0.1805, significant: false, cohensD: 0.246 },
  { ability: 0.3, adaptiveMean: 4.40, adaptiveStd: 3.81, adaptiveMedian: 3, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0186, linearMean: 10.80, linearStd: 14.88, linearMedian: 5, linearConvergenceRate: 0.9, linearMeanError: 0.0342, improvement: 59.3, pValue: 0.3210, significant: false, cohensD: -0.589 },
  { ability: 0.4, adaptiveMean: 4.10, adaptiveStd: 4.12, adaptiveMedian: 2, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0252, linearMean: 16.80, linearStd: 17.55, linearMedian: 11, linearConvergenceRate: 0.9, linearMeanError: 0.0516, improvement: 75.6, pValue: 0.0042, significant: true, cohensD: -0.996 },
  { ability: 0.5, adaptiveMean: 7.90, adaptiveStd: 8.05, adaptiveMedian: 4, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0307, linearMean: 20.40, linearStd: 14.10, linearMedian: 16, linearConvergenceRate: 0.9, linearMeanError: 0.0329, improvement: 61.3, pValue: 0.0162, significant: true, cohensD: -1.089 },
  { ability: 0.6, adaptiveMean: 4.50, adaptiveStd: 7.35, adaptiveMedian: 1, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0310, linearMean: 1.40, linearStd: 1.26, linearMedian: 1, linearConvergenceRate: 1.0, linearMeanError: 0.0333, improvement: -221.4, pValue: 0.2559, significant: false, cohensD: 0.588 },
  { ability: 0.7, adaptiveMean: 3.50, adaptiveStd: 1.96, adaptiveMedian: 2, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0283, linearMean: 3.60, linearStd: 3.37, linearMedian: 2, linearConvergenceRate: 1.0, linearMeanError: 0.0387, improvement: 2.8, pValue: 0.6072, significant: false, cohensD: -0.036 },
  { ability: 0.8, adaptiveMean: 4.10, adaptiveStd: 2.42, adaptiveMedian: 3, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0065, linearMean: 15.50, linearStd: 13.48, linearMedian: 9, linearConvergenceRate: 0.9, linearMeanError: 0.0319, improvement: 73.5, pValue: 0.0007, significant: true, cohensD: -1.177 },
  { ability: 0.9, adaptiveMean: 12.50, adaptiveStd: 8.98, adaptiveMedian: 11, adaptiveConvergenceRate: 1.0, adaptiveMeanError: 0.0346, linearMean: 30.00, linearStd: 13.93, linearMedian: 22, linearConvergenceRate: 0.7, linearMeanError: 0.0645, improvement: 58.3, pValue: 0.0012, significant: true, cohensD: -1.493 },
];

// ============================================================
// Ability Trajectories (sampled representative students)
// For convergence speed comparison charts
// ============================================================
export interface TrajectoryPoint {
  step: number;
  estimatedAbility: number;
  entropy: number;
}

export interface StudentTrajectory {
  studentId: string;
  trueAbility: number;
  mode: 'Adaptive' | 'Linear';
  trajectory: TrajectoryPoint[];
  convergenceStep: number;
  converged: boolean;
}

// Representative trajectories for key ability levels (0.3, 0.5, 0.7, 0.9)
export const REPRESENTATIVE_TRAJECTORIES: StudentTrajectory[] = [
  // Ability 0.3 - Adaptive (fast convergence)
  {
    studentId: 'Robot_0.3_000_Adaptive', trueAbility: 0.3, mode: 'Adaptive', convergenceStep: 3, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.30, entropy: 2.73 },
      { step: 2, estimatedAbility: 0.28, entropy: 2.45 },
      { step: 3, estimatedAbility: 0.28, entropy: 2.20 },
    ]
  },
  // Ability 0.3 - Linear (slow convergence)
  {
    studentId: 'Robot_0.3_000_Linear', trueAbility: 0.3, mode: 'Linear', convergenceStep: 19, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.57, entropy: 2.96 },
      { step: 2, estimatedAbility: 0.34, entropy: 2.77 },
      { step: 3, estimatedAbility: 0.37, entropy: 2.78 },
      { step: 4, estimatedAbility: 0.44, entropy: 2.80 },
      { step: 5, estimatedAbility: 0.29, entropy: 2.57 },
      { step: 6, estimatedAbility: 0.31, entropy: 2.50 },
      { step: 7, estimatedAbility: 0.36, entropy: 2.48 },
      { step: 8, estimatedAbility: 0.40, entropy: 2.45 },
      { step: 9, estimatedAbility: 0.35, entropy: 2.38 },
      { step: 10, estimatedAbility: 0.38, entropy: 2.32 },
      { step: 11, estimatedAbility: 0.33, entropy: 2.25 },
      { step: 12, estimatedAbility: 0.36, entropy: 2.20 },
      { step: 13, estimatedAbility: 0.32, entropy: 2.12 },
      { step: 14, estimatedAbility: 0.35, entropy: 2.05 },
      { step: 15, estimatedAbility: 0.33, entropy: 1.98 },
      { step: 16, estimatedAbility: 0.31, entropy: 1.90 },
      { step: 17, estimatedAbility: 0.33, entropy: 1.82 },
      { step: 18, estimatedAbility: 0.35, entropy: 1.75 },
      { step: 19, estimatedAbility: 0.35, entropy: 1.68 },
    ]
  },
  // Ability 0.5 - Adaptive
  {
    studentId: 'Robot_0.5_000_Adaptive', trueAbility: 0.5, mode: 'Adaptive', convergenceStep: 3, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.54, entropy: 2.73 },
      { step: 2, estimatedAbility: 0.48, entropy: 2.40 },
      { step: 3, estimatedAbility: 0.54, entropy: 2.15 },
    ]
  },
  // Ability 0.5 - Linear
  {
    studentId: 'Robot_0.5_000_Linear', trueAbility: 0.5, mode: 'Linear', convergenceStep: 50, converged: false,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.57, entropy: 2.96 },
      { step: 2, estimatedAbility: 0.65, entropy: 2.83 },
      { step: 3, estimatedAbility: 0.49, entropy: 2.99 },
      { step: 4, estimatedAbility: 0.24, entropy: 2.56 },
      { step: 5, estimatedAbility: 0.29, entropy: 2.57 },
      { step: 6, estimatedAbility: 0.33, entropy: 2.60 },
      { step: 7, estimatedAbility: 0.38, entropy: 2.55 },
      { step: 8, estimatedAbility: 0.44, entropy: 2.48 },
      { step: 9, estimatedAbility: 0.48, entropy: 2.40 },
      { step: 10, estimatedAbility: 0.51, entropy: 2.32 },
      { step: 12, estimatedAbility: 0.55, entropy: 2.25 },
      { step: 14, estimatedAbility: 0.58, entropy: 2.18 },
      { step: 16, estimatedAbility: 0.60, entropy: 2.10 },
      { step: 18, estimatedAbility: 0.57, entropy: 2.05 },
      { step: 20, estimatedAbility: 0.62, entropy: 2.00 },
      { step: 25, estimatedAbility: 0.58, entropy: 1.90 },
      { step: 30, estimatedAbility: 0.60, entropy: 1.82 },
      { step: 35, estimatedAbility: 0.63, entropy: 1.78 },
      { step: 40, estimatedAbility: 0.64, entropy: 1.75 },
      { step: 45, estimatedAbility: 0.65, entropy: 1.72 },
      { step: 50, estimatedAbility: 0.65, entropy: 1.70 },
    ]
  },
  // Ability 0.7 - Adaptive
  {
    studentId: 'Robot_0.7_002_Adaptive', trueAbility: 0.7, mode: 'Adaptive', convergenceStep: 2, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.63, entropy: 2.89 },
      { step: 2, estimatedAbility: 0.73, entropy: 2.78 },
    ]
  },
  // Ability 0.7 - Linear
  {
    studentId: 'Robot_0.7_003_Linear', trueAbility: 0.7, mode: 'Linear', convergenceStep: 10, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.57, entropy: 2.96 },
      { step: 2, estimatedAbility: 0.65, entropy: 2.83 },
      { step: 3, estimatedAbility: 0.49, entropy: 2.99 },
      { step: 4, estimatedAbility: 0.56, entropy: 2.90 },
      { step: 5, estimatedAbility: 0.57, entropy: 2.85 },
      { step: 6, estimatedAbility: 0.62, entropy: 2.78 },
      { step: 7, estimatedAbility: 0.60, entropy: 2.75 },
      { step: 8, estimatedAbility: 0.65, entropy: 2.72 },
      { step: 9, estimatedAbility: 0.68, entropy: 2.70 },
      { step: 10, estimatedAbility: 0.70, entropy: 2.68 },
    ]
  },
  // Ability 0.9 - Adaptive
  {
    studentId: 'Robot_0.9_002_Adaptive', trueAbility: 0.9, mode: 'Adaptive', convergenceStep: 5, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.63, entropy: 2.89 },
      { step: 2, estimatedAbility: 0.73, entropy: 2.78 },
      { step: 3, estimatedAbility: 0.80, entropy: 2.65 },
      { step: 4, estimatedAbility: 0.85, entropy: 2.50 },
      { step: 5, estimatedAbility: 0.87, entropy: 2.38 },
    ]
  },
  // Ability 0.9 - Linear
  {
    studentId: 'Robot_0.9_000_Linear', trueAbility: 0.9, mode: 'Linear', convergenceStep: 23, converged: true,
    trajectory: [
      { step: 0, estimatedAbility: 0.50, entropy: 3.00 },
      { step: 1, estimatedAbility: 0.57, entropy: 2.96 },
      { step: 2, estimatedAbility: 0.65, entropy: 2.83 },
      { step: 3, estimatedAbility: 0.49, entropy: 2.99 },
      { step: 4, estimatedAbility: 0.56, entropy: 2.90 },
      { step: 5, estimatedAbility: 0.57, entropy: 2.85 },
      { step: 6, estimatedAbility: 0.62, entropy: 2.78 },
      { step: 7, estimatedAbility: 0.65, entropy: 2.72 },
      { step: 8, estimatedAbility: 0.70, entropy: 2.65 },
      { step: 9, estimatedAbility: 0.68, entropy: 2.60 },
      { step: 10, estimatedAbility: 0.72, entropy: 2.55 },
      { step: 12, estimatedAbility: 0.75, entropy: 2.48 },
      { step: 14, estimatedAbility: 0.78, entropy: 2.40 },
      { step: 16, estimatedAbility: 0.80, entropy: 2.32 },
      { step: 18, estimatedAbility: 0.82, entropy: 2.25 },
      { step: 20, estimatedAbility: 0.85, entropy: 2.18 },
      { step: 23, estimatedAbility: 0.85, entropy: 2.10 },
    ]
  },
];

// ============================================================
// Convergence Steps Raw Data (for boxplot)
// ============================================================
export interface ConvergenceDataPoint {
  ability: number;
  mode: 'Adaptive' | 'Linear';
  steps: number;
  converged: boolean;
  finalError: number;
}

export const CONVERGENCE_RAW_DATA: ConvergenceDataPoint[] = [
  // Ability 0.2
  { ability: 0.2, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.015 },
  { ability: 0.2, mode: 'Adaptive', steps: 10, converged: true, finalError: 0.029 },
  { ability: 0.2, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.015 },
  { ability: 0.2, mode: 'Adaptive', steps: 7, converged: true, finalError: 0.026 },
  { ability: 0.2, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.007 },
  { ability: 0.2, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.007 },
  { ability: 0.2, mode: 'Adaptive', steps: 7, converged: true, finalError: 0.000 },
  { ability: 0.2, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.002 },
  { ability: 0.2, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.015 },
  { ability: 0.2, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.035 },
  { ability: 0.2, mode: 'Linear', steps: 7, converged: true, finalError: 0.041 },
  { ability: 0.2, mode: 'Linear', steps: 1, converged: true, finalError: 0.040 },
  { ability: 0.2, mode: 'Linear', steps: 6, converged: true, finalError: 0.011 },
  { ability: 0.2, mode: 'Linear', steps: 4, converged: true, finalError: 0.039 },
  { ability: 0.2, mode: 'Linear', steps: 1, converged: true, finalError: 0.040 },
  { ability: 0.2, mode: 'Linear', steps: 1, converged: true, finalError: 0.040 },
  { ability: 0.2, mode: 'Linear', steps: 15, converged: true, finalError: 0.045 },
  { ability: 0.2, mode: 'Linear', steps: 14, converged: true, finalError: 0.037 },
  { ability: 0.2, mode: 'Linear', steps: 1, converged: true, finalError: 0.040 },
  { ability: 0.2, mode: 'Linear', steps: 1, converged: true, finalError: 0.040 },
  // Ability 0.3
  { ability: 0.3, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.018 },
  { ability: 0.3, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.001 },
  { ability: 0.3, mode: 'Adaptive', steps: 8, converged: true, finalError: 0.047 },
  { ability: 0.3, mode: 'Adaptive', steps: 11, converged: true, finalError: 0.018 },
  { ability: 0.3, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.001 },
  { ability: 0.3, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.018 },
  { ability: 0.3, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.018 },
  { ability: 0.3, mode: 'Adaptive', steps: 10, converged: true, finalError: 0.046 },
  { ability: 0.3, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.018 },
  { ability: 0.3, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.001 },
  { ability: 0.3, mode: 'Linear', steps: 19, converged: true, finalError: 0.048 },
  { ability: 0.3, mode: 'Linear', steps: 50, converged: false, finalError: 0.086 },
  { ability: 0.3, mode: 'Linear', steps: 2, converged: true, finalError: 0.036 },
  { ability: 0.3, mode: 'Linear', steps: 2, converged: true, finalError: 0.036 },
  { ability: 0.3, mode: 'Linear', steps: 13, converged: true, finalError: 0.035 },
  { ability: 0.3, mode: 'Linear', steps: 2, converged: true, finalError: 0.036 },
  { ability: 0.3, mode: 'Linear', steps: 5, converged: true, finalError: 0.010 },
  { ability: 0.3, mode: 'Linear', steps: 5, converged: true, finalError: 0.013 },
  { ability: 0.3, mode: 'Linear', steps: 2, converged: true, finalError: 0.036 },
  { ability: 0.3, mode: 'Linear', steps: 8, converged: true, finalError: 0.005 },
  // Ability 0.4
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.044 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.044 },
  { ability: 0.4, mode: 'Adaptive', steps: 14, converged: true, finalError: 0.012 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.014 },
  { ability: 0.4, mode: 'Adaptive', steps: 4, converged: true, finalError: 0.004 },
  { ability: 0.4, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.046 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.014 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.044 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.014 },
  { ability: 0.4, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.014 },
  { ability: 0.4, mode: 'Linear', steps: 3, converged: true, finalError: 0.029 },
  { ability: 0.4, mode: 'Linear', steps: 11, converged: true, finalError: 0.049 },
  { ability: 0.4, mode: 'Linear', steps: 14, converged: true, finalError: 0.032 },
  { ability: 0.4, mode: 'Linear', steps: 50, converged: false, finalError: 0.186 },
  { ability: 0.4, mode: 'Linear', steps: 11, converged: true, finalError: 0.049 },
  { ability: 0.4, mode: 'Linear', steps: 3, converged: true, finalError: 0.029 },
  { ability: 0.4, mode: 'Linear', steps: 10, converged: true, finalError: 0.035 },
  { ability: 0.4, mode: 'Linear', steps: 3, converged: true, finalError: 0.029 },
  { ability: 0.4, mode: 'Linear', steps: 48, converged: true, finalError: 0.039 },
  { ability: 0.4, mode: 'Linear', steps: 15, converged: true, finalError: 0.038 },
  // Ability 0.5
  { ability: 0.5, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.036 },
  { ability: 0.5, mode: 'Adaptive', steps: 11, converged: true, finalError: 0.019 },
  { ability: 0.5, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.036 },
  { ability: 0.5, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.030 },
  { ability: 0.5, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.036 },
  { ability: 0.5, mode: 'Adaptive', steps: 28, converged: true, finalError: 0.043 },
  { ability: 0.5, mode: 'Adaptive', steps: 6, converged: true, finalError: 0.021 },
  { ability: 0.5, mode: 'Adaptive', steps: 14, converged: true, finalError: 0.035 },
  { ability: 0.5, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.026 },
  { ability: 0.5, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.026 },
  { ability: 0.5, mode: 'Linear', steps: 50, converged: false, finalError: 0.152 },
  { ability: 0.5, mode: 'Linear', steps: 10, converged: true, finalError: 0.012 },
  { ability: 0.5, mode: 'Linear', steps: 18, converged: true, finalError: 0.017 },
  { ability: 0.5, mode: 'Linear', steps: 14, converged: true, finalError: 0.003 },
  { ability: 0.5, mode: 'Linear', steps: 26, converged: true, finalError: 0.001 },
  { ability: 0.5, mode: 'Linear', steps: 10, converged: true, finalError: 0.012 },
  { ability: 0.5, mode: 'Linear', steps: 10, converged: true, finalError: 0.012 },
  { ability: 0.5, mode: 'Linear', steps: 4, converged: true, finalError: 0.039 },
  { ability: 0.5, mode: 'Linear', steps: 34, converged: true, finalError: 0.038 },
  { ability: 0.5, mode: 'Linear', steps: 28, converged: true, finalError: 0.044 },
  // Ability 0.6
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.012 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 24, converged: true, finalError: 0.049 },
  { ability: 0.6, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.022 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Adaptive', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 5, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  { ability: 0.6, mode: 'Linear', steps: 1, converged: true, finalError: 0.033 },
  // Ability 0.7
  { ability: 0.7, mode: 'Adaptive', steps: 6, converged: true, finalError: 0.022 },
  { ability: 0.7, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.022 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Adaptive', steps: 6, converged: true, finalError: 0.022 },
  { ability: 0.7, mode: 'Adaptive', steps: 6, converged: true, finalError: 0.022 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Adaptive', steps: 2, converged: true, finalError: 0.033 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 10, converged: true, finalError: 0.002 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 10, converged: true, finalError: 0.002 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  { ability: 0.7, mode: 'Linear', steps: 2, converged: true, finalError: 0.048 },
  // Ability 0.8
  { ability: 0.8, mode: 'Adaptive', steps: 10, converged: true, finalError: 0.028 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 7, converged: true, finalError: 0.020 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Adaptive', steps: 3, converged: true, finalError: 0.002 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  { ability: 0.8, mode: 'Linear', steps: 50, converged: false, finalError: 0.125 },
  { ability: 0.8, mode: 'Linear', steps: 13, converged: true, finalError: 0.029 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  { ability: 0.8, mode: 'Linear', steps: 28, converged: true, finalError: 0.030 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  { ability: 0.8, mode: 'Linear', steps: 10, converged: true, finalError: 0.026 },
  { ability: 0.8, mode: 'Linear', steps: 9, converged: true, finalError: 0.018 },
  // Ability 0.9
  { ability: 0.9, mode: 'Adaptive', steps: 12, converged: true, finalError: 0.033 },
  { ability: 0.9, mode: 'Adaptive', steps: 12, converged: true, finalError: 0.047 },
  { ability: 0.9, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.029 },
  { ability: 0.9, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.029 },
  { ability: 0.9, mode: 'Adaptive', steps: 18, converged: true, finalError: 0.041 },
  { ability: 0.9, mode: 'Adaptive', steps: 9, converged: true, finalError: 0.028 },
  { ability: 0.9, mode: 'Adaptive', steps: 10, converged: true, finalError: 0.037 },
  { ability: 0.9, mode: 'Adaptive', steps: 5, converged: true, finalError: 0.029 },
  { ability: 0.9, mode: 'Adaptive', steps: 14, converged: true, finalError: 0.034 },
  { ability: 0.9, mode: 'Adaptive', steps: 35, converged: true, finalError: 0.037 },
  { ability: 0.9, mode: 'Linear', steps: 23, converged: true, finalError: 0.047 },
  { ability: 0.9, mode: 'Linear', steps: 20, converged: true, finalError: 0.049 },
  { ability: 0.9, mode: 'Linear', steps: 50, converged: false, finalError: 0.159 },
  { ability: 0.9, mode: 'Linear', steps: 20, converged: true, finalError: 0.049 },
  { ability: 0.9, mode: 'Linear', steps: 50, converged: false, finalError: 0.052 },
  { ability: 0.9, mode: 'Linear', steps: 20, converged: true, finalError: 0.049 },
  { ability: 0.9, mode: 'Linear', steps: 26, converged: true, finalError: 0.048 },
  { ability: 0.9, mode: 'Linear', steps: 21, converged: true, finalError: 0.049 },
  { ability: 0.9, mode: 'Linear', steps: 50, converged: false, finalError: 0.095 },
  { ability: 0.9, mode: 'Linear', steps: 20, converged: true, finalError: 0.049 },
];

// ============================================================
// Algorithm Explanation Data
// ============================================================
export const ALGORITHM_STEPS = [
  {
    title: 'Belief State Initialization',
    description: 'The system starts with a uniform prior belief distribution over the learner\'s ability level (0 to 1). Initial entropy is at maximum (~3.0 nats), representing complete uncertainty.',
    formula: 'P(θ) = Uniform(0, 1)',
    icon: 'brain',
  },
  {
    title: 'Expected Information Gain (EIG)',
    description: 'For each candidate question, the system calculates the Expected Information Gain — how much each question would reduce uncertainty about the learner\'s ability. This is the core of Active Inference.',
    formula: 'EIG(q) = H[P(θ)] - E[H[P(θ|response)]]',
    icon: 'target',
  },
  {
    title: 'Optimal Question Selection',
    description: 'The question with the highest EIG is selected. This ensures each question provides maximum information, unlike fixed-sequence approaches that may ask uninformative questions.',
    formula: 'q* = argmax_q EIG(q)',
    icon: 'zap',
  },
  {
    title: '4PL IRT Response Model',
    description: 'The probability of a correct response is modeled using the 4-Parameter Logistic IRT model, accounting for discrimination (a), difficulty (b), guessing (c), and carelessness (d).',
    formula: 'P(correct|θ) = c + (d-c) / (1 + e^(-a(θ-b)))',
    icon: 'activity',
  },
  {
    title: 'Bayesian Belief Update',
    description: 'After observing the learner\'s response, the belief distribution is updated using Bayes\' theorem. This narrows the distribution around the true ability value.',
    formula: 'P(θ|response) ∝ P(response|θ) · P(θ)',
    icon: 'refresh-cw',
  },
  {
    title: 'Convergence Check',
    description: 'The process repeats until the estimated ability converges (error < 0.05) or the maximum number of questions is reached. Adaptive mode converges 54.4% faster on average.',
    formula: '|θ_estimated - θ_true| < ε',
    icon: 'check-circle',
  },
];
