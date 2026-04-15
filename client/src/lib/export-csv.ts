// CSV Export Utility for thesis data analysis
import { getUserProfile } from './store';

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function arrayToCSV(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

// Export learning history
export function exportLearningHistory(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return;

  const headers = ['Step', 'Question ID', 'Concept', 'Difficulty', 'Correct', 'Time Spent (s)', 'Mode', 'Ability After', 'Entropy After', 'Timestamp'];
  const rows = profile.sessionHistory.map((h, i) => [
    i + 1,
    h.questionId,
    h.concept,
    h.difficulty.toFixed(2),
    h.correct ? 'Yes' : 'No',
    h.timeSpent,
    h.mode || 'adaptive',
    h.abilityAfter !== undefined ? h.abilityAfter.toFixed(4) : '',
    h.entropyAfter !== undefined ? h.entropyAfter.toFixed(4) : '',
    h.timestamp
  ]);

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`learning_history_${username}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// Export ability trajectory
export function exportAbilityTrajectory(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return;

  const headers = ['Step', 'Estimated Ability', 'Entropy', 'Cumulative Accuracy', 'Mode', 'Concept', 'Difficulty'];
  const rows: (string | number)[][] = [];
  let correct = 0;

  profile.sessionHistory.forEach((h, i) => {
    if (h.correct) correct++;
    rows.push([
      i + 1,
      h.abilityAfter !== undefined ? h.abilityAfter.toFixed(4) : '',
      h.entropyAfter !== undefined ? h.entropyAfter.toFixed(4) : '',
      ((correct / (i + 1)) * 100).toFixed(1) + '%',
      h.mode || 'adaptive',
      h.concept,
      h.difficulty.toFixed(2)
    ]);
  });

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`ability_trajectory_${username}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// Export wrong questions
export function exportWrongQuestions(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return;

  const headers = ['Question ID', 'Question', 'Concept', 'Difficulty', 'User Answer', 'Correct Answer', 'Wrong Count', 'Mastered', 'Last Wrong Time'];
  const rows = profile.wrongQuestions.map(wq => [
    wq.questionId,
    wq.question,
    wq.concept,
    wq.difficulty.toFixed(2),
    wq.userAnswer,
    wq.correctAnswer,
    wq.wrongCount,
    wq.mastered ? 'Yes' : 'No',
    wq.lastWrongTime
  ]);

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`wrong_questions_${username}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// Export concept mastery
export function exportConceptMastery(username: string) {
  const profile = getUserProfile(username);
  if (!profile) return;

  const headers = ['Concept', 'Questions Attempted', 'Correct Answers', 'Accuracy %'];
  const rows: (string | number)[][] = [];

  Object.entries(profile.stats.conceptStats).forEach(([concept, s]) => {
    const accuracy = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0.0';
    rows.push([concept, s.total, s.correct, accuracy]);
  });

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`concept_mastery_${username}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// Export simulation comparison data
export function exportSimulationData() {
  const headers = [
    'Strategy', 'True Ability', 'Final Estimate', 'Estimation Error',
    'Convergence Steps', 'Final Entropy', 'Total Questions', 'Accuracy'
  ];

  try {
    const simKey = 'simulation_results_cache';
    const cached = localStorage.getItem(simKey);
    if (cached) {
      const data = JSON.parse(cached);
      const rows = data.map((d: any) => [
        d.strategy, d.trueAbility, d.finalEstimate, d.error,
        d.convergenceSteps, d.finalEntropy, d.totalQuestions, d.accuracy
      ]);
      const csv = arrayToCSV(headers, rows);
      downloadCSV(`simulation_comparison_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  } catch (e) {
    console.error('Failed to export simulation data:', e);
  }
}

// Export all data
export function exportAllData(username: string) {
  exportLearningHistory(username);
  setTimeout(() => exportAbilityTrajectory(username), 500);
  setTimeout(() => exportWrongQuestions(username), 1000);
  setTimeout(() => exportConceptMastery(username), 1500);
}
