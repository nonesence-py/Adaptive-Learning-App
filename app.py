import streamlit as st
import pandas as pd
import os
import csv
import plotly.express as px
import numpy as np
from datetime import datetime
from algo import ActiveInferenceLearner
from user_manager import UserManager
from wrong_questions import WrongQuestionsManager

# --- 1. 全局配置 (必须在最前面) ---
st.set_page_config(page_title="Adaptive STEM Learning", layout="wide", page_icon="🧬")

# --- 自定义CSS样式 ---
def load_custom_css():
    """从外部CSS文件加载样式"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    css_path = os.path.join(current_dir, "styles.css")
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
        st.markdown(f"<style>{css_content}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        # 如果CSS文件不存在，使用内联样式作为后备
        st.markdown("""
        <style>
        /* 基础样式后备方案 */
        .main { padding-top: 2rem; }
        #MainMenu { visibility: hidden; }
        footer { visibility: hidden; }
        header { visibility: hidden; }
        </style>
        """, unsafe_allow_html=True)

load_custom_css()

# --- 2.1 Shared: Sidebar Navigation ---
def render_sidebar_nav():
    """
    Left sidebar navigation for Evaluation / Wrong Questions / Insights.
    Returns the selected page key ("main" or "wrong_questions").
    """
    pages = [
        {"label": "Evaluation", "key": "main"},
        {"label": "Wrong Questions", "key": "wrong_questions"},
        {"label": "Insights", "key": "insights"},
    ]
    current = st.session_state.get("current_page", "main")

    st.markdown(
        """
        <style>
            .nav-wrapper {
                margin-bottom: 0.08rem;
                position: relative;
            }
            /* Sidebar vertical block gap is large by default; tighten it */
            section[data-testid="stSidebar"] div[data-testid="stVerticalBlock"] {
                gap: 0.35rem !important;
            }
            .nav-wrapper .stButton {
                margin: 0 !important;
                width: 100%;
            }
            .nav-wrapper .stButton > button {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                color: #2d3748 !important;
                padding: 0.18rem 0.55rem !important;
                margin: 0 !important;
                width: 100%;
                min-height: 0 !important;
                height: auto !important;
                font-weight: 500;
                font-size: 1rem;
                line-height: 1.1;
            }
            .nav-wrapper > div,
            .nav-wrapper > div > div {
                margin: 0 !important;
                padding: 0 !important;
            }
            .nav-pill {
                width: 100%;
                padding: 0.18rem 0.55rem;
                border-radius: 999px;
                border: 1px solid #e2e8f0;
                background: #f8fafc;
                color: #2d3748;
                font-weight: 500;
                box-shadow: none;
                transition: background 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out;
                position: absolute;
                inset: 0;
                pointer-events: none;
            }
            .nav-pill:hover {
                background: #edf2f7;
                border-color: #cbd5e0;
            }
            .nav-pill.active {
                background: #e5edff;
                border-color: #667eea;
                color: #1a202c;
            }
            .sidebar-section-title {
                color: #4a5568;
                font-weight: 600;
                margin: 0 0 0.35rem 0;
                font-size: 0.95rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown('<p class="sidebar-section-title">🧭 Navigation</p>', unsafe_allow_html=True)
    for page in pages:
        is_active = page["key"] == current
        btn_classes = "nav-pill active" if is_active else "nav-pill"
        st.markdown("<div class='nav-wrapper'>", unsafe_allow_html=True)
        clicked = st.button(page["label"], key=f"nav_{page['key']}", use_container_width=True)
        st.markdown(f"<div class='{btn_classes}'></div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        if clicked and not is_active:
            st.session_state.current_page = page["key"]
            st.rerun()

    return st.session_state.get("current_page", "main")


def render_sidebar_full(user_id: str):
    """统一的侧边栏：学习统计 + 导航 + 用户信息（所有页面共用）"""
    with st.sidebar:
        # 1) 学习统计（置顶）
        if st.session_state.user_manager.user_exists(user_id):
            user_stats = st.session_state.user_manager.get_user_stats(user_id)
            if user_stats:
                st.markdown('<p class="sidebar-section-title">📊 Learning</p>', unsafe_allow_html=True)
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                col_s1, col_s2 = st.columns(2)
                with col_s1:
                    st.metric("Total", user_stats["total_questions"])
                    st.metric("Accuracy", f"{user_stats['accuracy']:.1f}%")
                with col_s2:
                    st.metric("Streak", user_stats["current_streak"])
                    st.metric("Best", user_stats["best_streak"])
                st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("<div style='margin: 0.4rem 0;'></div>", unsafe_allow_html=True)

        # 2) 导航
        render_sidebar_nav()

        st.markdown("<div style='margin: 0.6rem 0;'></div>", unsafe_allow_html=True)

        # 3) 用户块（精简展示）
        st.markdown('<p class="sidebar-section-title">👤 User</p>', unsafe_allow_html=True)
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)
        new_user_id = st.text_input(
            "Current User",
            value=st.session_state.current_user_id,
            help="Switch learner profile quickly",
            label_visibility="collapsed",
            placeholder="Enter user ID"
        )
        if new_user_id != st.session_state.current_user_id:
            st.session_state.current_user_id = new_user_id.strip()
            st.rerun()

        mode_color = "#667eea" if st.session_state.learning_mode == "Adaptive (AI)" else "#ed8936"
        mode_icon = "🤖" if st.session_state.learning_mode == "Adaptive (AI)" else "📋"
        st.markdown(
            f"""
            <div style="padding: 0.4rem 0.75rem; background: {mode_color}15; border-radius: 8px; margin: 0.4rem 0 0.6rem 0; border-left: 4px solid {mode_color}; color: #4a5568; font-weight: 600;">
                {mode_icon} {st.session_state.learning_mode}
            </div>
            """,
            unsafe_allow_html=True,
        )

        if st.button("Logout / Reset", type="secondary", use_container_width=True):
            st.session_state.is_logged_in = False
            st.rerun()

        st.markdown('</div>', unsafe_allow_html=True)

# --- 2. 初始化用户管理和错题本管理器 ---
if 'user_manager' not in st.session_state:
    st.session_state.user_manager = UserManager()
if 'wrong_questions_manager' not in st.session_state:
    st.session_state.wrong_questions_manager = WrongQuestionsManager(st.session_state.user_manager)

# --- 3. 工具函数：加载数据与日志 ---
@st.cache_data
def load_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "questions.csv")
    try:
        df = pd.read_csv(csv_path)
        # Ensure hint column exists (add empty column if missing)
        if 'hint' not in df.columns:
            df['hint'] = None
        return df
    except FileNotFoundError:
        return pd.DataFrame()

def log_interaction(user_id, q_id, difficulty, correct, ability, concept, eig, learning_mode=None, hint_used=False, hint_cost=0.0, entropy_at_hint=None):
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    log_file = os.path.join(log_dir, "learning_history.csv")
    file_exists = os.path.isfile(log_file)
    with open(log_file, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "question_id", "difficulty", "correct", "concept", "estimated_ability", "eig_value", "learning_mode", "hint_used", "hint_cost", "entropy_at_hint"])
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            user_id, q_id, difficulty, correct, concept,
            f"{ability:.4f}", f"{eig:.4f}", learning_mode or "Unknown",
            "Yes" if hint_used else "No", f"{hint_cost:.2f}", f"{entropy_at_hint:.4f}" if entropy_at_hint is not None else "N/A"
        ])

def get_user_logs(user_id):
    """Read learning logs for charting."""
    log_file = "logs/learning_history.csv"
    if not os.path.exists(log_file):
        return pd.DataFrame()
    try:
        # Use python engine and skip bad rows to be backward compatible with older log formats
        df = pd.read_csv(log_file, engine="python", on_bad_lines="skip")
        if df.empty:
            return df
        # Backfill missing columns for older headers
        for col in ["learning_mode", "hint_used", "hint_cost", "entropy_at_hint"]:
            if col not in df.columns:
                df[col] = None
        # Ensure ability values are numeric
        df["estimated_ability"] = pd.to_numeric(df.get("estimated_ability"), errors="coerce")
        return df[df['user_id'] == user_id]
    except Exception as e:
        print(f"[WARN] Failed to read logs: {e}")
        return pd.DataFrame()

# --- Helper: Learning time statistics ---
from datetime import timedelta

