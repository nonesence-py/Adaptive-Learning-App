import numpy as np
import pandas as pd
from scipy.stats import entropy  # <--- 新增：用于计算熵

class ActiveInferenceLearner:
    def __init__(self, grid_size=20):
        # 1. 状态空间 (0.01 ~ 0.99)
        self.ability_grid = np.linspace(0.01, 0.99, grid_size)
        
        # 2. 初始信念 (Uniform Prior)
        self.belief = np.ones(grid_size) / grid_size

    def predict_success_prob(self, difficulty, ability):
        """
        🔥 优化似然函数 (Likelihood Model with Guessing & Slipping)
        采用 4PL IRT (Item Response Theory) 模型思路，考虑真实世界的干扰因素。
        """
        # 1. 猜测系数 (Guessing Factor, c)
        # 你的题目是 4 选 1，所以即使完全不会也有 25% 的概率蒙对
        guess_factor = 0.25 
        
        # 2. 失误系数 (Slipping Factor, s)
        # 即使你是专家，也有 5% 的概率看错题或手滑点错
        slip_factor = 0.05   
        
        # 3. 基础 Sigmoid 概率 (Base Probability)
        # 描述理想情况下的胜率
        base_prob = 1 / (1 + np.exp(-10 * (ability - difficulty)))

        # 4. 修正后的最终概率
        # 公式：P(Correct) = 猜测基线 + (有效概率区间 * 基础概率)
        final_prob = guess_factor + (1 - guess_factor - slip_factor) * base_prob

        return final_prob

    def update_belief(self, difficulty, is_correct):
        """
        感知更新 (Perceptual Update)
        """
        likelihood = self.predict_success_prob(difficulty, self.ability_grid)
        
        if is_correct == 0:
            likelihood = 1 - likelihood

        unnormalized_posterior = self.belief * likelihood
        self.belief = unnormalized_posterior / np.sum(unnormalized_posterior)
        
        return self.get_estimated_ability()

    def get_estimated_ability(self):
        """计算当前能力的期望值"""
        return np.sum(self.ability_grid * self.belief)
    
    def get_current_entropy(self):
        """
        获取当前信念分布的熵（不确定性）
        用于自适应提示机制：高熵表示不确定性高，低熵表示确定性高
        """
        return entropy(self.belief)

    def calculate_eig(self, difficulty):
        """
        🔥 核心优化：计算预期信息增益 (Expected Information Gain)
        EIG = 当前熵 - 预期后验熵
        """
        # 1. 计算当前的熵 (Current Entropy)
        current_entropy = entropy(self.belief)
        
        # 2. 预测做这道题的结果概率
        likelihood_grid = self.predict_success_prob(difficulty, self.ability_grid)
        p_correct = np.sum(likelihood_grid * self.belief)
        p_wrong = 1.0 - p_correct
        
        # 3. 模拟场景 A：如果你做对了 (Outcome = 1)
        post_correct = self.belief * likelihood_grid
        post_correct /= np.sum(post_correct) # 归一化
        h_correct = entropy(post_correct)    # 计算做对后的熵
        
        # 4. 模拟场景 B：如果你做错了 (Outcome = 0)
        likelihood_wrong = 1.0 - likelihood_grid
        post_wrong = self.belief * likelihood_wrong
        post_wrong /= np.sum(post_wrong)     # 归一化
        h_wrong = entropy(post_wrong)        # 计算做错后的熵
        
        # 5. 计算预期的后验熵 (Expected Posterior Entropy)
        expected_posterior_entropy = (p_correct * h_correct) + (p_wrong * h_wrong)
        
        # 6. 信息增益 = 熵的减少量
        return current_entropy - expected_posterior_entropy

    def select_next_question(self, question_pool_df, history_ids):
        """
        主动选择 (Action Selection)
        策略：选择 EIG 最大的题目
        """
        # 1. 排除已做过的题
        available_questions = question_pool_df[~question_pool_df['id'].isin(history_ids)].copy()
        
        if available_questions.empty:
            return None

        # 2. 计算每道备选题目的 EIG
        available_questions['eig'] = available_questions['difficulty'].apply(self.calculate_eig)
        
        # 3. 选择 EIG 最大的题目
        best_question = available_questions.sort_values('eig', ascending=False).iloc[0]
        
        return best_question