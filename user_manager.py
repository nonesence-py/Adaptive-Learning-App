"""
User management system
Handles registration, login, and persistence
"""

import json
import os
import hashlib
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np

class UserManager:
    """User manager handling authentication and data persistence"""
    
    def __init__(self, data_dir="user_data"):
        """
        Initialize the user manager.

        Args:
            data_dir: storage directory for user data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        self.users_file = self.data_dir / "users.json"
        self.user_profiles_dir = self.data_dir / "profiles"
        self.user_profiles_dir.mkdir(exist_ok=True)
        
        # Initialize user database
        self._init_users_db()
    
    def _init_users_db(self):
        """Initialize the user database file"""
        if not self.users_file.exists():
            with open(self.users_file, 'w', encoding='utf-8') as f:
                json.dump({}, f, ensure_ascii=False, indent=2)
    
    def _load_users(self):
        """Load user data"""
        try:
            with open(self.users_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_users(self, users):
        """Save user data"""
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    
    def _hash_password(self, password):
        """Password hash (SHA256)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def register_user(self, username, password, email=None, nickname=None, role="Student"):
        """
        Register a new user.
        
        Args:
            username: unique username
            password: password
            email: optional email
            nickname: optional nickname
            role: role (Student/Instructor)
            
        Returns:
            (success, message): (whether succeeded, message)
        """
        users = self._load_users()
        
        # Check if username exists
        if username in users:
            return False, "Username already exists. Please choose another."
        
        # Validate username format
        if not username or len(username.strip()) < 3:
            return False, "Username must be at least 3 characters."
        
        # Validate password strength
        if not password or len(password) < 6:
            return False, "Password must be at least 6 characters."
        
        # Create user record
        user_data = {
            "username": username,
            "password_hash": self._hash_password(password),
            "email": email or "",
            "nickname": nickname or username,
            "role": role,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_login": None,
            "login_count": 0
        }
        
        users[username] = user_data
        self._save_users(users)
        
        # Create user profile file
        self._create_user_profile(username)
        
        return True, f"User {username} registered successfully!"
    
    def _create_user_profile(self, username):
        """Create user profile file"""
        profile_file = self.user_profiles_dir / f"{username}.json"
        profile_data = {
            "username": username,
            "learning_stats": {
                "total_questions": 0,
                "correct_answers": 0,
                "wrong_answers": 0,
                "current_streak": 0,
                "best_streak": 0,
                "total_study_time": 0,  # minutes
                "last_study_date": None
            },
            "learning_history": [],
            "wrong_questions": [],  # list of wrong question IDs
            "wrong_questions_detail": [],  # detailed wrong-question list
            "favorite_questions": [],  # list of favorites
            "learning_goals": {
                "target_ability": 0.8,
                "target_questions_per_day": 10,
                "target_concepts": []
            },
            "preferences": {
                "theme": "light",
                "notifications": True
            }
        }
        
        with open(profile_file, 'w', encoding='utf-8') as f:
            json.dump(profile_data, f, ensure_ascii=False, indent=2)
    
    def authenticate_user(self, username, password):
        """
        Authenticate user.
        
        Args:
            username: username
            password: password
            
        Returns:
            (success, message): (whether succeeded, message)
        """
        users = self._load_users()
        
        if username not in users:
            return False, "Invalid username or password"
        
        user_data = users[username]
        password_hash = self._hash_password(password)
        
        if user_data["password_hash"] != password_hash:
            return False, "Invalid username or password"
        
        # Update login info
        user_data["last_login"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        user_data["login_count"] = user_data.get("login_count", 0) + 1
        self._save_users(users)
        
        return True, "Login successful"
    
    def get_user_profile(self, username):
        """
        Get user profile.
        
        Args:
            username: username
            
        Returns:
            dict: profile data, or None if not found
        """
        profile_file = self.user_profiles_dir / f"{username}.json"
        
        if not profile_file.exists():
            # If profile missing, create one
            self._create_user_profile(username)
        
        try:
            with open(profile_file, 'r', encoding='utf-8') as f:
                profile = json.load(f)
                # Backward compatibility: ensure required fields exist and types are correct
                if not isinstance(profile.get("learning_history", []), list):
                    profile["learning_history"] = []
                if not isinstance(profile.get("wrong_questions", []), list):
                    profile["wrong_questions"] = []
                if "wrong_questions_detail" not in profile or not isinstance(profile.get("wrong_questions_detail", []), list):
                    profile["wrong_questions_detail"] = []
                if not isinstance(profile.get("learning_stats", {}), dict):
                    profile["learning_stats"] = {
                        "total_questions": 0,
                        "correct_answers": 0,
                        "wrong_answers": 0,
                        "current_streak": 0,
                        "best_streak": 0,
                        "total_study_time": 0,
                        "last_study_date": None
                    }
                # Auto-save repaired profile file
                self.save_user_profile(username, profile)
                return profile
        except (FileNotFoundError, json.JSONDecodeError):
            # If file is broken/unreadable, rebuild default profile
            self._create_user_profile(username)
            try:
                with open(profile_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return None
    
    def save_user_profile(self, username, profile_data):
        """
        Save user profile file; returns success and prints absolute path for debugging.
        """
        profile_file = self.user_profiles_dir / f"{username}.json"

        def _json_serializer(obj):
            """Ensure numpy/int64 etc. are serializable to avoid corrupting user data files."""
            try:
                if isinstance(obj, (np.integer,)):
                    return int(obj)
                if isinstance(obj, (np.floating,)):
                    return float(obj)
            except Exception:
                pass
            if hasattr(obj, "item"):
                try:
                    return obj.item()
                except Exception:
                    pass
            return str(obj)

        try:
            with open(profile_file, 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, ensure_ascii=False, indent=2, default=_json_serializer)
            print(f"[DEBUG] Profile saved: {profile_file.resolve()}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to save profile {profile_file}: {e}")
            return False
    
    def update_learning_stats(self, username, question_id, is_correct, study_time_minutes=0):
        """
        Update user learning stats.
        
        Args:
            username: username
            question_id: question ID
            is_correct: whether answered correctly
            study_time_minutes: study duration in minutes
        """
        # Ensure question_id is native int to avoid JSON serialization issues
        try:
            question_id = int(question_id)
        except Exception:
            pass

        profile = self.get_user_profile(username)
        if not profile:
            return
        
        stats = profile["learning_stats"]
        stats["total_questions"] = stats.get("total_questions", 0) + 1
        
        if is_correct:
            stats["correct_answers"] = stats.get("correct_answers", 0) + 1
            stats["current_streak"] = stats.get("current_streak", 0) + 1
            stats["best_streak"] = max(stats.get("best_streak", 0), stats["current_streak"])
        else:
            stats["wrong_answers"] = stats.get("wrong_answers", 0) + 1
            stats["current_streak"] = 0
        
        stats["total_study_time"] = stats.get("total_study_time", 0) + study_time_minutes
        stats["last_study_date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Record learning history
        history_entry = {
            "question_id": question_id,
            "is_correct": is_correct,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "study_time_minutes": study_time_minutes
        }
        profile["learning_history"].append(history_entry)
        
        # If wrong, add to wrong-question list
        if not is_correct:
            if question_id not in profile["wrong_questions"]:
                profile["wrong_questions"].append(question_id)
        
        self.save_user_profile(username, profile)
    
    def get_user_stats(self, username):
        """
        Get user learning stats.
        
        Args:
            username: username
            
        Returns:
            dict: learning stats
        """
        profile = self.get_user_profile(username)
        if not profile:
            return None
        
        stats = profile["learning_stats"]
        total = stats.get("total_questions", 0)
        correct = stats.get("correct_answers", 0)
        
        return {
            "total_questions": total,
            "correct_answers": correct,
            "wrong_answers": stats.get("wrong_answers", 0),
            "accuracy": round(correct / total * 100, 2) if total > 0 else 0,
            "current_streak": stats.get("current_streak", 0),
            "best_streak": stats.get("best_streak", 0),
            "total_study_time": stats.get("total_study_time", 0),
            "last_study_date": stats.get("last_study_date", "Never studied")
        }
    
    def user_exists(self, username):
        """Check whether a user exists"""
        users = self._load_users()
        return username in users
    
    def get_all_users(self):
        """Get list of all users (admin use only)"""
        users = self._load_users()
        return list(users.keys())

