# 🎄 MBTI Party Game

A real-time party game where participants guess each other's personality traits, watch group perception form live, then reveal actual MBTI-based groupings—one category at a time.

Perfect for Christmas parties, team building, or any gathering where you want to spark fun conversations about personality!

## 🎮 How It Works

1. **Admin creates a game** → Gets a room code (e.g., `A6W5YA`) or use the **Quick Party** button for predefined members.
2. **Participants join** → Enter code on their phones, claim their identity (even join late!).
3. **Voting phase** → Everyone places others on 4 personality spectrums using a smooth drag-and-drop interface.
4. **Live Board** → Shared screen shows aggregated guesses in real-time with physics-based animations.
5. **Reveal** → Host-controlled slideshow reveals actual MBTI groupings and compares them to group perception.

## 🧠 The Four Spectrums

| # | Left | Right | MBTI Letter | What It Measures |
|---|------|-------|-------------|------------------|
| 1 | 🧘 Introverti | 🎉 Extraverti | I / E | Energy source |
| 2 | 🔮 Intuitif | 👀 Observateur | N / S | Information processing |
| 3 | 🧠 Rationnel | ❤️ Sensible | T / F | Decision making |
| 4 | 📋 Organisé | 🧭 Explorateur | J / P | Lifestyle approach |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (free tier works!)

### Setup

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd manugame
   npm install
   ```

2. **Configure Supabase:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   - Home: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

## 📱 User Flows

### 👨‍💼 Admin (Host)
1. Go to `/admin` → Click **"Nouvelle Partie"** or **"🎄 Quick Party"**.
2. Add participants with names and real MBTI types.
3. **Upload photos** by clicking on avatars (optional but fun!).
4. Share the room code with players.
5. Click **"Lancer les Votes"** when everyone is ready.
6. Toggle **Live Board** on/off as desired.
7. Click **"Lancer la Révélation"** for the big reveal.

### 🙋 Participant
1. Go to home page or `/join?code=XXXX`.
2. Enter room code.
3. Tap your face to claim your identity (late joining is supported!).
4. **Drag avatars** onto the spectrum for each category.
5. Watch the reveal on the shared screen!

### 📺 Live Board
The live board is designed for a big screen and semi-randomly cycles through two views:
- **Spectrum View**: Shows all participants on a single spectrum with physics-based collision avoidance.
- **Spotlight View**: Focuses on one participant, showing:
    - Their **Collective Perception** (where the group has placed them).
    - Their **Predicted Personality Profile** based on the group's votes.
    - **Celebrity Matches**: Famous people and characters who share their predicted type.
- **Peeker Surprise**: Occasionally, a random participant's head will peek in from the side!

## ⚡ Key Features

| Feature | Description |
|---------|-------------|
| **Photo Avatars** | Upload custom photos for each participant. |
| **Quick Party** | Hardcoded button to instantly set up a party with a predefined list of members. |
| **Physics Spectrum** | 2D spectrum view with collision avoidance to keep avatars visible. |
| **Spotlight Mode** | Large animated portraits with personality reveal and celebrity matches. |
| **Real-time Sync** | All votes and phase changes sync instantly via Supabase Realtime. |
| **Late Joining** | Players can join and claim identities even after voting has started. |
| **Christmas Theme** | Festive colors, fonts, and a snowy winter forest background. |

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Drag & Drop:** @dnd-kit/core
- **Physics:** Custom force-directed simulation for spectrum layout
- **Backend:** Supabase (Postgres + Realtime + Storage)
- **Fonts:** Outfit (body), Playfair Display (display)

## 📖 Documentation

For detailed system architecture, data flow, and algorithm details, see:

**[📘 Architecture Documentation](docs/ARCHITECTURE.md)**

## 📝 Database Schema

```sql
sessions (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,           -- Room code like "A6W5YA"
  phase TEXT,                 -- "lobby" | "voting" | "reveal"
  current_category INT,       -- 0-3
  show_live_board BOOLEAN,
  created_at TIMESTAMP
)

participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions,
  name TEXT,
  avatar_url TEXT,            -- Photo URL from storage
  real_mbti TEXT,             -- Admin-entered actual type
  claimed_at TIMESTAMP,       -- When player claimed identity
  device_id TEXT              -- Browser fingerprint
)

votes (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions,
  voter_id UUID REFERENCES participants,
  target_id UUID REFERENCES participants,
  category INT,               -- 0-3
  position FLOAT,             -- 0-100 on spectrum
  updated_at TIMESTAMP,
  UNIQUE(voter_id, target_id, category)
)
```

---

Made with ❤️ for Christmas 2024
