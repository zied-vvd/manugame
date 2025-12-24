# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Architecture

Real-time MBTI party game: participants vote on each other's personality spectrums, results aggregate live, then host reveals actual types.

### Key Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Host creates game, adds participants with real MBTI types, controls phases |
| `/join` | Players enter room code and claim identity |
| `/play` | Voting interface: drag avatars on 4 personality spectrums |
| `/board` | Shared screen: physics-based spectrum view + spotlight mode with celebrity matches |
| `/reveal` | Host-controlled reveal comparing group perception vs actual MBTI |

### Data Flow

```
Admin creates session → generates 6-char room code
Players join → claim participant identity via device_id
Voting phase → votes stored with position (0-100) per category
Live Board → subscribes to votes, calculates mean positions in real-time
Reveal → compares predicted MBTI (from vote means) vs real_mbti
```

### Supabase Tables

- `sessions`: game state (phase: lobby|voting|reveal, current_category: 0-3, show_live_board)
- `participants`: name, avatar_url, real_mbti, claimed_at, device_id
- `votes`: voter_id, target_id, category (0-3), position (0-100)

### Core Types (`src/lib/types.ts`)

- `GamePhase`: 'lobby' | 'voting' | 'reveal'
- `CategoryIndex`: 0 (I/E) | 1 (N/S) | 2 (T/F) | 3 (J/P)
- `MBTIType`: 16 valid MBTI combinations

### Key Utilities (`src/lib/constants.ts`)

- `CATEGORIES`: 4 personality spectrums with left/right codes and emojis
- `calculatePredictedMBTI(aggregates)`: derives MBTI from vote means (< 50 = left trait)
- `MBTI_CELEBRITIES`: maps each type to 3 celebrity matches

### Real-time Sync

All state syncs via Supabase Realtime channels - sessions, participants, and votes update instantly across all connected clients.

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Framer Motion for animations
- @dnd-kit for drag-and-drop voting
- Supabase (Postgres + Realtime + Storage)

## Path Alias

`@/*` maps to `./src/*`
