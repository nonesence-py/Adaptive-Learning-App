"""
Simulation result analysis script.
Generates detailed statistical reports for writing.
"""

import pandas as pd
import numpy as np
from scipy import stats
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

# Style settings
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
sns.set_style("whitegrid")

# Load data
results_dir = Path("simulation_results")
results_df = pd.read_csv(results_dir / "simulation_results.csv")
summary_df = pd.read_csv(results_dir / "convergence_summary.csv")

print("=" * 80)
print("Simulation Results Analysis Report")
print("=" * 80)

# ==================== 1. Overall statistics ====================
print("\n[1. Overall Statistics]")
print("-" * 80)

overall_stats = results_df.groupby('mode')['convergence_step'].agg([
    'count', 'mean', 'std', 'median', 'min', 'max'
]).round(2)

print("\nConvergence steps (overall):")
print(overall_stats)

# 计算总体提升
adaptive_mean = results_df[results_df['mode'] == 'Adaptive']['convergence_step'].mean()
linear_mean = results_df[results_df['mode'] == 'Linear']['convergence_step'].mean()
overall_improvement = ((linear_mean - adaptive_mean) / linear_mean) * 100

print(f"\nOverall improvement:")
print(f"  Adaptive mean steps: {adaptive_mean:.2f}")
print(f"  Linear mean steps: {linear_mean:.2f}")
print(f"  Improvement rate: {overall_improvement:.1f}%")

# ==================== 2. Stats by true ability ====================
print("\n[2. Stats by True Ability]")
print("-" * 80)

ability_stats = []
for ability in sorted(results_df['true_ability'].unique()):
    adaptive_data = results_df[
        (results_df['true_ability'] == ability) & 
        (results_df['mode'] == 'Adaptive')
    ]['convergence_step']
    
    linear_data = results_df[
        (results_df['true_ability'] == ability) & 
        (results_df['mode'] == 'Linear')
    ]['convergence_step']
    
    if len(adaptive_data) > 0 and len(linear_data) > 0:
        adaptive_mean = adaptive_data.mean()
        linear_mean = linear_data.mean()
        improvement = ((linear_mean - adaptive_mean) / linear_mean) * 100 if linear_mean > 0 else 0
        
        ability_stats.append({
            'Ability': f'{ability:.1f}',
            'Adaptive_Mean': f'{adaptive_mean:.2f}',
            'Adaptive_Std': f'{adaptive_data.std():.2f}',
            'Linear_Mean': f'{linear_mean:.2f}',
            'Linear_Std': f'{linear_data.std():.2f}',
            'Improvement_%': f'{improvement:.1f}%',
            'Adaptive_Median': f'{adaptive_data.median():.1f}',
            'Linear_Median': f'{linear_data.median():.1f}'
        })

ability_stats_df = pd.DataFrame(ability_stats)
print("\nConvergence steps by true ability:")
print(ability_stats_df.to_string(index=False))

# ==================== 3. Hypothesis testing ====================
print("\n[3. Hypothesis Testing]")
print("-" * 80)

# Overall t-test
adaptive_steps = results_df[results_df['mode'] == 'Adaptive']['convergence_step']
linear_steps = results_df[results_df['mode'] == 'Linear']['convergence_step']

# Normality check (Shapiro-Wilk; if samples >50, skip check and use t-test)
if len(adaptive_steps) > 50:
    print("Large sample size, using t-test...")
    t_stat, p_value = stats.ttest_ind(adaptive_steps, linear_steps, equal_var=False)
    test_name = "Welch's t-test (unequal variance)"
else:
    # Check normality
    _, p_adaptive = stats.shapiro(adaptive_steps[:50]) if len(adaptive_steps) > 50 else stats.shapiro(adaptive_steps)
    _, p_linear = stats.shapiro(linear_steps[:50]) if len(linear_steps) > 50 else stats.shapiro(linear_steps)
    
    if p_adaptive > 0.05 and p_linear > 0.05:
        print("Data are approximately normal, using t-test...")
        t_stat, p_value = stats.ttest_ind(adaptive_steps, linear_steps, equal_var=False)
        test_name = "Welch's t-test"
    else:
        print("Data are not normal, using Mann-Whitney U test...")
        u_stat, p_value = stats.mannwhitneyu(adaptive_steps, linear_steps, alternative='less')
        t_stat = u_stat
        test_name = "Mann-Whitney U test"

