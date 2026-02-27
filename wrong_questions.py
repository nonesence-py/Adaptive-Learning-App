"""
Wrong-question manager module
Handles collection, categorization, and review of wrong questions
"""

import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from user_manager import UserManager

class WrongQuestionsManager:
    """Manager for wrong-question notebook"""
    
    def __init__(self, user_manager):
        """
        Initialize the manager.
        
        Args:
            user_manager: UserManager instance
        """
        self.user_manager = user_manager
    
    def add_wrong_question(self, username, question_id, question_data, user_answer, correct_answer):
        """
        Add a wrong question to the notebook.
        
        Args:
            username: username
            question_id: question ID
            question_data: full question data (dict or Series)
            user_answer: chosen answer
            correct_answer: correct answer
            
        Returns:
            bool: whether save succeeded
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            print(f"Warning: Profile not found for user {username}")
            return False
        profile_file = self.user_manager.user_profiles_dir / f"{username}.json"
        print(f"[DEBUG] Saving wrong question for user={username}, profile_file={profile_file}")
        
        # Check if already exists
        wrong_questions = profile.get("wrong_questions_detail", [])
        
        # Check if this question was already recorded
        existing = next((q for q in wrong_questions if q["question_id"] == question_id), None)
        
        if existing:
            # Update wrong count and last wrong time
            existing["wrong_count"] = existing.get("wrong_count", 1) + 1
            existing["last_wrong_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            existing["user_answer"] = user_answer
        else:
            # Add new wrong-question record
            wrong_question = {
                "question_id": question_id,
                "question": question_data.get("question", ""),
                "concept": question_data.get("concept", ""),
                "difficulty": question_data.get("difficulty", 0.5),
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "explanation": question_data.get("explanation", ""),
                "hint": question_data.get("hint", ""),
                "first_wrong_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "last_wrong_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "wrong_count": 1,
                "mastered": False,  # whether mastered
                "mastered_time": None,
                "review_count": 0  # review count
            }
            wrong_questions.append(wrong_question)
        
        profile["wrong_questions_detail"] = wrong_questions
        
        # Ensure question_id is present in wrong_questions list
        if question_id not in profile["wrong_questions"]:
            profile["wrong_questions"].append(question_id)
        
        # Save profile
        try:
            save_ok = self.user_manager.save_user_profile(username, profile)
            print(f"[DEBUG] Saved profile for {username}, wrong_questions_detail len={len(wrong_questions)}, save_ok={save_ok}")
            return bool(save_ok)
        except Exception as e:
            print(f"Error saving wrong question: {e}")
            return False
    
    def get_wrong_questions(self, username, filter_mastered=False, filter_concept=None, sort_by="last_wrong_time"):
        """
        Get wrong-question list for user.
        
        Args:
            username: username
            filter_mastered: whether to filter mastered questions
            filter_concept: filter by concept (None for no filter)
            sort_by: sorting key ("last_wrong_time", "wrong_count", "difficulty", "concept")
            
        Returns:
            list: wrong-question list
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return []
        
        wrong_questions = profile.get("wrong_questions_detail", [])
        
        # Filter mastered questions
        if filter_mastered:
            wrong_questions = [q for q in wrong_questions if not q.get("mastered", False)]
        
        # Filter by concept
        if filter_concept:
            wrong_questions = [q for q in wrong_questions if q.get("concept") == filter_concept]
        
        # Sort
        if sort_by == "last_wrong_time":
            wrong_questions.sort(key=lambda x: x.get("last_wrong_time", ""), reverse=True)
        elif sort_by == "wrong_count":
            wrong_questions.sort(key=lambda x: x.get("wrong_count", 0), reverse=True)
        elif sort_by == "difficulty":
            wrong_questions.sort(key=lambda x: x.get("difficulty", 0), reverse=True)
        elif sort_by == "concept":
            wrong_questions.sort(key=lambda x: x.get("concept", ""))
        
        return wrong_questions
    
    def mark_as_mastered(self, username, question_id):
        """
        Mark a wrong question as mastered.
        
        Args:
            username: username
            question_id: question ID
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return
        
        wrong_questions = profile.get("wrong_questions_detail", [])
        
        for q in wrong_questions:
            if q["question_id"] == question_id:
                q["mastered"] = True
                q["mastered_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                break
        
        profile["wrong_questions_detail"] = wrong_questions
        self.user_manager.save_user_profile(username, profile)
    
    def increment_review_count(self, username, question_id):
        """
        Increment review count.
        
        Args:
            username: username
            question_id: question ID
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return
        
        wrong_questions = profile.get("wrong_questions_detail", [])
        
        for q in wrong_questions:
            if q["question_id"] == question_id:
                q["review_count"] = q.get("review_count", 0) + 1
                break
        
        profile["wrong_questions_detail"] = wrong_questions
        self.user_manager.save_user_profile(username, profile)
    
    def get_wrong_question_stats(self, username):
        """
        Get wrong-question statistics.
        
        Args:
            username: username
            
        Returns:
            dict: statistics
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return {}
        
        wrong_questions = profile.get("wrong_questions_detail", [])
        
        if not wrong_questions:
            return {
                "total": 0,
                "mastered": 0,
                "not_mastered": 0,
                "by_concept": {},
                "by_difficulty": {"easy": 0, "medium": 0, "hard": 0},
                "most_wrong": []
            }
        
        total = len(wrong_questions)
        mastered = sum(1 for q in wrong_questions if q.get("mastered", False))
        not_mastered = total - mastered
        
        # Stats by concept
        by_concept = {}
        for q in wrong_questions:
            concept = q.get("concept", "Unknown")
            by_concept[concept] = by_concept.get(concept, 0) + 1
        
        # Stats by difficulty
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        for q in wrong_questions:
            diff = q.get("difficulty", 0.5)
            if diff < 0.4:
                by_difficulty["easy"] += 1
            elif diff < 0.7:
                by_difficulty["medium"] += 1
            else:
                by_difficulty["hard"] += 1
        
        # 错误次数最多的题目
        most_wrong = sorted(wrong_questions, key=lambda x: x.get("wrong_count", 0), reverse=True)[:5]
        most_wrong = [{"question_id": q["question_id"], "wrong_count": q.get("wrong_count", 0), 
                      "concept": q.get("concept", "")} for q in most_wrong]
        
        return {
            "total": total,
            "mastered": mastered,
            "not_mastered": not_mastered,
            "mastery_rate": round(mastered / total * 100, 2) if total > 0 else 0,
            "by_concept": by_concept,
            "by_difficulty": by_difficulty,
            "most_wrong": most_wrong
        }
    
    def remove_wrong_question(self, username, question_id):
        """
        Remove a question from the notebook (after mastery).
        
        Args:
            username: username
            question_id: question ID
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return
        
        # 从详细列表中移除
        wrong_questions = profile.get("wrong_questions_detail", [])
        profile["wrong_questions_detail"] = [q for q in wrong_questions if q["question_id"] != question_id]
        
        # 从ID列表中移除
        if question_id in profile["wrong_questions"]:
            profile["wrong_questions"].remove(question_id)
        
        self.user_manager.save_user_profile(username, profile)
    
    def get_question_by_id(self, username, question_id, questions_df):
        """
        Fetch wrong-question details by ID (join with full question info).
        
        Args:
            username: username
            question_id: question ID
            questions_df: questions DataFrame
            
        Returns:
            dict: question detail including wrong-notebook info
        """
        profile = self.user_manager.get_user_profile(username)
        if not profile:
            return None
        
        # Get question from bank
        question_row = questions_df[questions_df['id'] == question_id]
        if question_row.empty:
            return None
        
        question_data = question_row.iloc[0].to_dict()
        
        # Merge extra info from wrong-question notebook
        wrong_questions = profile.get("wrong_questions_detail", [])
        wrong_info = next((q for q in wrong_questions if q["question_id"] == question_id), None)
        
        if wrong_info:
            question_data.update({
                "wrong_count": wrong_info.get("wrong_count", 0),
                "last_wrong_time": wrong_info.get("last_wrong_time", ""),
                "mastered": wrong_info.get("mastered", False),
                "review_count": wrong_info.get("review_count", 0),
                "user_answer": wrong_info.get("user_answer", "")
            })
        
        return question_data

