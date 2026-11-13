# PushUp Arena 🦾

> **"Don't Just Work Out. Compete."**

PushUp Arena is a real-time, AI-powered competitive fitness platform. Battle friends or global opponents in live 1v1 push-up showdowns refereed by browser-based 3D computer vision with zero wearables required.

---

## ⚡ Features

- **Live 1v1 Battle Arenas**: Real-time WebRTC peer-to-peer video matches with synchronized countdown timers.
- **Client-Side AI Referee**: Powered by MediaPipe Pose Landmarker running locally via WebAssembly with GPU acceleration and CPU fallback.
- **Biomechanical Form Enforcement**: Deterministic Finite State Machine (FSM) measuring joint angles in real time:
  - Strict 90° elbow depth check
  - Full lockout lockout check (>158°)
  - Real-time plank integrity validation (preventing "banana back" hip sagging)
- **Competitive Elo Rating Engine**: Skill-based matchmaking with dynamic Elo rating deltas, K-factors, and competitive tiers (Bronze to Master).
- **Match Modes**:
  - Global Ranked Matchmaking (60-second timed rounds)
  - Custom Friend Rooms (6-character invite codes for 30s, 60s, 120s, or first-to-25 speed reps)
  - Solo Calibration Lab (practice mode with real-time joint feedback)
- **Global Leaderboards**: Podium showcase, tier filtering, and live athlete rankings.
- **100% Privacy-Preserving**: No video streams are ever stored on servers; all pose detection runs client-side in the browser.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Typography**: [Google Fonts](https://fonts.google.com/) (`Chakra Petch`, `Outfit`, `JetBrains Mono`) via `next/font/google`
- **Computer Vision**: [@mediapipe/tasks-vision](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker) (Pose Landmarker Full)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Row Level Security)
- **P2P Networking**: WebRTC (DataChannels & MediaStreams)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17+ or 20+
- npm, pnpm, or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kowshikps56/pushup.git
   cd pushup
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Run the Development Server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

5. Build for Production:
   ```bash
   npm run build
   npm run start
   ```

---

## 📄 License

MIT License.
