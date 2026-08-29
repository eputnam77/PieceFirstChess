<div align="center">

# ♟️ PieceFirst Chess

### A bounded chess learning system you can actually finish

Train like a Grandmaster using **Stockfish 18 + AI coaching (Gemini & GPT-4o)**.  
Analyze positions, solve puzzles, study openings, and get **human-like explanations** for every move.

No installation. No servers required. Runs entirely in your browser.

⭐ **If you like this project, please consider starring the repository.**

---

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Stockfish](https://img.shields.io/badge/Stockfish-18-008000?logo=chess&logoColor=white)](https://stockfishchess.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

# ♟️ PieceFirst Chess

**PieceFirst Chess** is a training system built around one idea: chess feels overwhelming because its literature is written for an audience that includes professionals.

Below roughly 2000 rating, almost no game is decided by opening theory. Games are decided by hanging pieces and missed one-move tactics. So the answer to *"there is too much to learn"* is not to learn faster.

**It is to delete most of the curriculum and drill the remainder until it is automatic.**

This app is the drilling half of that system. The other half is [**PieceFirst 7**](docs/PF7/PieceFirst_7_Handbook.md) — an eight-step decision protocol you run at the board — and a deliberately bounded **99-item curriculum**.

Everything runs **entirely in the browser**: Stockfish 18 via WebAssembly, optional LLM coaching, and all progress stored locally.

---

## 🍴 Why this fork exists

PieceFirst Chess is forked from **Chess King**, an AI-powered coaching app whose strength is explaining *why* a move is best — you ask it a question, and it answers well.

This fork narrows that into a single purpose.

> **Chess King is a coach you ask. PieceFirst Chess is a system you train against.**

An on-demand coach is genuinely useful, but it does not decide *what* you should study, in *what order*, or *when to test you again*. Left alone you end up doing whatever feels urgent — usually fixing your opening, which is almost never the actual problem.

So this fork adds the parts a coach cannot supply:

| | Chess King (upstream) | PieceFirst Chess (this fork) |
|---|---|---|
| **Model** | Ask a question, get an explanation | Follow a fixed protocol, drill a fixed curriculum |
| **Scope** | Open-ended | **99 items. Finishable.** |
| **Scheduling** | You decide what to study | Spaced repetition decides for you |
| **Feedback** | Per-position | Your blunders reorder the study queue |
| **Order** | Any | Endgames before openings, per Capablanca |

The engine, board, and AI coaching inherited from Chess King all remain — they are the substrate the drills run on.

---

# ♟️ The PieceFirst 7 protocol

Run on every serious move. The full system is in [`docs/PF7/PieceFirst_7_Handbook.md`](docs/PF7/PieceFirst_7_Handbook.md).

| Step | Question |
|---|---|
| **PF1 · RESET** | What did the opponent's last move change? |
| **PF2 · SAFETY** | Check? Mate threat? Hanging piece? Fork, pin, or skewer? |
| **PF3 · FORCE** | My checks → captures → threats. |
| **PF4 · BREAK** | Is there a necessary or favorable pawn break? |
| **PF4.5 · PREVENT** | What does my opponent want over the next 3–5 moves? |
| **PF5 · PIECEFIRST** | What is my worst piece, and where does it belong? |
| **PF6 · CALCULATE** | Compare 2–4 serious candidates. |
| **PF7 · VERIFY** | Before touching the piece: their checks, captures, threats. |

PF4.5 PREVENT is an addition to the original handbook. The handbook's own error taxonomy lists *"opponent plan ignored"* as a failure mode, but had no step that would ever catch it — prophylaxis needed a home. See [`docs/ai-notes.md`](docs/ai-notes.md) for the full assessment of the system, including where it draws on Heisman, Nunn, Makogonov, Kotov, and Silman.

## The organizing idea

The most common club-player failure is *"I knew that pattern, I just didn't see it."*

That is a **retrieval** failure, not a storage failure. It happens because patterns are normally filed under a taxonomy — *chapter 4: deflection* — instead of under the moment you would actually need them.

So in this system, **every curriculum item is tagged with the PF step that surfaces it.** The eight steps become the retrieval index. You are not learning 99 facts; you are learning 8 questions, each with a stocked answer set.

---

# 📚 The 99-item curriculum

The complete thing. Not "there are so many openings" — **fourteen opening cards, and they come last.**

| Tier | Content | Items | PF step |
|---|---|---|---|
| 0 | The protocol | 1 | all |
| 1 | Tactical motifs | 42 | PF2 / PF3 |
| 2 | Named mating patterns | 16 | PF3 |
| 3 | Must-know endgames | 18 | PF5 / PF6 |
| 4 | Pawn structures | 8 | PF4 / PF4.5 / PF5 |
| 5 | Opening tabiya cards | 14 | PF4 / PF5 |
| | **Total** | **99** | |

Two design notes worth calling out:

- **Endgames come before openings** (Capablanca's advice), because endgame knowledge is finite, concrete, verifiable, and never rots. It is the most completable tier in chess.
- **The repertoire reduces the middlegame from ~14 pawn structures to 5** — and two of those are learned from *both* sides (the French chain as White in the French/Caro Advance and as Black in the Caro Advance; the IQP as White in the Alapin and as Black against the Panov). Knowing both sides of two structures beats knowing eight from one side.

Full specification, sequencing, and build plan: [`docs/PF7/LEARNING-SYSTEM.md`](docs/PF7/LEARNING-SYSTEM.md).

---

# 🚀 Key Highlights

- ♟ **Stockfish 18 running entirely in-browser (WASM)**
- 🤖 **AI chess coach powered by Gemini + GPT-4o**
- 📊 **Real-time engine evaluation bar**
- 🧠 **Human-like explanations for positions**
- 🎯 **Puzzle, opening, and endgame training**
- 📈 **Full game analysis with move classification**
- ⚡ **No backend required — fully browser based**

---

# 📸 Screenshots

<table>
  <tr>
    <td align="center">
      <img src="pics/s1.png" alt="Live Game with AI Coach" width="100%"/>
      <br/><sub><b>Live Game with AI Coach Panel</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="pics/s2.png" alt="Training Mode" width="100%"/>
      <br/><sub><b>Training Mode — Puzzles, Openings & Endgames</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="pics/s3.png" alt="Engine Analysis Panel" width="100%"/>
      <br/><sub><b>Deep Engine Analysis with Best Move, Hints & Position Analysis</b></sub>
    </td>
  </tr>
</table>

---

# 🤖 AI Coaching Engine

PieceFirst Chess inherits Chess King's conversational AI coach, which guides players through positions like a human trainer.

Features include:

- **Real-time AI explanations**
- **Conversational chess analysis**
- **Skill-level adaptive coaching**
- **Move suggestions with reasoning**

The coach explains:

- Candidate moves
- Tactical ideas
- Strategic plans
- Calculation trees

Instead of simply telling the best move, it teaches **how strong players think**.

---

# ♟️ Stockfish 18 Integration

The project integrates **Stockfish 18 compiled to WebAssembly**, allowing deep engine analysis directly inside the browser.

Capabilities include:

- **Multi-PV analysis**
- **Evaluation bar**
- **Best move suggestions**
- **Threat detection**
- **Position evaluation**

All analysis runs **locally in your browser** without server calls.

---

# 🎓 Training Modules

The platform includes multiple training systems designed to improve chess skills.

### Tactical Puzzles
Improve calculation and pattern recognition.

- 44 curated puzzles
- Tactical motif detection
- Guided hints

### Opening Drill

Practice opening theory.

- 54 opening lines
- Move-by-move explanations
- ECO opening recognition

### Endgame Training

Learn fundamental endgame techniques.

- 21 classic endgame scenarios
- Position-based training
- Engine verification

### Blunder Review Mode

Review mistakes from previous games.

- Blunder detection
- Tactical explanation
- Improvement suggestions

---

# 📊 Game Analysis

PieceFirst Chess analyzes entire games and provides detailed insights.

Analysis includes:

- Move quality classification
- Accuracy percentage
- Tactical pattern detection
- Opening recognition

Each move is categorized as:

- Excellent
- Good
- Inaccuracy
- Mistake
- Blunder

This helps players understand **where and why mistakes happen**.

---

# 🛠 Board & Gameplay Features

The application includes a full interactive chess board system.

Features include:

- Drag-and-drop move input
- Legal move highlighting
- Arrow annotations
- Move history with PGN
- Position setup via FEN
- Save/load games using IndexedDB
- Board flipping
- Dark mode support

You can also play against a **custom minimax chess engine** with multiple difficulty levels.

---

# ⚙️ Getting Started

## Prerequisites

- Node.js 18+
- npm or yarn

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Iamsdt/chess.git
cd chess
````

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

# 🔑 Environment Variables

To enable AI coaching features, create a `.env` file:

```env
VITE_GOOGLE_AI_API_KEY=your_google_gemini_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

Note:

The project still works **fully offline for chess analysis and training** without API keys.

---

# 🏗 Build for Production

```bash
npm run build
npm run preview
```

The production build is configured for GitHub Pages at `/chess/`, so the generated `dist` folder is ready to publish from this repository without extra path fixes.

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml) that deploys every push to `main`.

To enable it in GitHub:

1. Open repository settings.
2. Go to Pages.
3. Set the source to GitHub Actions.

After the workflow finishes, the site will be published at your repository Pages URL.

---

# 🧠 Tech Stack

| Layer            | Technology                   |
| ---------------- | ---------------------------- |
| Frontend         | React 19 + Vite 6            |
| Styling          | Tailwind CSS + Radix UI      |
| Chess Logic      | chess.js                     |
| Chess Board      | react-chessboard             |
| Engine           | Stockfish 18 (WASM)          |
| AI Models        | Gemini + GPT-4o              |
| State Management | Zustand                      |
| Storage          | IndexedDB (idb)              |
| Custom Engine    | Minimax + Alpha-Beta pruning |

---

# 📂 Project Structure

```
src/
├── components/
│   ├── board-panel.jsx
│   ├── chat-panel.jsx
│   ├── training-panel.jsx
│   ├── puzzle-mode.jsx
│   ├── opening-drill-mode.jsx
│   ├── endgame-mode.jsx
│   └── blunder-review-mode.jsx
│
├── hooks/
│   ├── use-engine-coach.js
│   ├── use-ai-chat.js
│   └── use-chess-clock.js
│
├── lib/
│   ├── engine.js
│   ├── stockfish.js
│   ├── intelligence.js
│   ├── analyzer.js
│   └── openings.js
│
├── store/
│   └── use-game-store.js
│
└── data/
    ├── puzzles.js
    └── endgames.js
```

---

# 🗺 Roadmap

Build order from [`docs/PF7/LEARNING-SYSTEM.md`](docs/PF7/LEARNING-SYSTEM.md) §3. The ordering constraint that matters: **the scheduler ships before the content**, because a large curriculum sitting on a binary solved/unsolved tracker teaches nothing.

- [x] **FSRS-6 spaced-repetition scheduler** (`src/lib/srs.js`) — replaces binary "solved" tracking with expanding review intervals
- [x] **Curriculum data model** (`src/data/curriculum.js`) — all 99 items, self-validating
- [ ] **Drill positions** — Tiers 1–2 imported from the CC0 Lichess puzzle database by theme; Tiers 3–5 hand-authored
- [ ] **SRS persistence** — IndexedDB store and `use-progress-store` wiring
- [ ] **Daily session builder** — answers "what do I study today?" so you never have to
- [ ] **Error-log feedback loop** — tag each blunder with its failed PF step, then let frequency reorder the study queue
- [ ] **New drill modes** — blunder-check reps, structure play-outs from a tabiya, protocol rehearsal
- [ ] **Mastery dashboard** — the curriculum's table of contents with per-item state

A bounded curriculum only motivates if the bound is visible.

---

# 🤝 Contributing

Contributions are welcome!

If you'd like to improve the project:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

Ideas for contributions:

* Add more puzzles
* Expand opening database
* Improve UI/UX
* Add new training modes

---

# 📜 License

MIT License

© Shudipto Trafder

---

<div align="center">

Built with ♟️, AI, and a lot of ☕

**Stop memorizing moves. Start understanding chess.**

</div>