def compute_learning_time_stats(user_logs: pd.DataFrame, lookback_days: int = 120):
    """
    Estimate study time (minutes) from logs and generate slot/frequency/calendar stats.
    Logs store only timestamps, so duration is estimated by gap between interactions:
    - Same-day consecutive interactions: min(max(delta, 2), 45) minutes
    - Otherwise: default 5 minutes
    """
    if user_logs.empty or "timestamp" not in user_logs.columns:
        return {}

    df = user_logs.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp")

    cutoff = pd.Timestamp.now() - timedelta(days=lookback_days)
    df = df[df["timestamp"] >= cutoff]
    if df.empty:
        return {}

    df["date"] = df["timestamp"].dt.date
    df["hour"] = df["timestamp"].dt.hour

    # 估算时长
    df["delta_min"] = df["timestamp"].diff().dt.total_seconds() / 60
    same_day = df["date"] == df["date"].shift(1)
    df["duration_min"] = 5  # default 5 minutes
    df.loc[same_day & df["delta_min"].notna(), "duration_min"] = (
        df.loc[same_day, "delta_min"].clip(lower=2, upper=45)
    )

    # 每日时长
    daily_minutes = (
        df.groupby("date")["duration_min"]
        .sum()
        .reset_index()
        .rename(columns={"duration_min": "minutes"})
    )

    # 时段（6 段）
    bins = [0, 6, 9, 12, 15, 18, 21, 24]
    labels = ["0-6", "6-9", "9-12", "12-15", "15-18", "18-21", "21-24"]
    df["slot"] = pd.cut(df["hour"], bins=bins, labels=labels, right=False, include_lowest=True)
    slot_minutes = (
        df.groupby("slot")["duration_min"]
        .sum()
        .reindex(labels)
        .reset_index()
        .rename(columns={"duration_min": "minutes"})
    )
    best_slot_row = slot_minutes.sort_values("minutes", ascending=False).iloc[0]
    best_slot = best_slot_row["slot"]

    # 近 30 天频率与连续天数
    today = pd.Timestamp.now().date()
    last_30 = today - timedelta(days=29)
    active_dates = set(daily_minutes["date"].tolist())
    active_30 = sum(1 for d in active_dates if d >= last_30)

    # Streak calculation based on active_dates
    longest_streak = 0
    current_streak = 0
    prev_day = None
    for d in sorted(active_dates):
        if prev_day and (d - prev_day).days == 1:
            current_streak += 1
        else:
            current_streak = 1
        longest_streak = max(longest_streak, current_streak)
        prev_day = d

    # 日历视图数据（近 90 天）
    last_90 = today - timedelta(days=89)
    calendar_df = daily_minutes[daily_minutes["date"] >= last_90]
    if not calendar_df.empty:
        calendar_df["dow"] = pd.to_datetime(calendar_df["date"]).dt.dayofweek
        calendar_df["week"] = pd.to_datetime(calendar_df["date"]).dt.isocalendar().week

    # 习惯分析规则
    avg7 = (
        daily_minutes[daily_minutes["date"] >= today - timedelta(days=6)]["minutes"].mean()
        if not daily_minutes.empty else 0
    )
    avg30 = (
        daily_minutes[daily_minutes["date"] >= today - timedelta(days=29)]["minutes"].mean()
        if not daily_minutes.empty else 0
    )
    habit_notes = []
    if avg7 >= 60:
        habit_notes.append("Past 7-day average ≥ 60 minutes — steady pace.")
    if avg7 < 30:
        habit_notes.append("Past 7-day average < 30 minutes — set a consistent study slot.")
    if best_slot in ["21-24", "0-6"]:
        habit_notes.append("Most activity is late night — consider moving earlier for rest.")
    if avg30 > 0 and avg7 < avg30 * 0.8:
        habit_notes.append("Past 7-day time dropped >20% vs 30-day average — try to recover pace.")

    return {
        "daily_minutes": daily_minutes,
        "slot_minutes": slot_minutes,
        "best_slot": best_slot,
        "active_days_30": active_30,
        "longest_streak": longest_streak,
        "current_streak": current_streak,
        "calendar": calendar_df if not calendar_df.empty else pd.DataFrame(),
        "avg7": avg7,
        "avg30": avg30,
        "habit_notes": habit_notes,
    }

# --- 4. 初始化全局状态 ---
if 'is_logged_in' not in st.session_state:
    st.session_state.is_logged_in = False
if 'current_user_id' not in st.session_state:
    st.session_state.current_user_id = "Student_A" # default value
if 'user_data' not in st.session_state:
    st.session_state.user_data = {}
if 'learning_mode' not in st.session_state:
    st.session_state.learning_mode = "Adaptive (AI)"  # default mode

# 加载题库
df = load_data()

# Debug info: check hint column exists (dev-time only)
if not df.empty:
    if 'hint' not in df.columns:
        st.warning("⚠️ Warning: 'hint' column not found in questions.csv. Please ensure the CSV file has been updated.")
    else:
        # Check if any hint values exist
        hint_count = df['hint'].notna().sum()
        if hint_count == 0:
            st.warning(f"⚠️ Warning: Found 'hint' column but all values are empty. {hint_count}/{len(df)} questions have hints.")
        # 开发时显示（生产环境可注释掉）
        # st.info(f"✅ Loaded {len(df)} questions, {hint_count} with hints.")

# --- 5. 页面模块：登录页 ---
def login_page():
    # 使用全宽布局，内容居中但占据更多空间
    col_left, col_center, col_right = st.columns([0.8, 4, 0.8])
    
    with col_center:
        # 标题区域 - 优化为单行显示，减少间距，添加动画
        st.markdown("""
        <div style="text-align: center; padding: 2rem 0 1rem 0;">
            <div style="font-size: 4rem; margin-bottom: 0.5rem; display: inline-block; animation: pulse 2s ease-in-out infinite;">
                🧬
            </div>
            <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #667eea; font-weight: 700; white-space: nowrap; letter-spacing: -0.5px;">
                Adaptive STEM Learning
            </h1>
            <p style="font-size: 1.2rem; color: #718096; margin-bottom: 2rem; letter-spacing: 0.3px;">
                Personalized Learning Powered by Active Inference
            </p>
        </div>
        <style>
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        </style>
        """, unsafe_allow_html=True)
        
        # 登录/注册标签页
        tab_login, tab_register = st.tabs(["🔐 Login", "📝 Register"])
        
        with tab_login:
            # 登录表单卡片
            st.markdown("""
            <div class="login-form-card" style="max-width: 500px; margin: 0 auto;">
            """, unsafe_allow_html=True)
            
            with st.form("login_form", clear_on_submit=False):
                st.markdown("""
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="color: #2d3748; margin-bottom: 0.5rem; font-size: 1.8rem;">👋 Welcome Back!</h2>
                    <p style="color: #718096; font-size: 1rem;">Enter your credentials to start your personalized learning journey</p>
                </div>
                """, unsafe_allow_html=True)
                
                username = st.text_input(
                    "👤 Username", 
                    placeholder="Enter your username",
                    help="Your registered username"
                )
                
                password = st.text_input(
                    "🔒 Password", 
                    type="password",
                    placeholder="Enter your password",
                    help="Your password"
                )
                
                # 学习模式选择（对比实验功能）
                learning_mode = st.selectbox(
                    "🔬 Learning Mode", 
                    ["Adaptive (AI)", "Linear (Control Group)"],
                    help="Adaptive: AI-powered question selection using Active Inference. Linear: Fixed sequential order (baseline for comparison)."
                )
                
                st.markdown("<div style='margin: 2rem 0;'></div>", unsafe_allow_html=True)
                
                # 登录按钮
                submit = st.form_submit_button(
                    "🚀 Login", 
                    type="primary", 
                    use_container_width=True
                )
                
                if submit:
                    if username.strip() and password.strip():
                        success, message = st.session_state.user_manager.authenticate_user(username, password)
                        if success:
                            st.session_state.current_user_id = username
                            st.session_state.learning_mode = learning_mode
                            st.session_state.is_logged_in = True
                            st.success(f"✅ {message}")
                            st.rerun()
                        else:
                            st.error(f"❌ {message}")
                    else:
                        st.error("⚠️ Please enter both username and password.")
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 快速登录选项（用于演示）
            st.markdown("---")
            st.markdown("**💡 Quick Demo (No Password Required):**")
            if st.button("🎮 Quick Start as Guest", use_container_width=True):
                st.session_state.current_user_id = "Guest_User"
                st.session_state.learning_mode = "Adaptive (AI)"
                st.session_state.is_logged_in = True
                st.rerun()
        
        with tab_register:
            # 注册表单卡片
            st.markdown("""
            <div class="login-form-card" style="max-width: 500px; margin: 0 auto;">
            """, unsafe_allow_html=True)
            
            with st.form("register_form", clear_on_submit=False):
                st.markdown("""
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="color: #2d3748; margin-bottom: 0.5rem; font-size: 1.8rem;">📝 Create Account</h2>
                    <p style="color: #718096; font-size: 1rem;">Register to save your learning progress</p>
                </div>
                """, unsafe_allow_html=True)
                
                username = st.text_input(
                    "👤 Username *", 
                    placeholder="Choose a username (min 3 characters)",
                    help="Your unique username"
                )
                
                password = st.text_input(
                    "🔒 Password *", 
                    type="password",
                    placeholder="Enter password (min 6 characters)",
                    help="Choose a secure password"
                )
                
                password_confirm = st.text_input(
                    "🔒 Confirm Password *", 
                    type="password",
                    placeholder="Re-enter your password",
                    help="Confirm your password"
                )
                
                email = st.text_input(
                    "📧 Email (Optional)", 
                    placeholder="your.email@example.com",
                    help="Optional email address"
                )
                
                nickname = st.text_input(
                    "🏷️ Nickname (Optional)", 
                    placeholder="Your display name",
                    help="How you want to be displayed"
                )
                
                role = st.selectbox(
                    "👤 Role", 
                    ["Student", "Instructor (View Only)"],
                    help="Choose your role"
                )
                
                st.markdown("<div style='margin: 2rem 0;'></div>", unsafe_allow_html=True)
                
                # 注册按钮
                submit = st.form_submit_button(
                    "✨ Create Account", 
                    type="primary", 
                    use_container_width=True
                )
                
                if submit:
                    if not username.strip():
                        st.error("⚠️ Username is required.")
                    elif not password.strip():
                        st.error("⚠️ Password is required.")
                    elif password != password_confirm:
                        st.error("⚠️ Passwords do not match.")
                    else:
                        success, message = st.session_state.user_manager.register_user(
                            username, password, email, nickname, role
                        )
                        if success:
                            st.success(f"✅ {message}")
                            st.info("💡 You can now login with your credentials.")
                        else:
                            st.error(f"❌ {message}")
            
            st.markdown('</div>', unsafe_allow_html=True)
        
        # 底部说明
        st.markdown("""
        <div style="text-align: center; margin-top: 2rem; color: #a0aec0; font-size: 0.9rem;">
            <p>🔬 Science • 🧮 Technology • 🔧 Engineering • 📊 Mathematics</p>
        </div>
        """, unsafe_allow_html=True)

