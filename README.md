# Caca: Intelligent College Project Discovery & Team Formation Platform

**Caca** is an intelligent university project discovery and team formation platform built for hackathons and student innovators.

The core product loop:
**DISCOVER → INTEREST → MATCH → OPTIMIZE → BUILD**

---

## 🎨 Visual & Design System

Caca follows a **Restrained Neo-Brutalist + Minimalist** design aesthetic (70% clean product minimalism, 30% neo-brutalist tactile accents):
- **High-contrast foundation**: Off-white canvas (`#F9F9F6`) and ink black (`#0D0D0D`)
- **Direct microcopy**: Zero generic SaaS fluff; direct, punchy signals (`94% MATCH`, `MISSING: LEAD WEB ARCHITECT`, `JOIN TEAM`, `SAVE`)
- **Tactile feedback**: 2px hard solid borders, offset box shadows (`4px 4px 0px #0D0D0D`), and instant active button translation.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components & Client Actions)
- **Language**: TypeScript (Strict typing across entities and matching algorithms)
- **Styling**: Tailwind CSS with custom neo-brutalist tokens
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security policies)
- **Icons**: Lucide React
- **Deterministic Matching Engine**: Modular engine with configurable criteria weights:
  - Skill Coverage: 35%
  - Experience Level: 20%
  - Weekly Availability: 15%
  - Interest Alignment: 15%
  - Role Compatibility: 10%
  - Working Style: 5%
- **AI Abstraction Boundary**: Dedicated `AIProvider` interface for requirement extraction, skill normalization, and team composition gap analysis (compatible with Gemini, Anthropic, and OpenAI).

---

## 📂 Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Supabase Auth Login & Judge Demo Bypass
│   │   └── signup/page.tsx          # Student Registration
│   ├── (main)/
│   │   ├── layout.tsx               # AppShell wrapper
│   │   ├── feed/page.tsx            # Vertical Project Discovery Feed
│   │   ├── discover/page.tsx        # Search & Categorized Exploration
│   │   ├── create/page.tsx          # Natural Language AI Requirement Extraction
│   │   ├── projects/[id]/page.tsx   # Project Detail & Team Slot Simulator
│   │   ├── teams/page.tsx           # Active Squads & Outgoing Applications
│   │   └── profile/page.tsx         # Verified Skills & Availability Matrix
│   ├── globals.css                  # Neo-brutalist CSS tokens & animations
│   ├── layout.tsx                   # Root HTML Layout & Fonts
│   └── page.tsx                     # Entry Redirect
├── components/
│   ├── ui/                          # Button, Badge, Card, Avatar, Input, Modal, ProgressBar
│   ├── layout/                      # Navbar, Sidebar, MobileNav, AppShell
│   └── feed/                        # ProjectFeedCard, MatchBreakdownModal
├── lib/
│   ├── supabase/                    # client.ts, server.ts, middleware.ts
│   ├── mock-data.ts                 # Rich, authentic college projects & students
│   └── utils.ts                     # Score formatting, class merging
├── types/
│   ├── database.types.ts            # PostgreSQL Schema types
│   ├── user.ts                      # Student Profile, Skills, Availability
│   ├── project.ts                   # Projects, Slots, Applications, Teams
│   ├── matching.ts                  # Engine weights, Individual & Team score interfaces
│   └── ai.ts                        # Extraction and gap explanation schemas
├── matching/
│   └── engine.ts                    # Deterministic matching & team optimizer
├── ai/
│   ├── provider.ts                  # AI Provider interface contract
│   └── mock-provider.ts             # Deterministic fallback & Gemini/OpenAI factory
├── supabase/
│   └── migrations/
│       └── 20260825000001_initial_schema.sql  # Complete normalized PostgreSQL schema
├── .env.example
├── package.json
└── tailwind.config.ts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm or pnpm

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Supabase URL and Anon Key (optional for mock demo mode):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Supabase)

To apply the schema to your Supabase project:
1. Go to your [Supabase Dashboard](https://app.supabase.com).
2. Open the **SQL Editor**.
3. Copy and run the contents of [`supabase/migrations/20260825000001_initial_schema.sql`](supabase/migrations/20260825000001_initial_schema.sql).

This provisions:
- `profiles` (linked to `auth.users`)
- `skills` & `user_skills`
- `interests` & `user_interests`
- `availability`
- `projects` & `project_skills`
- `applications`
- `teams` & `team_members`
- Full Row Level Security (RLS) policies and performance indexes

---

## 🚢 Production Build & Deployment

### Build Verification
```bash
npm run lint
npm run typecheck
npm run build
```

### Vercel Deployment
Deploy with zero configuration to Vercel:
```bash
npx vercel
```
Ensure the environment variables from `.env.example` are added in your Vercel Project Settings.