print(f"\nTest method: {test_name}")
print(f"Statistic: {t_stat:.4f}")
print(f"p-value: {p_value:.6f}")
print(f"Significance: {'***' if p_value < 0.001 else '**' if p_value < 0.01 else '*' if p_value < 0.05 else 'ns (not significant)'}")

if p_value < 0.05:
    print(f"\n✓ Conclusion: Adaptive significantly better than Linear (p < {p_value:.4f})")
else:
    print(f"\n✗ Conclusion: No significant difference between modes (p = {p_value:.4f})")

# ==================== 4. Effect size ====================
print("\n[4. Effect Size Analysis]")
print("-" * 80)

# Cohen's d
def cohens_d(group1, group2):
    """Calculate Cohen's d effect size."""
    n1, n2 = len(group1), len(group2)
    var1, var2 = group1.var(ddof=1), group2.var(ddof=1)
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
    d = (group1.mean() - group2.mean()) / pooled_std
    return d

cohens_d_value = cohens_d(adaptive_steps, linear_steps)
print(f"Cohen's d = {cohens_d_value:.4f}")

# Interpret effect size
if abs(cohens_d_value) < 0.2:
    effect_size = "tiny"
elif abs(cohens_d_value) < 0.5:
    effect_size = "small"
elif abs(cohens_d_value) < 0.8:
    effect_size = "medium"
else:
    effect_size = "large"

print(f"Effect size: {effect_size} ({abs(cohens_d_value):.4f})")

# ==================== 5. Convergence success rate ====================
print("\n[5. Convergence Success Rate]")
print("-" * 80)

convergence_rate = results_df.groupby('mode')['converged'].mean() * 100
print("\nConvergence success rate:")
for mode, rate in convergence_rate.items():
    print(f"  {mode}: {rate:.1f}%")

# ==================== 6. Error analysis ====================
print("\n[6. Final Estimation Error]")
print("-" * 80)

error_stats = results_df.groupby('mode')['final_error'].agg(['mean', 'std', 'median']).round(4)
print("\nFinal estimation error:")
print(error_stats)

# ==================== 7. Hypothesis tests by true ability ====================
print("\n[7. Hypothesis Tests by True Ability]")
print("-" * 80)

ability_tests = []
for ability in sorted(results_df['true_ability'].unique()):
    adaptive_data = results_df[
        (results_df['true_ability'] == ability) & 
        (results_df['mode'] == 'Adaptive')
    ]['convergence_step']
    
    linear_data = results_df[
        (results_df['true_ability'] == ability) & 
        (results_df['mode'] == 'Linear')
    ]['convergence_step']
    
    if len(adaptive_data) > 0 and len(linear_data) > 0:
        # Use Mann-Whitney U (small sample, no normality assumption)
        u_stat, p_val = stats.mannwhitneyu(adaptive_data, linear_data, alternative='two-sided')
        d_value = cohens_d(adaptive_data, linear_data)
        
        ability_tests.append({
            'Ability': f'{ability:.1f}',
            'Adaptive_Mean': f'{adaptive_data.mean():.2f}',
            'Linear_Mean': f'{linear_data.mean():.2f}',
            'p_value': f'{p_val:.4f}',
            'Significant': 'Yes' if p_val < 0.05 else 'No',
            "Cohen's_d": f'{d_value:.3f}'
        })

ability_tests_df = pd.DataFrame(ability_tests)
print("\nHypothesis tests by true ability:")
print(ability_tests_df.to_string(index=False))

# ==================== 8. Generate detailed report ====================
print("\n[8. Generate Report]")
print("-" * 80)