# --- 5. 页面模块：主应用 (答题界面) ---
def main_app():
    # 获取当前用户ID（必须在函数开始处定义）
    user_id = st.session_state.current_user_id.strip()
    # 若登录名存在首尾空格，立即清理并回写
    if user_id != st.session_state.current_user_id:
        st.session_state.current_user_id = user_id
    
    # === A. 侧边栏（统一渲染） ===
    render_sidebar_full(user_id)

    # === B. 用户数据初始化 (懒加载) ===
    # user_id 已在函数开始处定义
    
    # 加载用户配置（如果用户已注册）
    user_profile = None
    if st.session_state.user_manager.user_exists(user_id):
        user_profile = st.session_state.user_manager.get_user_profile(user_id)
    
    if user_id not in st.session_state.user_data:
        # 为新用户创建独立的大脑
        st.session_state.user_data[user_id] = {
            "learner": ActiveInferenceLearner(),
            "history": [],
            "score": 0, "streak": 0,
            "current_q_id": None, "last_result": None, "waiting_next": False,
            "hint_used": False,  # whether hint used on current question
            "hint_cost": 0.0,     # recorded hint cost (does not change real score)
            "hint_count": 0,      # total hint usage count
            "entropy_at_hint": None,  # entropy when hint was used
            "hint_cost_this_q": 0.0,   # hint cost for the current question
            "hint_type": "free"   # hint type for current question (free/cost)
        }
        # 先拿到局部引用，后续恢复逻辑会用到
        user_state = st.session_state.user_data[user_id]
        
        # 如果用户已注册，从配置中恢复学习历史（可选）
        if user_profile:
            try:
                user_logs = get_user_logs(user_id)
                if not user_logs.empty:
                    # 按时间顺序回放答题记录，恢复能力分布与已做题目
                    if "timestamp" in user_logs.columns:
                        user_logs["timestamp"] = pd.to_datetime(user_logs["timestamp"], errors="coerce")
                        user_logs = user_logs.sort_values("timestamp")
                    answered_ids = set()
                    for _, row in user_logs.iterrows():
                        try:
                            difficulty = float(row.get("difficulty", 0.5))
                        except Exception:
                            difficulty = 0.5
                        correct_raw = row.get("correct", 0)
                        try:
                            correct_val = 1 if int(correct_raw) != 0 else 0
                        except Exception:
                            correct_val = 1 if str(correct_raw).strip().lower() in ["true", "yes"] else 0
                        try:
                            user_state["learner"].update_belief(difficulty, correct_val)
                        except Exception:
                            # 若单条记录异常，跳过继续
                            continue
                        qid = row.get("question_id", None)
                        if pd.notna(qid):
                            try:
                                qid_int = int(qid)
                                if qid_int not in answered_ids:
                                    user_state["history"].append(qid_int)
                                    answered_ids.add(qid_int)
                            except Exception:
                                pass
                    # 从持久化统计近似恢复得分与连对
                    stats = user_profile.get("learning_stats", {})
                    user_state["score"] = stats.get("correct_answers", user_state["score"])
                    user_state["streak"] = stats.get("current_streak", user_state["streak"])
            except Exception as e:
                st.warning("⚠️ Failed to restore past learning state, starting fresh.")
                print(f"[WARN] restore state failed for {user_id}: {e}")
    
    # 锁定当前用户的状态
    user_state = st.session_state.user_data[user_id]

    # 辅助函数：选题
    def get_next_question():
        learning_mode = st.session_state.learning_mode
        
        if learning_mode == "Linear (Control Group)":
            # Linear mode: select questions by ascending ID (fixed baseline)
            available_questions = df[~df['id'].isin(user_state["history"])].copy()
            if available_questions.empty:
                user_state["current_q_id"] = "FINISHED"
            else:
                # 按 ID 升序排序，选择第一个
                next_q = available_questions.sort_values('id', ascending=True).iloc[0]
                user_state["current_q_id"] = next_q['id']
        else:
            # Adaptive mode: Active Inference with EIG policy
            next_q = user_state["learner"].select_next_question(df, user_state["history"])
            user_state["current_q_id"] = next_q['id'] if next_q is not None else "FINISHED"
        
        # 重置提示状态（新题目开始时）
        user_state["hint_used"] = False
        user_state["entropy_at_hint"] = None
        user_state["hint_cost_this_q"] = 0.0
        user_state["hint_type"] = "free"

    # 辅助函数：自适应提示决策
    def should_provide_hint(learner, entropy_threshold=2.5):
        """
        Decide whether to provide a hint and its type (entropy-based).

        Strategy:
        - High entropy (> threshold): high uncertainty → free hint (exploration)
        - Low entropy (≤ threshold): high certainty → cost hint (exploitation)

        Returns: (should_show, hint_type, cost)
        """
        current_entropy = learner.get_current_entropy()
        
        if current_entropy > entropy_threshold:
            return True, "free", 0.0  # free hint
        else:
            return True, "cost", 0.5  # cost hint (record only, no score impact)

    if user_state["current_q_id"] is None:
        get_next_question()

    # === C. 主界面布局 ===
    mode_display = "🤖 AI-Powered" if st.session_state.learning_mode == "Adaptive (AI)" else "📋 Fixed Sequence"
    st.markdown(f"""
    <div style="text-align: center; padding: 1rem 0 2rem 0;">
        <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #667eea;">
            🧬 Adaptive STEM Learning
        </h1>
        <p style="color: #718096; font-size: 1.1rem;">Intelligent Question Selection for Optimal Learning</p>
        <p style="color: #a0aec0; font-size: 0.95rem; margin-top: 0.5rem;">
            <strong>Mode:</strong> {mode_display} ({st.session_state.learning_mode})
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    col_main, col_dashboard = st.columns([0.7, 0.3], gap="large")

    # --- 右侧仪表盘 ---
    with col_dashboard:
        tab1, tab2 = st.tabs(["🧠 Brain State", "📈 Analytics"])
        
        with tab1:
            st.markdown("""
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.2rem; border-radius: 12px; margin-bottom: 1.5rem; text-align: center; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                <h3 style="color: white; margin: 0; font-weight: 600; letter-spacing: 0.5px;">Real-time Estimates</h3>
            </div>
            """, unsafe_allow_html=True)
            
            estimated_ability = user_state["learner"].get_estimated_ability()
            delta_val = estimated_ability - 0.5
            
            # Styled metric card
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric(
                "🎯 Estimated Mastery", 
                f"{estimated_ability:.2f}", 
                f"{delta_val:+.2f} vs Baseline",
                delta_color="normal" if delta_val >= 0 else "inverse"
            )
            st.markdown('</div>', unsafe_allow_html=True)
            
            col_s1, col_s2 = st.columns(2)
            with col_s1:
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                st.metric("📊 Score", user_state["score"])
                st.markdown('</div>', unsafe_allow_html=True)
            with col_s2:
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                st.metric("🔥 Streak", user_state["streak"])
                st.markdown('</div>', unsafe_allow_html=True)
            
            st.markdown("<br>", unsafe_allow_html=True)
            # Belief Distribution - styled with Plotly
            chart_data = pd.DataFrame({
                "Ability": user_state["learner"].ability_grid,
                "Probability": user_state["learner"].belief
            })
            
            fig_belief = px.bar(
                chart_data,
                x="Ability",
                y="Probability",
                title="📊 Belief Distribution",
                color_discrete_sequence=["#667eea"],
                labels={"Ability": "Ability Level", "Probability": "Belief Probability"}
            )
            fig_belief.update_traces(
                marker=dict(
                    line=dict(color='#764ba2', width=1),
                    color='#667eea'
                ),
                hovertemplate='<b>Ability:</b> %{x:.3f}<br><b>Probability:</b> %{y:.4f}<extra></extra>'
            )
            fig_belief.update_layout(
                height=280,
                margin=dict(l=40, r=20, t=50, b=40),
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font=dict(color="#4a5568", size=11),
                title_font=dict(size=16, color="#2d3748"),
                xaxis=dict(
                    title_font=dict(size=12),
                    gridcolor='rgba(0,0,0,0.05)',
                    showgrid=True
                ),
                yaxis=dict(
                    title_font=dict(size=12),
                    gridcolor='rgba(0,0,0,0.05)',
                    showgrid=True
                ),
                showlegend=False
            )
            st.plotly_chart(fig_belief, use_container_width=True)

        with tab2:
            st.markdown("""
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.2rem; border-radius: 12px; margin-bottom: 1.5rem; text-align: center; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                <h3 style="color: white; margin: 0; font-weight: 600; letter-spacing: 0.5px;">Learning Analytics</h3>
            </div>
            """, unsafe_allow_html=True)
            
            user_logs = get_user_logs(user_id)
            # 检查是否有足够的数据和必要的列（>=1 条即可开始展示）
            if (
                not user_logs.empty
                and 'estimated_ability' in user_logs.columns
                and user_logs['estimated_ability'].notna().sum() >= 1
            ):
                # 仅保留有能力值的记录，避免空值干扰
                user_logs = user_logs[user_logs['estimated_ability'].notna()]
                # 学习曲线 - 美化
                fig_line = px.line(
                    user_logs, 
                    y="estimated_ability", 
                    title="📈 Mastery Convergence",
                    markers=True,
                    color_discrete_sequence=["#667eea"]
                )
                fig_line.update_traces(
                    line=dict(width=3, color='#667eea'),
                    marker=dict(size=8, color='#764ba2', line=dict(width=2, color='white')),
                    hovertemplate='<b>Question:</b> %{x}<br><b>Ability:</b> %{y:.3f}<extra></extra>'
                )
                fig_line.update_layout(
                    height=280, 
                    margin=dict(l=50, r=20, t=50, b=40), 
                    xaxis_title="Question Sequence",
                    yaxis_title="Estimated Ability",
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)',
                    font=dict(color="#4a5568", size=11),
                    title_font=dict(size=16, color="#2d3748"),
                    xaxis=dict(
                        title_font=dict(size=12),
                        gridcolor='rgba(0,0,0,0.05)',
                        showgrid=True
                    ),
                    yaxis=dict(
                        title_font=dict(size=12),
                        gridcolor='rgba(0,0,0,0.05)',
                        showgrid=True,
                        range=[0, 1]
                    ),
                    showlegend=False
                )
                st.plotly_chart(fig_line, use_container_width=True)
                
                # 雷达图 - 美化
                concept_stats = user_logs.groupby('concept')['correct'].mean().reset_index()
                fig_radar = px.line_polar(
                    concept_stats, 
                    r='correct', 
                    theta='concept', 
                    line_close=True, 
                    range_r=[0, 1], 
                    title="🎯 Knowledge Radar",
                    color_discrete_sequence=["#764ba2"]
                )
                fig_radar.update_traces(
                    fill='toself',
                    line_color='#764ba2',
                    line_width=3,
                    marker=dict(size=10, color='#667eea', line=dict(width=2, color='white')),
                    fillcolor='rgba(118, 75, 162, 0.2)',
                    hovertemplate='<b>%{theta}</b><br>Score: %{r:.2f}<extra></extra>'
                )
                fig_radar.update_layout(
                    height=320, 
                    margin=dict(l=40, r=40, t=50, b=40),
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)',
                    font=dict(color="#4a5568", size=11),
                    title_font=dict(size=16, color="#2d3748"),
                    polar=dict(
                        radialaxis=dict(
                            tickfont=dict(size=10),
                            gridcolor='rgba(0,0,0,0.1)',
                            linecolor='rgba(0,0,0,0.2)',
                            showline=True
                        ),
                        angularaxis=dict(
                            tickfont=dict(size=11),
                            linecolor='rgba(0,0,0,0.2)'
                        ),
                        bgcolor='rgba(255,255,255,0.5)'
                    ),
                    showlegend=False
                )
                st.plotly_chart(fig_radar, use_container_width=True)
            else:
                st.info("📊 Answer more questions to visualize analytics.")

    # --- 左侧答题区 ---
    with col_main:
        if user_state["current_q_id"] == "FINISHED":
            st.balloons()
            st.markdown('<div class="question-card">', unsafe_allow_html=True)
            st.markdown("""
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: #48bb78; font-size: 2.5rem; margin-bottom: 1rem;">🎉 Congratulations!</h2>
                <p style="font-size: 1.3rem; color: #4a5568; margin-bottom: 2rem;">Session Complete for <strong>{}</strong></p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white; margin: 1rem 0;">
                    <p style="font-size: 1.5rem; margin: 0;">Final Score: <strong>{}</strong> / <strong>{}</strong></p>
                </div>
            </div>
            """.format(user_id, user_state['score'], len(user_state['history'])), unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
            col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
            with col_btn2:
                if st.button("🔄 Start New Session", type="primary", use_container_width=True):
                    # Reset current user
                    del st.session_state.user_data[user_id]
                    st.rerun()
                
        elif not df.empty:
            current_q = df[df['id'] == user_state["current_q_id"]].iloc[0]
            
            # Question card
            st.markdown('<div class="question-card">', unsafe_allow_html=True)
            
            # Question metadata cards
            col_info1, col_info2 = st.columns(2)
            with col_info1:
                st.markdown(f"""
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.8rem; border-radius: 10px; text-align: center; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: transform 0.3s ease;">
                    <strong>📚 Topic:</strong> {current_q['concept']}
                </div>
                """, unsafe_allow_html=True)
            with col_info2:
                difficulty_color = (
                    "#48bb78" if current_q['difficulty'] <= 0.5
                    else "#8b5cf6" if current_q['difficulty'] >= 0.8
                    else "#667eea"
                )
                difficulty_gradient = f"linear-gradient(135deg, {difficulty_color} 0%, {difficulty_color}dd 100%)"
                st.markdown(f"""
                <div style="background: {difficulty_gradient}; color: white; padding: 0.8rem; border-radius: 10px; text-align: center; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.3s ease;">
                    <strong>⚡ Difficulty:</strong> {current_q['difficulty']:.2f}
                </div>
                """, unsafe_allow_html=True)
            
            # Question number/content with hint button on the right
            col_q_title, col_hint_btn = st.columns([0.92, 0.08])
            with col_q_title:
                st.markdown(f"""
                <div style="margin: 1.5rem 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <h3 style="color: #2d3748; margin: 0; font-weight: 600;">Question {len(user_state['history']) + 1}</h3>
                    </div>
                    <p style="font-size: 1.2rem; color: #4a5568; line-height: 1.6; padding: 1.5rem; background: white; border-radius: 12px; border-left: 4px solid #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        {current_q['question']}
                    </p>
                </div>
                """, unsafe_allow_html=True)
            
            # Hint button area (small button on the right)
            with col_hint_btn:
                st.markdown("<br>", unsafe_allow_html=True)
                # Check if hint field exists
                has_hint = False
                try:
                    if 'hint' in df.columns:
                        if hasattr(current_q, 'hint'):
                            hint_value = current_q['hint']
                            has_hint = pd.notna(hint_value) and str(hint_value).strip() != '' and str(hint_value).strip().lower() != 'nan'
                        elif 'hint' in current_q.index:
                            hint_value = current_q['hint']
                            has_hint = pd.notna(hint_value) and str(hint_value).strip() != '' and str(hint_value).strip().lower() != 'nan'
                except (KeyError, IndexError, AttributeError):
                    has_hint = False
                
                if has_hint and not user_state["waiting_next"]:
                    hint_button_key = f"hint_btn_{user_id}_{user_state['current_q_id']}"
                    
                    if not user_state["hint_used"]:
                        # Adaptive hint decision
                        should_show, hint_type, hint_cost = should_provide_hint(user_state["learner"])
                        current_entropy = user_state["learner"].get_current_entropy()
                        
                        # Render hint button with custom styling
                        hint_help_text = f"Get a hint ({'Free' if hint_type == 'free' else f'Cost: -{hint_cost:.1f} pts'})"
                        st.markdown("""
                        <style>
                        button[key*="hint_btn"] {
                            padding: 0.5rem 0.75rem !important;
                            min-width: 45px !important;
                            min-height: 45px !important;
                            font-size: 1.2rem !important;
                            overflow: hidden !important;
                            text-overflow: ellipsis !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        </style>
                        """, unsafe_allow_html=True)
                        hint_clicked = st.button("💡", key=hint_button_key, help=hint_help_text, use_container_width=True)
                        
                        if hint_clicked:
                            # 记录提示使用
                            user_state["hint_used"] = True
                            user_state["hint_count"] += 1
                            user_state["hint_cost"] += hint_cost
                            user_state["hint_cost_this_q"] = hint_cost
                            user_state["entropy_at_hint"] = current_entropy
                            user_state["hint_type"] = hint_type
                            st.rerun()
            
            # 提示内容显示区域（在题目下方，主内容区域）
            if has_hint and user_state.get("hint_used", False) and not user_state["waiting_next"]:
                hint_type = user_state.get("hint_type", "free")
                hint_cost = user_state.get("hint_cost_this_q", 0.0)
                entropy_at_hint = user_state.get("entropy_at_hint", 0.0)
                
                # 提示卡片样式
                hint_bg_color = "#f0f9ff" if hint_type == "free" else "#fff4e6"
                hint_border_color = "#667eea" if hint_type == "free" else "#ed8936"
                
                st.markdown(f"""
                <div style="margin: 1rem 0 1.5rem 0; padding: 1.2rem; background: {hint_bg_color}; border-radius: 12px; border-left: 4px solid {hint_border_color}; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; margin-bottom: 0.8rem;">
                        <span style="font-size: 1.3rem; margin-right: 0.5rem;">💡</span>
                        <strong style="color: #2d3748; font-size: 1rem;">Hint {'(Free)' if hint_type == 'free' else f'(Cost: -{hint_cost:.1f} pts - recorded only)'}</strong>
                    </div>
                    <p style="color: #4a5568; line-height: 1.7; font-size: 1.05rem; margin: 0; padding-left: 1.8rem;">{current_q['hint']}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 提示说明
                if hint_type == "cost":
                    st.caption(f"⚠️ Hint cost ({hint_cost:.1f} points) is recorded for analysis only. Your actual score is not affected.")
                else:
                    st.caption(f"ℹ️ Free hint provided due to high uncertainty (entropy = {entropy_at_hint:.2f})")
                st.markdown("<br>", unsafe_allow_html=True)
            
            with st.form(key=f"form_{user_id}_{user_state['current_q_id']}"):
                options_map = {"A": current_q['option_a'], "B": current_q['option_b'], "C": current_q['option_c'], "D": current_q['option_d']}
                st.markdown("### Select your answer:")
                user_choice = st.radio(
                    "Options:", 
                    list(options_map.keys()), 
                    format_func=lambda x: f"**{x}:** {options_map[x]}",
                    label_visibility="collapsed"
                )
                st.markdown("<br>", unsafe_allow_html=True)
                submit_btn = st.form_submit_button("📤 Submit Answer", type="primary", use_container_width=True, disabled=user_state["waiting_next"])
            
            st.markdown('</div>', unsafe_allow_html=True)

            if submit_btn and not user_state["waiting_next"]:
                is_correct = (user_choice == current_q['correct_answer'])
                if is_correct:
                    user_state["score"] += 1
                    user_state["streak"] += 1
                    user_state["last_result"] = "correct"
                else:
                    user_state["streak"] = 0
                    user_state["last_result"] = "wrong"
                    
                    # Auto-collect wrong question to notebook
                    try:
                        # Ensure question_data is dict-like
                        if isinstance(current_q, pd.Series):
                            question_dict = current_q.to_dict()
                        else:
                            question_dict = dict(current_q)
                        
                        # Persist for registered users
                        if st.session_state.user_manager.user_exists(user_id):
                            # Add debug info (dev only)
                            save_ok = st.session_state.wrong_questions_manager.add_wrong_question(
                                user_id,
                                int(current_q['id']),  # ensure ID is int
                                question_dict,
                                user_choice,
                                current_q['correct_answer']
                            )
                            # Verify save result
                            profile = st.session_state.user_manager.get_user_profile(user_id)
                            if profile:
                                wrong_count = len(profile.get("wrong_questions_detail", []))
                                st.success(f"✅ Wrong question saved! Total wrong questions: {wrong_count}")
                                # Cache latest wrong questions in session_state as fallback
                                user_cache = st.session_state.user_data.get(user_id, {})
                                user_cache["wrong_questions_detail_cache"] = profile.get("wrong_questions_detail", [])
                                st.session_state.user_data[user_id] = user_cache
                            st.session_state.last_wrong_saved = {
                                "user": user_id,
                                "question_id": int(current_q['id']),
                                "saved": bool(save_ok),
                                "wrong_count": wrong_count if profile else None
                            }
                            if not save_ok:
                                st.error("❌ Failed to save wrong question to file. Please check write permissions.")
                        else:
                            # For guest users, store in session_state (temporary)
                            if 'guest_wrong_questions' not in st.session_state:
                                st.session_state.guest_wrong_questions = []
                            
                            # Check if already exists
                            existing_idx = next(
                                (i for i, wq in enumerate(st.session_state.guest_wrong_questions) 
                                 if wq.get('question_id') == int(current_q['id'])), 
                                None
                            )
                            
                            wrong_question = {
                                "question_id": int(current_q['id']),
                                "question": question_dict.get("question", ""),
                                "concept": question_dict.get("concept", ""),
                                "difficulty": question_dict.get("difficulty", 0.5),
                                "user_answer": user_choice,
                                "correct_answer": current_q['correct_answer'],
                                "explanation": question_dict.get("explanation", ""),
                                "hint": question_dict.get("hint", ""),
                                "first_wrong_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                "last_wrong_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                "wrong_count": 1,
                                "mastered": False,
                                "mastered_time": None,
                                "review_count": 0
                            }
                            
                            if existing_idx is not None:
                                # Update existing wrong question
                                st.session_state.guest_wrong_questions[existing_idx]["wrong_count"] += 1
                                st.session_state.guest_wrong_questions[existing_idx]["last_wrong_time"] = wrong_question["last_wrong_time"]
                                st.session_state.guest_wrong_questions[existing_idx]["user_answer"] = user_choice
                            else:
                                # Add new wrong question
                                st.session_state.guest_wrong_questions.append(wrong_question)
                            
                            st.info("💡 Register to save your wrong questions permanently!")
                    except Exception as e:
                        # If saving wrong question fails, print details
                        import traceback
                        st.error(f"❌ Failed to save wrong question: {str(e)}")
                        st.code(traceback.format_exc())
                    
                # Compute EIG (also in Linear mode for logging)
                current_eig = user_state["learner"].calculate_eig(current_q['difficulty'])
                correct_val = 1 if is_correct else 0
                new_ability = user_state["learner"].update_belief(current_q['difficulty'], correct_val)
                
                # Hint-related data (if used)
                # entropy_at_hint and hint_cost_this_q were set when hint clicked
                hint_cost_this_q = user_state.get("hint_cost_this_q", 0.0)
                entropy_at_hint = user_state.get("entropy_at_hint", None)
                
                # Update learning stats for registered users
                if st.session_state.user_manager.user_exists(user_id):
                    try:
                        st.session_state.user_manager.update_learning_stats(
                            user_id,
                            current_q['id'],
                            is_correct,
                            study_time_minutes=0  # placeholder for future time tracking
                        )
                    except Exception as e:
                        pass
                
                # Log learning mode and hint usage for analysis
                log_interaction(
                    user_id, current_q['id'], current_q['difficulty'], correct_val, 
                    new_ability, current_q['concept'], current_eig, 
                    st.session_state.learning_mode,
                    hint_used=user_state["hint_used"],
                    hint_cost=hint_cost_this_q,
                    entropy_at_hint=entropy_at_hint
                )
                
                user_state["history"].append(current_q['id'])
                user_state["waiting_next"] = True
                st.rerun()

            if user_state["waiting_next"]:
                st.markdown("<br>", unsafe_allow_html=True)
                if user_state["last_result"] == "correct":
                    st.success("✅ **Excellent! Your answer is correct!** 🎉")
                else:
                    st.error(f"❌ **Incorrect answer.** The correct answer was **{current_q['correct_answer']}**.")
                
                if 'explanation' in current_q and pd.notna(current_q['explanation']):
                    with st.expander("💡 See Explanation", expanded=True):
                        st.markdown(f"""
                        <div style="padding: 1rem; background: #f7fafc; border-radius: 8px; border-left: 4px solid #667eea;">
                            <p style="color: #4a5568; line-height: 1.6;">{current_q['explanation']}</p>
                        </div>
                        """, unsafe_allow_html=True)
                
                st.markdown("<br>", unsafe_allow_html=True)
                col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
                with col_btn2:
                    if st.button("➡️ Next Question", type="primary", use_container_width=True):
                        get_next_question()
                        user_state["waiting_next"] = False
                        user_state["last_result"] = None
                        st.rerun()

# --- 6. 错题本页面 ---
def wrong_questions_page():
    """错题本独立页面"""
    user_id = st.session_state.current_user_id

    # 侧边栏（统一渲染）
    render_sidebar_full(user_id)
    
    st.markdown("""
    <div style="text-align: center; padding: 1rem 0 2rem 0;">
        <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #667eea;">
            📚 Wrong Questions
        </h1>
        <p style="color: #718096; font-size: 1.1rem;">Review and master your mistakes</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 返回按钮
    if st.button("← Back to Learning", type="secondary"):
        st.session_state.current_page = "main"
        st.rerun()
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Load wrong-question stats
    # Registered users: from profile file; guests: from session_state
    if st.session_state.user_manager.user_exists(user_id):
        # Fetch profile to verify data exists
        user_profile = st.session_state.user_manager.get_user_profile(user_id)
        if user_profile:
            wrong_questions_detail = user_profile.get("wrong_questions_detail", [])
            if len(wrong_questions_detail) > 0:
                st.success(f"✅ Found {len(wrong_questions_detail)} wrong question(s) in your profile!")
            else:
                st.info(f"ℹ️ Your profile exists but has no wrong questions yet. User: '{user_id}'")
            # If file empty but session has cache, fall back to cache
            if len(wrong_questions_detail) == 0:
                cached = st.session_state.user_data.get(user_id, {}).get("wrong_questions_detail_cache", [])
                if cached:
                    st.warning(f"⚠️ Loaded wrong questions from session cache: {len(cached)} item(s).")
                    wrong_questions_detail = cached
        
        wrong_stats = st.session_state.wrong_questions_manager.get_wrong_question_stats(user_id)
        wrong_questions_all = st.session_state.wrong_questions_manager.get_wrong_questions(
            user_id, 
            filter_mastered=False,
            sort_by="last_wrong_time"
        ) if wrong_stats.get("total", 0) > 0 else []
        
        # If file empty but cache exists, use cache
        cached = st.session_state.user_data.get(user_id, {}).get("wrong_questions_detail_cache", [])
        if wrong_stats.get("total", 0) == 0 and cached:
            wrong_questions_all = cached
            wrong_stats = {
                "total": len(cached),
                "mastered": sum(1 for wq in cached if wq.get("mastered", False)),
                "not_mastered": sum(1 for wq in cached if not wq.get("mastered", False)),
                "mastery_rate": round(
                    sum(1 for wq in cached if wq.get("mastered", False)) / len(cached) * 100, 2
                ) if cached else 0,
                "by_concept": {},
                "by_difficulty": {"easy": 0, "medium": 0, "hard": 0}
            }
            for wq in cached:
                concept = wq.get("concept", "Unknown")
                wrong_stats["by_concept"][concept] = wrong_stats["by_concept"].get(concept, 0) + 1
                diff = wq.get("difficulty", 0.5)
                if diff < 0.4:
                    wrong_stats["by_difficulty"]["easy"] += 1
                elif diff < 0.7:
                    wrong_stats["by_difficulty"]["medium"] += 1
                else:
                    wrong_stats["by_difficulty"]["hard"] += 1
            st.info("ℹ️ Showing wrong questions from session cache (file may not have been updated).")
        
        # Debug info
        if wrong_stats.get("total", 0) == 0:
            st.warning(f"⚠️ No wrong questions found. User: '{user_id}'")
            # If file empty but cache exists, override stats/list
            cached = st.session_state.user_data.get(user_id, {}).get("wrong_questions_detail_cache", [])
            if cached:
                wrong_questions_all = cached
                wrong_stats = {
                    "total": len(cached),
                    "mastered": sum(1 for wq in cached if wq.get("mastered", False)),
                    "not_mastered": sum(1 for wq in cached if not wq.get("mastered", False)),
                    "mastery_rate": round(
                        sum(1 for wq in cached if wq.get("mastered", False)) / len(cached) * 100, 2
                    ) if cached else 0,
                    "by_concept": {},
                    "by_difficulty": {"easy": 0, "medium": 0, "hard": 0}
                }
                for wq in cached:
                    concept = wq.get("concept", "Unknown")
                    wrong_stats["by_concept"][concept] = wrong_stats["by_concept"].get(concept, 0) + 1
                    diff = wq.get("difficulty", 0.5)
                    if diff < 0.4:
                        wrong_stats["by_difficulty"]["easy"] += 1
                    elif diff < 0.7:
                        wrong_stats["by_difficulty"]["medium"] += 1
                    else:
                        wrong_stats["by_difficulty"]["hard"] += 1
                st.info("ℹ️ Showing wrong questions from session cache (file may not have been updated).")
    else:
        # 访客用户的错题
        guest_wrong_questions = st.session_state.get('guest_wrong_questions', [])
        wrong_questions_all = guest_wrong_questions
        
        # 计算统计信息
        wrong_stats = {
            "total": len(guest_wrong_questions),
            "mastered": sum(1 for wq in guest_wrong_questions if wq.get('mastered', False)),
            "not_mastered": len([wq for wq in guest_wrong_questions if not wq.get('mastered', False)]),
            "mastery_rate": round(sum(1 for wq in guest_wrong_questions if wq.get('mastered', False)) / len(guest_wrong_questions) * 100, 2) if guest_wrong_questions else 0,
            "by_concept": {},
            "by_difficulty": {"easy": 0, "medium": 0, "hard": 0}
        }
        
        # 按知识点统计
        for wq in guest_wrong_questions:
            concept = wq.get('concept', 'Unknown')
            wrong_stats["by_concept"][concept] = wrong_stats["by_concept"].get(concept, 0) + 1
        
        # 按难度统计
        for wq in guest_wrong_questions:
            diff = wq.get('difficulty', 0.5)
            if diff < 0.4:
                wrong_stats["by_difficulty"]["easy"] += 1
            elif diff < 0.7:
                wrong_stats["by_difficulty"]["medium"] += 1
            else:
                wrong_stats["by_difficulty"]["hard"] += 1
    
    if wrong_stats.get("total", 0) > 0:
        # 显示统计信息卡片
        col_stat1, col_stat2, col_stat3 = st.columns(3)
        with col_stat1:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Total Wrong", wrong_stats["total"])
            st.markdown('</div>', unsafe_allow_html=True)
        with col_stat2:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Not Mastered", wrong_stats["not_mastered"])
            st.markdown('</div>', unsafe_allow_html=True)
        with col_stat3:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Mastery Rate", f"{wrong_stats.get('mastery_rate', 0):.1f}%")
            st.markdown('</div>', unsafe_allow_html=True)
        
        # 筛选和排序选项
        col_filter1, col_filter2 = st.columns(2)
        with col_filter1:
            filter_mastered = st.checkbox("Hide Mastered Questions", value=True)
        with col_filter2:
            sort_option = st.selectbox(
                "Sort by",
                ["last_wrong_time", "wrong_count", "difficulty", "concept"],
                format_func=lambda x: {
                    "last_wrong_time": "Most Recent",
                    "wrong_count": "Most Wrong",
                    "difficulty": "Difficulty",
                    "concept": "Concept"
                }[x]
            )
        
        # 知识点筛选
        if wrong_stats.get("by_concept"):
            concepts = list(wrong_stats["by_concept"].keys())
            selected_concept = st.selectbox("Filter by Concept", ["All"] + concepts)
            filter_concept = None if selected_concept == "All" else selected_concept
        else:
            filter_concept = None
        
        # 获取错题列表（如果还没有获取）
        if st.session_state.user_manager.user_exists(user_id):
            wrong_questions = st.session_state.wrong_questions_manager.get_wrong_questions(
                user_id, 
                filter_mastered=filter_mastered,
                filter_concept=filter_concept,
                sort_by=sort_option
            )
        else:
            # 访客用户：从session_state筛选
            wrong_questions = st.session_state.get('guest_wrong_questions', [])
            if filter_mastered:
                wrong_questions = [wq for wq in wrong_questions if not wq.get('mastered', False)]
            if filter_concept:
                wrong_questions = [wq for wq in wrong_questions if wq.get('concept') == filter_concept]
            
            # 排序
            if sort_option == "last_wrong_time":
                wrong_questions.sort(key=lambda x: x.get("last_wrong_time", ""), reverse=True)
            elif sort_option == "wrong_count":
                wrong_questions.sort(key=lambda x: x.get("wrong_count", 0), reverse=True)
            elif sort_option == "difficulty":
                wrong_questions.sort(key=lambda x: x.get("difficulty", 0), reverse=True)
            elif sort_option == "concept":
                wrong_questions.sort(key=lambda x: x.get("concept", ""))
        
        if wrong_questions:
            st.markdown(f"### 📋 Wrong Questions ({len(wrong_questions)})")
            
            for idx, wq in enumerate(wrong_questions):
                with st.expander(
                    f"❌ Q{wq['question_id']}: {wq['question'][:60]}... | Wrong: {wq.get('wrong_count', 1)}x | {wq['concept']}", 
                    expanded=False
                ):
                    st.markdown(f"**Question:** {wq['question']}")
                    st.markdown(f"**Concept:** {wq['concept']} | **Difficulty:** {wq['difficulty']:.2f}")
                    st.markdown(f"**Your Answer:** {wq['user_answer']} | **Correct Answer:** {wq['correct_answer']}")
                    st.markdown(f"**Wrong Count:** {wq.get('wrong_count', 1)} | **Review Count:** {wq.get('review_count', 0)}")
                    st.markdown(f"**Last Wrong:** {wq.get('last_wrong_time', 'N/A')}")
                    
                    if wq.get('explanation'):
                        st.info(f"💡 **Explanation:** {wq['explanation']}")
                    
                    if wq.get('hint'):
                        st.warning(f"💡 **Hint:** {wq['hint']}")
                    
                    col_btn1, col_btn2 = st.columns(2)
                    with col_btn1:
                        if st.button("✅ Mark as Mastered", key=f"master_{wq['question_id']}_{idx}"):
                            if st.session_state.user_manager.user_exists(user_id):
                                st.session_state.wrong_questions_manager.mark_as_mastered(user_id, wq['question_id'])
                            else:
                                # 访客用户：更新session_state
                                for g_wq in st.session_state.get('guest_wrong_questions', []):
                                    if g_wq.get('question_id') == wq['question_id']:
                                        g_wq['mastered'] = True
                                        g_wq['mastered_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                        break
                            st.success("Marked as mastered!")
                            st.rerun()
                    with col_btn2:
                        if st.button("🔄 Review Again", key=f"review_{wq['question_id']}_{idx}"):
                            if st.session_state.user_manager.user_exists(user_id):
                                st.session_state.wrong_questions_manager.increment_review_count(user_id, wq['question_id'])
                            else:
                                # 访客用户：更新session_state
                                for g_wq in st.session_state.get('guest_wrong_questions', []):
                                    if g_wq.get('question_id') == wq['question_id']:
                                        g_wq['review_count'] = g_wq.get('review_count', 0) + 1
                                        break
                            st.info("Review count updated!")
                            st.rerun()
            
            # 显示知识点统计图表
            if wrong_stats.get("by_concept"):
                st.markdown("### 📊 Wrong Questions by Concept")
                concept_df = pd.DataFrame(list(wrong_stats["by_concept"].items()), columns=["Concept", "Count"])
                fig_concept = px.bar(concept_df, x="Concept", y="Count", 
                                    title="Wrong Questions by Concept",
                                    color_discrete_sequence=["#667eea"])
                st.plotly_chart(fig_concept, use_container_width=True)
        else:
            st.success("🎉 No wrong questions to review!")
    else:
        st.info("📝 No wrong questions yet. Keep learning!")
        st.markdown("""
        <div style="text-align: center; padding: 2rem; background: #f7fafc; border-radius: 12px; margin-top: 2rem;">
            <p style="font-size: 1.2rem; color: #718096;">Start answering questions to build your wrong questions collection!</p>
        </div>
        """, unsafe_allow_html=True)


# --- 7. 能力分析与学习路径页面 ---
def insights_page():
    """综合能力分析 + 学习路径规划页面"""
    user_id = st.session_state.current_user_id.strip()

    # 侧边栏（统一渲染）
    render_sidebar_full(user_id)

    st.markdown(f"""
    <div style="text-align: center; padding: 0.5rem 0 1.5rem 0;">
        <h1 style="font-size: 2.2rem; margin-bottom: 0.35rem; color: #2b6cb0;">
            🎯 Learning Insights & Path
        </h1>
        <p style="color: #718096; font-size: 1rem;">
            For <strong>{user_id}</strong> · Multi-dimensional analysis + planning
        </p>
    </div>
    """, unsafe_allow_html=True)

    # === 数据准备 ===
    user_logs = get_user_logs(user_id)

    # 学习时间统计
    time_stats = compute_learning_time_stats(user_logs) if not user_logs.empty else {}
    daily_minutes = time_stats.get("daily_minutes", pd.DataFrame())
    slot_minutes = time_stats.get("slot_minutes", pd.DataFrame())
    best_slot_raw = time_stats.get("best_slot", "N/A")
    active_days_30 = time_stats.get("active_days_30", 0)
    longest_streak = time_stats.get("longest_streak", 0)
    current_streak = time_stats.get("current_streak", 0)
    avg7 = time_stats.get("avg7", 0)
    avg30 = time_stats.get("avg30", 0)
    habit_notes = time_stats.get("habit_notes", [])
    calendar_df = time_stats.get("calendar", pd.DataFrame())

    best_slot = "N/A"
    if best_slot_raw is not None and pd.notna(best_slot_raw):
        best_slot = best_slot_raw if isinstance(best_slot_raw, str) else str(best_slot_raw)

    last7_total = 0
    if not daily_minutes.empty and {"date", "minutes"}.issubset(daily_minutes.columns):
        last7_total = daily_minutes[daily_minutes["date"] >= (pd.Timestamp.now().date() - pd.Timedelta(days=6))]["minutes"].sum()

    # Top summary cards
    c1, c2, c3, c4 = st.columns(4)
    def metric_card(container, title, value, desc):
        container.markdown(f"""
        <div class="metric-card" style="padding:1rem 1.1rem;">
            <p style="margin:0; color:#4a5568; font-weight:600; font-size:0.95rem;">{title}</p>
            <p style="margin:0.2rem 0 0 0; font-size:1.4rem; color:#2d3748; font-weight:700;">{value}</p>
            <p style="margin:0.1rem 0 0 0; color:#718096; font-size:0.9rem;">{desc}</p>
        </div>
        """, unsafe_allow_html=True)

    metric_card(c1, "Total time (last 7d)", f"{last7_total:.0f} min" if last7_total else "—", "Daily time sum (7d)")
    metric_card(c2, "Active days (last 30d)", f"{active_days_30}", "Active days (30d)")
    metric_card(c3, "Best time slot", f"{best_slot}", "By total minutes")
    metric_card(c4, "Current/Longest streak", f"{current_streak}/{longest_streak} days", "Streak (days)")

    st.markdown("<div style='margin:0.5rem 0;'></div>", unsafe_allow_html=True)

    # Main content grouped by tabs
    tab_path, tab_time, tab_ability = st.tabs(["🗺️ Learning Path Planning", "⏱️ Study Time Stats", "📊 Multi-dimensional Ability"])

    # --- Tab 1: Learning path planning ---
    with tab_path:
        st.markdown("### 🗺️ Learning Path Planning")

    # Estimate ability: prefer in-session learner, fall back to logs
    est_ability = None
    learner = None
    if user_id in st.session_state.get("user_data", {}):
        learner = st.session_state.user_data[user_id]["learner"]
        try:
            est_ability = float(learner.get_estimated_ability())
        except Exception:
            est_ability = None

    if est_ability is None and not user_logs.empty and "estimated_ability" in user_logs.columns:
        est_ability = float(user_logs["estimated_ability"].dropna().iloc[-1])

    if est_ability is None:
        est_ability = 0.5

    # 能力档位
    if est_ability < 0.4:
        level_label = "Foundation"
        suggestion = "Focus on core concepts with easier questions first, then gradually increase difficulty."
    elif est_ability < 0.7:
        level_label = "Intermediate"
        suggestion = "You already have a basic understanding. Consolidate weak concepts and introduce more challenging items."
    else:
        level_label = "Advanced"
        suggestion = "You are performing well. Focus on high-difficulty questions and fine‑grained concept review."

    with tab_path:
        st.markdown(f"""
        <div class="metric-card">
            <h4 style="margin-top:0; color:#2d3748;">Current Mastery Level</h4>
            <p style="font-size:0.95rem; color:#718096; margin-bottom:0.4rem;">
                Estimated ability: <strong>{est_ability:.2f}</strong> · Level: <strong>{level_label}</strong>
            </p>
            <p style="font-size:0.9rem; color:#4a5568; margin-bottom:0;">
                {suggestion}
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Weak concepts based on log accuracy
    weak_concepts = []
    if not user_logs.empty and "concept" in user_logs.columns and "correct" in user_logs.columns:
        concept_stats = (
            user_logs.groupby("concept")["correct"]
            .mean()
            .reset_index()
            .rename(columns={"correct": "accuracy"})
        )
        concept_stats["accuracy"] = concept_stats["accuracy"].fillna(0.0)
        weak_concepts = concept_stats.sort_values("accuracy").head(3).to_dict("records")

    # Simple concept dependency graph (extend as needed for your question set)
    concept_graph = {
        "Supervised": [],
        "Metrics": ["Supervised"],
        "Optimization": ["Supervised"],
        "Overfitting": ["Supervised", "Metrics"],
        "Theory": [],
    }

    with tab_path:
        if weak_concepts:
            st.markdown("### 🔍 Recommended Focus Concepts")
            for c in weak_concepts:
                concept = c["concept"]
                acc = c["accuracy"]
                prereq = concept_graph.get(concept, [])
                prereq_str = ", ".join(prereq) if prereq else "None (foundation concept)"
                st.markdown(f"""
                <div style="margin-bottom:0.75rem; padding:0.75rem 1rem; background:#f7fafc; border-radius:10px; border-left:4px solid #667eea;">
                    <strong>{concept}</strong><br/>
                    <span style="font-size:0.9rem; color:#718096;">Mastery: {acc*100:.1f}% · Prerequisites: {prereq_str}</span>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("Answer a few questions to unlock concept‑level recommendations.")

    # Learning goals and progress
    with tab_path:
        st.markdown("### 🎯 Goals & Progress")
        if st.session_state.user_manager.user_exists(user_id):
            profile = st.session_state.user_manager.get_user_profile(user_id)
            goals = profile.get("learning_goals", {})
            stats = profile.get("learning_stats", {})
            total_q = stats.get("total_questions", 0)
            target_q_per_day = goals.get("target_questions_per_day", 10)
            target_ability = goals.get("target_ability", 0.8)

            # Simple completion: current ability / target ability (capped at 100%)
            completion = min(est_ability / max(target_ability, 1e-6) * 100, 100)

            c_goal, c_plan = st.columns(2)
            c_goal.markdown(f"""
            <div class="metric-card" style="height:100%;">
                <p style="margin:0 0 0.4rem 0; color:#4a5568;"><strong>Daily Target:</strong> {target_q_per_day} questions</p>
                <p style="margin:0 0 0.4rem 0; color:#4a5568;"><strong>Ability Target:</strong> {target_ability:.2f}</p>
                <p style="margin:0 0 0.4rem 0; color:#4a5568;"><strong>Completed:</strong> {total_q}</p>
                <p style="margin:0; color:#4a5568;"><strong>Goal Completion:</strong> {completion:.1f}%</p>
            </div>
            """, unsafe_allow_html=True)

            # Next 7-day action list
            focus_concept = weak_concepts[0]["concept"] if weak_concepts else "Core basics"
            plan_items = [
                f"{target_q_per_day} questions per day to stay consistent",
                f"Focus concept: {focus_concept}",
                f"Best time slot: {best_slot} (schedule harder items here)" if best_slot != "N/A" else "Pick a consistent high-efficiency slot for core practice",
                f"Streak goal: maintain {max(current_streak,1)+2} days+" if current_streak else "Start streak tracking; aim for 3+ days",
            ]
            bullets = "".join([f"<li>{p}</li>" for p in plan_items])
            c_plan.markdown(f"""
            <div class="metric-card" style="height:100%;">
                <p style="margin:0 0 0.4rem 0; color:#4a5568;"><strong>Next 7 Days Plan</strong></p>
                <ul style="margin:0; padding-left:1.1rem; color:#4a5568; font-size:0.95rem; line-height:1.45;">
                    {bullets}
                </ul>
            </div>
            """, unsafe_allow_html=True)

            # 里程碑奖励（简单文本徽章）
            milestones = []
            if total_q >= 10:
                milestones.append("⭐ Starter: Completed 10+ questions")
            if total_q >= 50:
                milestones.append("🌟 Persistent Learner: Completed 50+ questions")
            if est_ability >= 0.7:
                milestones.append("🏅 Proficiency: Ability ≥ 0.70")
            if milestones:
                st.markdown("##### 🏆 Milestones")
                for m in milestones:
                    st.markdown(f"- {m}")
        else:
            st.info("Login with a registered account to track goals and milestones.")

    # --- Tab 2: Study time stats ---
    with tab_time:
        st.markdown("### ⏱️ Study Time Statistics")

        if user_logs.empty:
            st.info("You need some learning records to show time stats and ability analysis.")
        else:
            # Daily minutes / time-slot distribution / calendar heatmap — three columns
            st.markdown("#### Study Time Overview")
            c1, c2, c3 = st.columns(3)
            with c1:
                if not daily_minutes.empty:
                    recent_daily = daily_minutes[daily_minutes["date"] >= (pd.Timestamp.now().date() - pd.Timedelta(days=29))]
                    fig_daily = px.bar(
                        recent_daily,
                        x="date",
                        y="minutes",
                        labels={"date": "Date", "minutes": "Minutes"},
                        color_discrete_sequence=["#667eea"],
                        title="Daily Minutes (30d)",
                    )
                    fig_daily.update_layout(
                        margin=dict(t=40, b=0, l=0, r=0),
                        height=380,
                        width=380,
                        autosize=False,
                    )
                    st.plotly_chart(fig_daily, use_container_width=False, key="time_daily_bar")
                else:
                    st.info("No daily duration data yet.")
            with c2:
                if not slot_minutes.empty:
                    fig_slot = px.bar(
                        slot_minutes,
                        x="slot",
                        y="minutes",
                        labels={"slot": "Time Slot", "minutes": "Minutes"},
                        color_discrete_sequence=["#48bb78"],
                        title="Time-of-day Distribution",
                    )
                    fig_slot.update_layout(
                        margin=dict(t=40, b=0, l=0, r=0),
                        height=380,
                        width=380,
                        autosize=False,
                    )
                    st.plotly_chart(fig_slot, use_container_width=False, key="time_slot_bar")
                    st.markdown(f"**Best study slot:** {best_slot} (by total minutes)")
                else:
                    st.info("No time-slot distribution yet.")
            with c3:
                if not calendar_df.empty:
                    heat_df = calendar_df.copy()
                    heat_df["dow_label"] = heat_df["dow"].map(
                        {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
                    )
                    fig_cal = px.density_heatmap(
                        heat_df,
                        x="week",
                        y="dow_label",
                        z="minutes",
                        color_continuous_scale="Blues",
                        labels={"week": "Week", "dow_label": "Day", "minutes": "Minutes"},
                        title="Calendar Heatmap (90d)",
                    )
                    fig_cal.update_layout(
                        margin=dict(t=40, b=0, l=0, r=0),
                        height=380,
                        width=380,
                        autosize=False,
                    )
                    st.plotly_chart(fig_cal, use_container_width=False, key="time_calendar_heat_main")
                else:
                    st.info("No calendar data yet.")

            # 3) Study frequency and streak
            st.markdown("#### Study Frequency / Streak")
            freq_cols = st.columns(3)
            freq_cols[0].metric("Active days (30d)", active_days_30)
            freq_cols[1].metric("Current streak (days)", f"{current_streak}")
            freq_cols[2].metric("Longest streak (days)", f"{longest_streak}")

            # 4) Study calendar view
            st.markdown("#### Study Calendar (Last 90 Days)")
            if not calendar_df.empty:
                col_cal, col_blank = st.columns([0.65, 0.35])
                with col_cal:
                    # Simple calendar heatmap (week vs weekday)
                    heat_df = calendar_df.copy()
                    heat_df["dow_label"] = heat_df["dow"].map(
                        {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
                    )
                    fig_cal = px.density_heatmap(
                        heat_df,
                        x="week",
                        y="dow_label",
                        z="minutes",
                        color_continuous_scale="Blues",
                        labels={"week": "Week", "dow_label": "Day", "minutes": "Minutes"},
                        title="Calendar Heatmap (Last 90 Days)",
                    )
                    fig_cal.update_layout(margin=dict(t=40, b=0, l=0, r=0))
                    st.plotly_chart(fig_cal, use_container_width=True, key="time_calendar_heat")
                with col_blank:
                    st.empty()
            else:
                st.info("No calendar data available yet.")

            # 5) Study habit analysis
            st.markdown("#### Study Habit Analysis")
            if habit_notes:
                for note in habit_notes:
                    st.markdown(f"- {note}")
            else:
                st.info("Not enough data for habit analysis. Complete a few sessions to unlock.")

    # --- Tab 3: Multi-dimensional ability ---
    with tab_ability:
        st.markdown("### 📊 Multi-dimensional Ability")

        if user_logs.empty:
            st.info("📊 No data yet. Complete a few exercises to see concept, difficulty, radar, and comparison analyses.")
        else:
            # Concept accuracy and difficulty accuracy side by side
            concept_stats = (
                user_logs.groupby("concept")["correct"]
                .mean()
                .reset_index()
                .rename(columns={"correct": "accuracy"})
            )
            diff_df = user_logs.copy()
            diff_df["level"] = pd.cut(
                diff_df["difficulty"],
                bins=[0.0, 0.4, 0.7, 1.0],
                labels=["Easy", "Medium", "Hard"],
                include_lowest=True,
            )
            diff_stats = (
                diff_df.groupby("level")["correct"]
                .mean()
                .reindex(["Easy", "Medium", "Hard"])
                .reset_index()
                .rename(columns={"correct": "accuracy"})
            )

            c_concept, c_diff, c_radar, c_comp = st.columns(4)
            with c_concept:
                st.markdown("#### By Concept")
                if concept_stats.empty:
                    st.info("No concept stats yet — complete more exercises to see this view.")
                else:
                    fig_concept = px.bar(
                        concept_stats,
                        x="concept",
                        y="accuracy",
                        range_y=[0, 1],
                        labels={"accuracy": "Accuracy"},
                        color_discrete_sequence=["#667eea"],
                        title="Concept-wise Accuracy",
                    )
                    fig_concept.update_layout(
                        height=380,
                        width=380,
                        autosize=False,
                        margin=dict(t=40, b=0, l=0, r=0),
                    )
                    st.plotly_chart(fig_concept, use_container_width=False, key="concept_bar")
            with c_diff:
                st.markdown("#### By Difficulty")
                fig_diff = px.bar(
                    diff_stats,
                    x="level",
                    y="accuracy",
                    range_y=[0, 1],
                    labels={"accuracy": "Accuracy"},
                    color_discrete_sequence=["#48bb78"],
                    title="Difficulty-wise Accuracy",
                )
                fig_diff.update_layout(
                    height=380,
                    width=380,
                    autosize=False,
                    margin=dict(t=40, b=0, l=0, r=0),
                )
                st.plotly_chart(fig_diff, use_container_width=False, key="difficulty_bar")

            # 综合雷达图（知识点）
            with c_radar:
                st.markdown("#### Radar")
                if len(concept_stats) >= 3:
                    fig_radar = px.line_polar(
                        concept_stats,
                        r="accuracy",
                        theta="concept",
                        line_close=True,
                        range_r=[0, 1],
                        title="Concept Mastery Radar",
                        color_discrete_sequence=["#764ba2"],
                    )
                    fig_radar.update_traces(fill="toself")
                    fig_radar.update_layout(
                        height=380,
                        width=380,
                        autosize=False,
                        margin=dict(t=40, b=0, l=0, r=0),
                    )
                    st.plotly_chart(fig_radar, use_container_width=False, key="concept_radar")
                else:
                    st.info("Not enough concepts to build a radar chart yet.")

            # 能力对比：与全体平均
            all_logs = pd.DataFrame()
            log_file = "logs/learning_history.csv"
            if os.path.exists(log_file):
                try:
                    all_logs = pd.read_csv(log_file, engine="python", on_bad_lines="skip")
                except Exception:
                    all_logs = pd.DataFrame()

            with c_comp:
                st.markdown("#### Ability vs. Avg")
                if not all_logs.empty and "estimated_ability" in all_logs.columns:
                    all_logs["estimated_ability"] = pd.to_numeric(
                        all_logs["estimated_ability"], errors="coerce"
                    )
                    user_mean = user_logs["estimated_ability"].dropna().mean()
                    global_mean = all_logs["estimated_ability"].dropna().mean()
                    comp_df = pd.DataFrame(
                        {
                            "Type": ["You", "Global Avg"],
                            "Estimated Ability": [user_mean, global_mean],
                        }
                    )
                    fig_comp = px.bar(
                        comp_df,
                        x="Type",
                        y="Estimated Ability",
                        range_y=[0, 1],
                        color="Type",
                        color_discrete_sequence=["#667eea", "#a0aec0"],
                        title="Ability Comparison",
                    )
                    fig_comp.update_layout(
                        height=380,
                        width=380,
                        autosize=False,
                        margin=dict(t=40, b=0, l=0, r=0),
                    )
                    st.plotly_chart(fig_comp, use_container_width=False, key="ability_compare")
                else:
                    st.info("No global average data or ability field available.")

            # 简单能力趋势预测：置于下方
            st.markdown("#### Ability Trend (Simple Forecast)")
            if "estimated_ability" in user_logs.columns:
                series = user_logs["estimated_ability"].dropna()
                if len(series) >= 3:
                    y = series.values
                    x = np.arange(len(y))
                    try:
                        coef = np.polyfit(x, y, 1)
                        trend = "increasing" if coef[0] > 0 else "decreasing" if coef[0] < 0 else "stable"
                        st.info(
                            f"Based on recent interactions, your ability trend appears **{trend}** "
                            f"(slope ≈ {coef[0]:.3f})."
                        )
                    except Exception:
                        st.info("Could not fit a trend line right now. Please try again later.")
                else:
                    st.info("Need a few more data points to estimate a trend.")

# --- 8. Entrypoint ---
if __name__ == "__main__":
    # Initialize page state
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "main"
    
    if st.session_state.is_logged_in:
        if st.session_state.current_page == "wrong_questions":
            wrong_questions_page()
        elif st.session_state.current_page == "insights":
            insights_page()
        else:
            main_app()
    else:
        login_page()