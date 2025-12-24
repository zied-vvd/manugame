# MBTI Party Game — System Architecture

This document explains the internal mechanics, data flow, and algorithms that power the MBTI Party Game.

---

## 🏗️ System Overview

The application is built as a real-time, multi-user web app optimized for a Christmas party setting.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MBTI Party Game                                 │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Admin     │    │   Players    │    │  Live Board  │                   │
│  │   /admin     │    │ /join /play  │    │   /board     │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                            │
│                             │                                                │
│                             ▼                                                │
│                    ┌────────────────┐                                        │
│                    │    Supabase    │                                        │
│                    │  - Postgres    │                                        │
│                    │  - Realtime    │                                        │
│                    │  - Storage     │                                        │
│                    └────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

### Tables

#### `sessions`
Controls the game flow and global state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `code` | TEXT | 6-character room code (e.g., "A6W5YA") |
| `phase` | TEXT | "lobby", "voting", "reveal" |
| `current_category` | INT | 0-3, current category being revealed |
| `show_live_board` | BOOL | Whether spectators can see real-time data |

#### `participants`
Everyone involved in the session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Participant's name |
| `avatar_url` | TEXT | URL to custom photo (stored in Supabase Storage) |
| `real_mbti` | TEXT | Their actual 4-letter type (e.g., "INTJ") |
| `claimed_at` | TIMESTAMP | When they connected their phone |
| `device_id` | TEXT | Browser fingerprint to prevent double-claiming |

#### `votes`
Individual placements on the spectrums.

| Column | Type | Description |
|--------|------|-------------|
| `voter_id` | UUID | Participant who is voting |
| `target_id` | UUID | Participant being voted on |
| `category` | INT | 0 (I/E), 1 (N/S), 2 (T/F), 3 (J/P) |
| `position` | FLOAT | 0.0 to 100.0 (Left to Right) |

---

## 🔄 Live Board Mechanics

The Live Board (`/board`) is the centerpiece of the game, designed for a large shared screen. It features a sophisticated rotation and visualization system.

### 1. View Rotation
The board semi-randomly cycles through two main views every 30 seconds:
- **Spectrum View (40% chance)**: Displays all participants on one of the four personality spectrums.
- **Spotlight View (60% chance)**: Focuses on one random participant.

### 2. Physics-Based Spectrum
In the **Spectrum View**, avatars are placed along a horizontal axis based on their mean vote. To prevent avatars from overlapping and to create a dynamic feel:
- A **force-directed simulation** (using `requestAnimationFrame`) handles collision avoidance.
- Avatars "push" each other away if they get too close vertically.
- A weak spring force pulls them back toward the center line.

### 3. Spotlight Mode
The Spotlight View provides a deeper dive into a specific person:
- **State A (15s)**: Shows the "Collective Perception" (their mean position on all 4 spectrums).
- **State B (15s)**: Shows their "Predicted Profil" (MBTI code) and a list of 3 matching celebrities with their photos and descriptions.
- **Visuals**: A massive portrait (`w-30rem`) that flips 180° every 10 seconds.

### 4. The Peeker
Every ~5 minutes, a random participant's head will peek in from the left side of the screen at a 50° angle, wave, and hide after 3 seconds.

---

## 🧠 Algorithms

### Predicted MBTI Calculation
The system calculates a "predicted" personality type for each participant based on group consensus:
1. For each of the 4 categories, calculate the **mean (average) position** of all votes.
2. If `mean < 50`, the participant is assigned the **Left trait** (e.g., Introverted).
3. If `mean >= 50`, the participant is assigned the **Right trait** (e.g., Extraverted).
4. Combine the 4 traits to form the 4-letter predicted MBTI code.

### Celebrity Matching
The `MBTI_CELEBRITIES` database maps each of the 16 MBTI types to 3 specific personalities/characters (including Canadian icons like Justin Trudeau, Céline Dion, and Xavier Dolan). Each match includes a curated Wikipedia/Wikimedia portrait.

---

## 🎨 Design & Theming

### Christmas Aesthetics
The app uses a unified festive theme defined in `globals.css`:
- **Colors**: Deep Red (`primary`), Gold (`secondary`), Forest Green (`accent`).
- **Gradients**: Subtle radial gradients and glassmorphism cards.
- **Background**: Fixed snowy winter forest image.
- **Animations**: Heavy use of `framer-motion` for spring-based transitions and 3D rotations.

---

## 🔌 Real-time Subscriptions

The app is entirely driven by **Supabase Realtime**. 
- **Session Channel**: Syncs game phase and category changes globally.
- **Votes Channel**: Updates aggregated means instantly as players drag avatars on their phones.
- **Participants Channel**: Tracks new joins and photo uploads in real-time.

---

## 🔐 Security & Deployment

- **Security**: Intentionally open for a party environment. No passwords required; access is controlled via 6-character room codes.
- **Storage**: Uses public Supabase Storage buckets for avatar uploads.
- **Deployment**: Optimized for Vercel with automatic edge caching for static assets.

---

## 📋 API Quick Reference

### Calculate Prediction
```typescript
const predicted = calculatePredictedMBTI(personAggregates);
// Returns e.g. "ENFJ"
```

### Fetch Celebrities
```typescript
const celebs = MBTI_CELEBRITIES[predictedCode];
// Returns array of 3 Celebrity objects
```

---

🎄 **Merry Christmas and Happy Personalizing!** 🎉
