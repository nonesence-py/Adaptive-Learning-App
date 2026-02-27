"""
模拟仿真脚本 - 用于生成论文核心数据
对比 Adaptive (AI) 和 Linear (Control Group) 两种模式的收敛速度
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import os
from datetime import datetime
from algo import ActiveInferenceLearner
import warnings
warnings.filterwarnings('ignore')

# 设置中文字体和样式
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
sns.set_style("whitegrid")
sns.set_palette("husl")

# ==================== 配置参数 ====================
CONFIG = {
    "ability_values": [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    "students_per_ability": 10,  # 每个能力值的学生数
    "modes": ["Adaptive", "Linear"],
    "convergence_threshold": 0.05,  # 收敛阈值
    "max_questions": 50,  # 最大题目数
    "random_seed": 42,  # 随机种子（保证可重复性）
    "output_dir": "simulation_results",
    "stability_window": 3,  # 稳定收敛检查窗口（连续N步）
    "use_stability_check": False  # 是否使用稳定收敛检查
}

# ==================== VirtualStudent 类 ====================
class VirtualStudent:
    """虚拟学生类，用于模拟学习过程"""
    
    def __init__(self, student_id, true_ability, mode, random_seed=None):
        """
        初始化虚拟学生
        
        Args:
            student_id: 学生ID（如 "Robot_0.3_001_Adaptive"）
            true_ability: 真实能力值（0.0-1.0）
            mode: 学习模式（"Adaptive" 或 "Linear"）
            random_seed: 随机种子（用于可重复性）
        """
        self.student_id = student_id
        self.true_ability = true_ability
        self.mode = mode
        self.learner = ActiveInferenceLearner()
        self.history = []  # 已做题目ID列表
        self.estimated_abilities = []  # 每道题后的估计能力值
        self.entropy_trajectory = []  # 每步的熵值
        self.question_sequence = []  # 题目ID序列
        self.convergence_step = None  # 收敛步数
        self.final_estimated = None  # 最终估计值
        self.final_error = None  # 最终误差
        self.converged = False  # 是否收敛
        
        # 设置随机种子
        if random_seed is not None:
            np.random.seed(random_seed)
    
    def simulate_answer(self, question_difficulty):
        """
        根据真实能力值模拟答题
        
        Args:
            question_difficulty: 题目难度
            
        Returns:
            is_correct: 1表示答对，0表示答错
        """
        # 使用与系统相同的IRT模型计算答对概率
        prob = self.learner.predict_success_prob(question_difficulty, self.true_ability)
        # 使用随机数决定是否答对
        is_correct = 1 if np.random.random() < prob else 0
        return is_correct
    
    def select_next_question(self, question_df):
        """
        根据模式选择下一题
        
        Args:
            question_df: 题目DataFrame
            
        Returns:
            next_question: 下一题的Series，如果无题则返回None
        """
        available_questions = question_df[~question_df['id'].isin(self.history)].copy()
        
        if available_questions.empty:
            return None
        
        if self.mode == "Adaptive":
            # Adaptive模式：使用EIG策略
            next_q = self.learner.select_next_question(question_df, self.history)
            return next_q
        else:
            # Linear模式：按ID顺序
            next_q = available_questions.sort_values('id', ascending=True).iloc[0]
            return next_q
    
    def is_converged(self, threshold=None, stability_window=None, use_stability=False):
        """
        判断是否收敛
        
        Args:
            threshold: 收敛阈值（默认使用CONFIG中的值）
            stability_window: 稳定窗口大小
            use_stability: 是否使用稳定收敛检查
            
        Returns:
            bool: 是否收敛
        """
        if len(self.estimated_abilities) == 0:
            return False
        
        threshold = threshold or CONFIG["convergence_threshold"]
        current_estimated = self.estimated_abilities[-1]
        error = abs(current_estimated - self.true_ability)
        
        if not use_stability:
            # 简单收敛：当前估计值在阈值内
            return error < threshold
        else:
            # 稳定收敛：连续N步都在阈值内
            stability_window = stability_window or CONFIG["stability_window"]
            if len(self.estimated_abilities) < stability_window:
                return False
            
            recent_estimates = self.estimated_abilities[-stability_window:]
            all_within_threshold = all(
                abs(est - self.true_ability) < threshold 
                for est in recent_estimates
            )
            return all_within_threshold
    
    def simulate_learning(self, question_df, max_questions=None, convergence_threshold=None, 
                        use_stability_check=None):
        """
        模拟学习过程，直到收敛或达到最大题目数
        
        Args:
            question_df: 题目DataFrame
            max_questions: 最大题目数
            convergence_threshold: 收敛阈值
            use_stability_check: 是否使用稳定收敛检查
        """
        max_questions = max_questions or CONFIG["max_questions"]
        convergence_threshold = convergence_threshold or CONFIG["convergence_threshold"]
        use_stability_check = use_stability_check if use_stability_check is not None else CONFIG["use_stability_check"]
        
        # 初始化：记录初始估计值
        initial_ability = self.learner.get_estimated_ability()
        self.estimated_abilities.append(initial_ability)
        self.entropy_trajectory.append(self.learner.get_current_entropy())
        
        # 开始答题循环
        for step in range(1, max_questions + 1):
            # 选择下一题
            next_question = self.select_next_question(question_df)
            
            if next_question is None:
                # 没有更多题目了
                break
            
            question_id = next_question['id']
            question_difficulty = next_question['difficulty']
            
            # 模拟答题
            is_correct = self.simulate_answer(question_difficulty)
            
            # 更新学习器
            self.learner.update_belief(question_difficulty, is_correct)
            
            # 记录
            self.history.append(question_id)
            self.question_sequence.append(question_id)
            estimated_ability = self.learner.get_estimated_ability()
            self.estimated_abilities.append(estimated_ability)
            self.entropy_trajectory.append(self.learner.get_current_entropy())
            
            # 检查是否收敛
            if self.is_converged(threshold=convergence_threshold, use_stability=use_stability_check):
                self.converged = True
                self.convergence_step = step
                self.final_estimated = estimated_ability
                self.final_error = abs(estimated_ability - self.true_ability)
                break
        
        # 如果未收敛，记录最终状态
        if not self.converged:
            self.convergence_step = len(self.history)
            self.final_estimated = self.estimated_abilities[-1]
            self.final_error = abs(self.final_estimated - self.true_ability)
    
    def get_results_dict(self):
        """获取结果字典，用于保存到CSV"""
        return {
            "student_id": self.student_id,
            "true_ability": self.true_ability,
            "mode": self.mode,
            "convergence_step": self.convergence_step,
            "final_estimated": self.final_estimated,
            "final_error": self.final_error,
            "total_questions": len(self.history),
            "converged": self.converged
        }
    
    def get_trajectory_dict(self):
        """获取轨迹数据，用于画图"""
        trajectory_data = []
        for step, (est_ability, entropy, q_id) in enumerate(
            zip(self.estimated_abilities, self.entropy_trajectory, [None] + self.question_sequence)
        ):
            trajectory_data.append({
                "student_id": self.student_id,
                "step": step,
                "estimated_ability": est_ability,
                "entropy": entropy,
                "question_id": q_id,
                "true_ability": self.true_ability,
                "mode": self.mode
            })
        return trajectory_data

# ==================== SimulationRunner 类 ====================
class SimulationRunner:
    """模拟运行器，负责批量运行实验和生成结果"""
    
    def __init__(self, question_df, config=None):
        """
        初始化运行器
        
        Args:
            question_df: 题目DataFrame
            config: 配置字典（可选）
        """
        self.question_df = question_df
        self.config = config or CONFIG
        self.results = []  # 存储所有实验结果
        self.trajectories = []  # 存储轨迹数据
        
        # 创建输出目录
        self.output_dir = Path(self.config["output_dir"])
        self.output_dir.mkdir(exist_ok=True)
    
    def run_single_experiment(self, true_ability, mode, student_index, random_seed=None):
        """
        运行单次实验
        
        Args:
            true_ability: 真实能力值
            mode: 学习模式
            student_index: 学生索引（用于生成ID）
            random_seed: 随机种子
            
        Returns:
            VirtualStudent: 完成实验的虚拟学生对象
        """
        # 生成学生ID
        student_id = f"Robot_{true_ability:.1f}_{student_index:03d}_{mode}"
        
        # 创建虚拟学生
        student = VirtualStudent(
            student_id=student_id,
            true_ability=true_ability,
            mode=mode,
            random_seed=random_seed
        )
        
        # 运行模拟
        student.simulate_learning(
            self.question_df,
            max_questions=self.config["max_questions"],
            convergence_threshold=self.config["convergence_threshold"],
            use_stability_check=self.config["use_stability_check"]
        )
        
        return student
    
    def run_batch_experiments(self, show_progress=True):
        """
        批量运行实验
        
        Args:
            show_progress: 是否显示进度
        """
        print("=" * 60)
        print("开始批量模拟实验")
        print(f"能力值: {self.config['ability_values']}")
        print(f"每个能力值学生数: {self.config['students_per_ability']}")
        print(f"模式: {self.config['modes']}")
        print(f"收敛阈值: {self.config['convergence_threshold']}")
        print("=" * 60)
        
        total_experiments = len(self.config["ability_values"]) * \
                           self.config["students_per_ability"] * \
                           len(self.config["modes"])
        
        experiment_count = 0
        
        # 遍历所有能力值
        for true_ability in self.config["ability_values"]:
            # 遍历每个能力值的所有学生
            for student_idx in range(self.config["students_per_ability"]):
                # 遍历所有模式
                for mode in self.config["modes"]:
                    # 设置随机种子（确保可重复性）
                    random_seed = self.config["random_seed"] + experiment_count
                    
                    # 运行实验
                    student = self.run_single_experiment(
                        true_ability=true_ability,
                        mode=mode,
                        student_index=student_idx,
                        random_seed=random_seed
                    )
                    
                    # 保存结果
                    self.results.append(student.get_results_dict())
                    self.trajectories.extend(student.get_trajectory_dict())
                    
                    experiment_count += 1
                    
                    # 显示进度
                    if show_progress:
                        if experiment_count % 10 == 0 or experiment_count == total_experiments:
                            progress = (experiment_count / total_experiments) * 100
                            print(f"进度: {experiment_count}/{total_experiments} ({progress:.1f}%)")
        
        print("\n实验完成！")
        print(f"总实验数: {experiment_count}")
        print(f"收敛实验数: {sum(1 for r in self.results if r['converged'])}")
    
    def save_results(self):
        """保存结果到CSV文件"""
        print("\n保存结果到CSV...")
        
        # 保存详细结果
        results_df = pd.DataFrame(self.results)
        results_file = self.output_dir / "simulation_results.csv"
        results_df.to_csv(results_file, index=False, encoding='utf-8-sig')
        print(f"✓ 详细结果已保存: {results_file}")
        
        # 保存轨迹数据
        trajectories_df = pd.DataFrame(self.trajectories)
        trajectories_file = self.output_dir / "ability_trajectories.csv"
        trajectories_df.to_csv(trajectories_file, index=False, encoding='utf-8-sig')
        print(f"✓ 轨迹数据已保存: {trajectories_file}")
        
        # 生成汇总统计
        self._generate_summary()
    
    def _generate_summary(self):
        """生成汇总统计"""
        results_df = pd.DataFrame(self.results)
        
        summary_data = []
        for ability in self.config["ability_values"]:
            for mode in self.config["modes"]:
                subset = results_df[
                    (results_df['true_ability'] == ability) & 
                    (results_df['mode'] == mode)
                ]
                
                if len(subset) > 0:
                    summary_data.append({
                        "ability": ability,
                        "mode": mode,
                        "mean_steps": subset['convergence_step'].mean(),
                        "std_steps": subset['convergence_step'].std(),
                        "median_steps": subset['convergence_step'].median(),
                        "convergence_rate": subset['converged'].mean(),
                        "mean_error": subset['final_error'].mean(),
                        "std_error": subset['final_error'].std(),
                        "sample_size": len(subset)
                    })
        
        summary_df = pd.DataFrame(summary_data)
        summary_file = self.output_dir / "convergence_summary.csv"
        summary_df.to_csv(summary_file, index=False, encoding='utf-8-sig')
        print(f"✓ 汇总统计已保存: {summary_file}")
        
        return summary_df
    
    def generate_visualizations(self):
        """生成可视化图表"""
        print("\n生成可视化图表...")
        
        results_df = pd.DataFrame(self.results)
        trajectories_df = pd.DataFrame(self.trajectories)
        
        # 1. 收敛速度对比图（核心图表）
        self._plot_convergence_speed(trajectories_df)
        
        # 2. 收敛步数箱线图
        self._plot_convergence_steps_boxplot(results_df)
        
        # 3. 收敛成功率对比
        self._plot_convergence_rate(results_df)
        
        # 4. 熵值变化对比
        self._plot_entropy_comparison(trajectories_df)
        
        # 5. 统计摘要表
        self._generate_statistical_table(results_df)
        
        print("✓ 所有图表已生成")
    
    def _plot_convergence_speed(self, trajectories_df):
        """绘制收敛速度对比图（核心图表）"""
        # 选择几个代表性的能力值进行展示
        sample_abilities = [0.3, 0.5, 0.7]
        
        fig, axes = plt.subplots(1, len(sample_abilities), figsize=(15, 5))
        if len(sample_abilities) == 1:
            axes = [axes]
        
        for idx, ability in enumerate(sample_abilities):
            ax = axes[idx]
            
            # 获取该能力值的数据
            subset = trajectories_df[trajectories_df['true_ability'] == ability]
            
            # 按模式分组
            for mode in self.config["modes"]:
                mode_data = subset[subset['mode'] == mode]
                
                # 计算每个步数的平均估计值
                steps = mode_data['step'].unique()
                mean_estimates = []
                std_estimates = []
                
                for step in steps:
                    step_data = mode_data[mode_data['step'] == step]['estimated_ability']
                    mean_estimates.append(step_data.mean())
                    std_estimates.append(step_data.std())
                
                # 绘制曲线
                color = '#667eea' if mode == 'Adaptive' else '#ed8936'
                label = 'Adaptive (AI)' if mode == 'Adaptive' else 'Linear (Control)'
                ax.plot(steps, mean_estimates, color=color, label=label, linewidth=2, marker='o', markersize=4)
                ax.fill_between(steps, 
                               np.array(mean_estimates) - np.array(std_estimates),
                               np.array(mean_estimates) + np.array(std_estimates),
                               alpha=0.2, color=color)
            
            # 绘制真实能力值线
            ax.axhline(y=ability, color='red', linestyle='--', linewidth=2, label='True Ability')
            
            ax.set_xlabel('Question Number', fontsize=12)
            ax.set_ylabel('Estimated Ability', fontsize=12)
            ax.set_title(f'True Ability = {ability}', fontsize=14, fontweight='bold')
            ax.legend(fontsize=10)
            ax.grid(True, alpha=0.3)
            ax.set_ylim([0, 1])
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'convergence_speed_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("  ✓ 收敛速度对比图已保存")
    
    def _plot_convergence_steps_boxplot(self, results_df):
        """绘制收敛步数箱线图"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # 准备数据
        data_for_plot = []
        for ability in self.config["ability_values"]:
            for mode in self.config["modes"]:
                subset = results_df[
                    (results_df['true_ability'] == ability) & 
                    (results_df['mode'] == mode)
                ]
                for steps in subset['convergence_step']:
                    data_for_plot.append({
                        'Ability': f'{ability:.1f}',
                        'Mode': 'Adaptive (AI)' if mode == 'Adaptive' else 'Linear (Control)',
                        'Convergence Steps': steps
                    })
        
        plot_df = pd.DataFrame(data_for_plot)
        
        # 绘制箱线图
        sns.boxplot(data=plot_df, x='Ability', y='Convergence Steps', hue='Mode', ax=ax)
        ax.set_xlabel('True Ability', fontsize=12)
        ax.set_ylabel('Convergence Steps', fontsize=12)
        ax.set_title('Convergence Steps Comparison by Ability Level', fontsize=14, fontweight='bold')
        ax.legend(title='Mode', fontsize=10)
        ax.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'convergence_steps_boxplot.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("  ✓ 收敛步数箱线图已保存")
    
    def _plot_convergence_rate(self, results_df):
        """绘制收敛成功率对比"""
        # 计算每个能力值和模式的收敛率
        convergence_rates = []
        for ability in self.config["ability_values"]:
            for mode in self.config["modes"]:
                subset = results_df[
                    (results_df['true_ability'] == ability) & 
                    (results_df['mode'] == mode)
                ]
                rate = subset['converged'].mean() * 100
                convergence_rates.append({
                    'Ability': f'{ability:.1f}',
                    'Mode': 'Adaptive (AI)' if mode == 'Adaptive' else 'Linear (Control)',
                    'Convergence Rate (%)': rate
                })
        
        plot_df = pd.DataFrame(convergence_rates)
        
        fig, ax = plt.subplots(figsize=(10, 6))
        sns.barplot(data=plot_df, x='Ability', y='Convergence Rate (%)', hue='Mode', ax=ax)
        ax.set_xlabel('True Ability', fontsize=12)
        ax.set_ylabel('Convergence Rate (%)', fontsize=12)
        ax.set_title('Convergence Rate Comparison', fontsize=14, fontweight='bold')
        ax.legend(title='Mode', fontsize=10)
        ax.set_ylim([0, 105])
        ax.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'convergence_rate_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("  ✓ 收敛成功率对比图已保存")
    
    def _plot_entropy_comparison(self, trajectories_df):
        """绘制熵值变化对比"""
        # 选择几个代表性的能力值
        sample_abilities = [0.3, 0.5, 0.7]
        
        fig, axes = plt.subplots(1, len(sample_abilities), figsize=(15, 5))
        if len(sample_abilities) == 1:
            axes = [axes]
        
        for idx, ability in enumerate(sample_abilities):
            ax = axes[idx]
            
            subset = trajectories_df[trajectories_df['true_ability'] == ability]
            
            for mode in self.config["modes"]:
                mode_data = subset[subset['mode'] == mode]
                
                # 计算每个步数的平均熵值
                steps = mode_data['step'].unique()
                mean_entropy = []
                
                for step in steps:
                    step_data = mode_data[mode_data['step'] == step]['entropy']
                    mean_entropy.append(step_data.mean())
                
                color = '#667eea' if mode == 'Adaptive' else '#ed8936'
                label = 'Adaptive (AI)' if mode == 'Adaptive' else 'Linear (Control)'
                ax.plot(steps, mean_entropy, color=color, label=label, linewidth=2, marker='o', markersize=4)
            
            ax.set_xlabel('Question Number', fontsize=12)
            ax.set_ylabel('Entropy (Uncertainty)', fontsize=12)
            ax.set_title(f'Entropy Reduction (Ability = {ability})', fontsize=14, fontweight='bold')
            ax.legend(fontsize=10)
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'entropy_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("  ✓ 熵值变化对比图已保存")
    
    def _generate_statistical_table(self, results_df):
        """生成统计摘要表（保存为图片）"""
        summary_df = self._generate_summary()
        
        # 计算提升比例
        improvement_data = []
        for ability in self.config["ability_values"]:
            adaptive_data = summary_df[
                (summary_df['ability'] == ability) & 
                (summary_df['mode'] == 'Adaptive')
            ]
            linear_data = summary_df[
                (summary_df['ability'] == ability) & 
                (summary_df['mode'] == 'Linear')
            ]
            
            if len(adaptive_data) > 0 and len(linear_data) > 0:
                adaptive_mean = adaptive_data['mean_steps'].iloc[0]
                linear_mean = linear_data['mean_steps'].iloc[0]
                improvement = ((linear_mean - adaptive_mean) / linear_mean) * 100
                
                improvement_data.append({
                    'Ability': f'{ability:.1f}',
                    'Adaptive Mean': f'{adaptive_mean:.2f}',
                    'Linear Mean': f'{linear_mean:.2f}',
                    'Improvement (%)': f'{improvement:.1f}%',
                    'Adaptive Std': f'{adaptive_data["std_steps"].iloc[0]:.2f}',
                    'Linear Std': f'{linear_data["std_steps"].iloc[0]:.2f}'
                })
        
        improvement_df = pd.DataFrame(improvement_data)
        
        # 保存为CSV
        improvement_file = self.output_dir / 'statistical_summary.csv'
        improvement_df.to_csv(improvement_file, index=False, encoding='utf-8-sig')
        print(f"  ✓ 统计摘要表已保存: {improvement_file}")
        
        # 绘制表格图
        fig, ax = plt.subplots(figsize=(12, len(improvement_df) * 0.5 + 2))
        ax.axis('tight')
        ax.axis('off')
        
        table = ax.table(cellText=improvement_df.values,
                        colLabels=improvement_df.columns,
                        cellLoc='center',
                        loc='center',
                        bbox=[0, 0, 1, 1])
        
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1, 2)
        
        # 设置表头样式
        for i in range(len(improvement_df.columns)):
            table[(0, i)].set_facecolor('#667eea')
            table[(0, i)].set_text_props(weight='bold', color='white')
        
        plt.title('Statistical Summary: Convergence Steps Comparison', 
                 fontsize=14, fontweight='bold', pad=20)
        plt.savefig(self.output_dir / 'statistical_summary_table.png', 
                   dpi=300, bbox_inches='tight')
        plt.close()
        print("  ✓ 统计摘要表图已保存")

# ==================== 主函数 ====================
def main():
    """主函数：运行完整的模拟实验"""
    print("=" * 60)
    print("模拟仿真脚本 - Adaptive Learning System")
    print("=" * 60)
    
    # 加载题目数据
    print("\n加载题目数据...")
    csv_path = Path("questions.csv")
    if not csv_path.exists():
        print(f"错误: 找不到题目文件 {csv_path}")
        return
    
    question_df = pd.read_csv(csv_path)
    print(f"✓ 已加载 {len(question_df)} 道题目")
    
    # 创建运行器
    runner = SimulationRunner(question_df, config=CONFIG)
    
    # 运行批量实验
    runner.run_batch_experiments(show_progress=True)
    
    # 保存结果
    runner.save_results()
    
    # 生成可视化
    runner.generate_visualizations()
    
    print("\n" + "=" * 60)
    print("所有任务完成！")
    print(f"结果保存在: {runner.output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    main()

