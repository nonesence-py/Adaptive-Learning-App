# AdaptLearn — Adaptive STEM Learning Platform

An intelligent adaptive learning platform built as a graduation project, implementing **Active Inference** combined with **4-Parameter Logistic (4PL) Item Response Theory** for personalized question selection. The system dynamically estimates each learner's ability level and selects the most informative questions to maximize learning efficiency.

## Project Background

This project explores how adaptive algorithms can improve learning outcomes compared to traditional fixed-sequence question delivery. The core hypothesis is that by selecting questions based on **Expected Information Gain (EIG)**, the system can reduce uncertainty about a learner's ability faster and provide a more efficient learning experience.

The project went through two major development iterations:

- **V1 (Python / Streamlit):** The initial prototype was built using Python and Streamlit, focusing on implementing and validating the core adaptive algorithm (Active Inference + 4PL IRT). V1 included the question bank, algorithm engine, simulation experiments, and basic user management. It served as a proof-of-concept to demonstrate that the adaptive approach converges significantly faster than fixed-sequence delivery.

- **V2 (React / TypeScript):** Based on the validated V1 algorithm, the platform was rebuilt as a modern single-page web application using React and TypeScript. The V2 version preserves the same core algorithm logic (ported from `algo.py` to `adaptive-engine.ts`) while adding a comprehensive UI with dashboard analytics, knowledge graph visualization, spaced review, achievements, timed challenges, and detailed learning reports.

## Key Features

| Feature | Description |
|---|---|
| **Adaptive Learning Engine** | Active Inference algorithm with 4PL IRT model for real-time ability estimation and optimal question selection |
| **Dashboard** | Overview of learning progress, concept mastery radar chart, accuracy trends, and daily activity |
| **Algorithm Visualization** | Real-time display of ability estimation, uncertainty (entropy), and Expected Information Gain during learning |
| **Spaced Review** | SM-2 based spaced repetition system with self-rating (Again / Hard / Good / Easy) |
| **Knowledge Graph** | Interactive visualization of concept relationships and mastery levels |
| **Wrong Questions** | Categorized review of incorrectly answered questions with filtering and sorting |
| **Timed Challenge** | Time-limited quiz mode with difficulty selection and scoring |
| **Achievements** | Gamification system with unlockable badges based on learning milestones |
| **Learning Report** | Comprehensive analytics with charts for accuracy, concept distribution, and learning patterns |
| **Leaderboard** | Ranking system based on XP, accuracy, and streaks |
| **Notes** | Concept-organized note-taking system |
| **Data Export** | CSV export for learning history, wrong questions, and review data |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, Framer Motion |
| UI Components | Radix UI, shadcn/ui |
| Charts | Recharts |
| Routing | Wouter |
| State Management | LocalStorage-based persistent store |
| Backend | Express.js (for production serving) |
| Algorithm | Active Inference + 4PL IRT (ported from Python) |

## Project Structure

```
├── client/                  # Frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth and Theme context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Core logic
│   │   │   ├── adaptive-engine.ts   # Active Inference + 4PL IRT algorithm
│   │   │   ├── questions.ts         # Question bank (106 questions, 10 concepts)
│   │   │   ├── store.ts             # Persistent state management
│   │   │   ├── demo-data.ts         # Pre-populated demo accounts
│   │   │   └── simulation-data.ts   # Simulation experiment results
│   │   └── pages/           # Page components
│   │       ├── Dashboard.tsx
│   │       ├── Learn.tsx            # Adaptive / Fixed-sequence learning
│   │       ├── AlgorithmDemo.tsx    # Algorithm visualization
│   │       ├── Review.tsx           # Spaced review (SM-2)
│   │       ├── KnowledgeGraph.tsx
│   │       ├── WrongQuestions.tsx
│   │       ├── Challenge.tsx        # Timed challenge mode
│   │       ├── Achievements.tsx
│   │       ├── Report.tsx           # Learning analytics
│   │       ├── Leaderboard.tsx
│   │       ├── Notes.tsx
│   │       ├── Insights.tsx         # Simulation data analysis
│   │       └── Settings.tsx
│   └── index.html
├── server/                  # Express server for production
├── shared/                  # Shared constants
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Demo Accounts

The platform comes with 4 pre-populated demo accounts for testing. All accounts use the password **`demo123`**.

| Account | Level | Questions Answered | Accuracy |
|---|---|---|---|
| David | Lv.6 Expert | 135 | 77% |
| Alice | Lv.6 Expert | 115 | 60% |
| Bob | Lv.3 Explorer | 65 | 55% |
| Carol | Lv.3 Explorer | 40 | 53% |

### Build for Production

```bash
pnpm build
pnpm start
```

## Algorithm Overview

The adaptive engine uses a Bayesian approach to estimate learner ability:

1. **Belief Initialization:** A uniform prior distribution over a discretized ability grid (0.01 to 0.99).

2. **Question Selection:** For each candidate question, the algorithm computes the **Expected Information Gain (EIG)** — the expected reduction in entropy of the ability belief after observing the learner's response. The question with the highest EIG is selected.

3. **Belief Update:** After the learner responds, the belief distribution is updated using Bayes' rule with the 4PL IRT likelihood function.

4. **Ability Estimation:** The current ability estimate is the expected value of the posterior belief distribution.

This approach ensures that each question maximally reduces uncertainty about the learner's true ability, leading to faster convergence compared to fixed-sequence delivery.

## Simulation Results

Simulation experiments (160 runs) comparing Adaptive vs. Fixed-Sequence modes demonstrate:

- Adaptive mode converges to the true ability estimate in significantly fewer steps
- Entropy (uncertainty) decreases faster under adaptive question selection
- The Expected Information Gain metric effectively identifies the most informative questions

Detailed simulation data and analysis are available in the **Insights** page of the application.

## License

MIT