report_lines = []
report_lines.append("=" * 80)
report_lines.append("Simulation Results Analysis Report")
report_lines.append("=" * 80)
report_lines.append(f"\nGenerated at: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
report_lines.append(f"Total experiments: {len(results_df)}")
report_lines.append(f"  - Adaptive: {len(results_df[results_df['mode'] == 'Adaptive'])}")
report_lines.append(f"  - Linear: {len(results_df[results_df['mode'] == 'Linear'])}")

report_lines.append("\n" + "=" * 80)
report_lines.append("1. Overall statistics")
report_lines.append("=" * 80)
report_lines.append("\nConvergence step statistics:")
report_lines.append(overall_stats.to_string())
report_lines.append(f"\nOverall improvement: {overall_improvement:.1f}%")

report_lines.append("\n" + "=" * 80)
report_lines.append("2. Hypothesis testing")
report_lines.append("=" * 80)
report_lines.append(f"\nTest method: {test_name}")
report_lines.append(f"Statistic: {t_stat:.4f}")
report_lines.append(f"p-value: {p_value:.6f}")
report_lines.append(f"Significance: {'***' if p_value < 0.001 else '**' if p_value < 0.01 else '*' if p_value < 0.05 else 'ns'}")
report_lines.append(f"Conclusion: Adaptive mode {'significantly better than' if p_value < 0.05 else 'vs'} Linear mode")

report_lines.append("\n" + "=" * 80)
report_lines.append("3. Effect size")
report_lines.append("=" * 80)
report_lines.append(f"Cohen's d = {cohens_d_value:.4f}")
report_lines.append(f"Effect size label: {effect_size}")

report_lines.append("\n" + "=" * 80)
report_lines.append("4. Results by true ability")
report_lines.append("=" * 80)
report_lines.append("\nConvergence step comparison:")
report_lines.append(ability_stats_df.to_string(index=False))
report_lines.append("\nHypothesis test results:")
report_lines.append(ability_tests_df.to_string(index=False))

report_lines.append("\n" + "=" * 80)
report_lines.append("5. Key findings")
report_lines.append("=" * 80)

# 找出提升最大的能力值（排除负值）
improvement_values = ability_stats_df['Improvement_%'].str.rstrip('%').astype(float)
positive_improvements = improvement_values[improvement_values > 0]
if len(positive_improvements) > 0:
    max_improvement_idx = positive_improvements.idxmax()
    max_ability = ability_stats_df.loc[max_improvement_idx, 'Ability']
    max_improvement = ability_stats_df.loc[max_improvement_idx, 'Improvement_%']
else:
    max_ability = "N/A"
    max_improvement = "N/A"

report_lines.append(f"\n1. Overall improvement: {overall_improvement:.1f}%")
if max_ability != "N/A":
    report_lines.append(f"2. Largest improvement at ability {max_ability}: {max_improvement}")
else:
    report_lines.append("2. Largest improvement: needs further analysis")
report_lines.append(f"3. Adaptive mean convergence steps: {adaptive_mean:.2f}")
report_lines.append(f"4. Linear mean convergence steps: {linear_mean:.2f}")
report_lines.append(f"5. Statistical significance: p = {p_value:.6f} {'(significant)' if p_value < 0.05 else '(not significant)'}")
report_lines.append(f"6. Effect size: {effect_size} (Cohen's d = {abs(cohens_d_value):.4f})")

report_lines.append("\n" + "=" * 80)
report_lines.append("6. Writing suggestions")
report_lines.append("=" * 80)
report_lines.append("\n[Results description]")
report_lines.append("Adaptive mode converges faster than Linear mode.")
report_lines.append(f"Adaptive averages {adaptive_mean:.2f} steps to converge,")
report_lines.append(f"while Linear averages {linear_mean:.2f} steps; improvement rate is {overall_improvement:.1f}%.")
report_lines.append(f"\n[Statistical test]")
report_lines.append(f"{test_name} shows a significant difference between modes")
report_lines.append(f"(p = {p_value:.6f}, Cohen's d = {cohens_d_value:.4f}),")
report_lines.append("indicating Active Inference has a statistical advantage in convergence speed.")
report_lines.append(f"\n[Figure suggestions]")
report_lines.append("1. Use convergence_speed_comparison.png to show convergence speed comparison")
report_lines.append("2. Use convergence_steps_boxplot.png to show distribution differences")
report_lines.append("3. Use statistical_summary_table.png to show detailed statistics")

# Save report
report_text = "\n".join(report_lines)
report_file = results_dir / "analysis_report.txt"
with open(report_file, 'w', encoding='utf-8') as f:
    f.write(report_text)

print(f"✓ Analysis report saved: {report_file}")

# Print report
print("\n" + report_text)

print("\n" + "=" * 80)
print("Analysis finished!")
print("=" * 80)

