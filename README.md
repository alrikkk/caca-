*Written by hand 
# Caca

Caca helps college students find projects and teammates based on verified skills, interests, schedule availability, and working styles.

Instead of generic chat groups or social networks where finding collaborators is noisy and unorganized, Caca uses a deterministic matching engine to calculate compatibility, highlight missing team capabilities, and guide students through forming a project squad.

---

## Why we built it

At hackathons and across university campuses, students frequently have ambitious project ideas but struggle to find the right teammates. Usually, teams are formed randomly through friends or disorganized message boards. A group might have three frontend developers and no backend engineer, or members whose schedules never align.

We built Caca to make team formation structured and transparent:
- Students can see **why** they match with a project.
- Project creators can see exactly which **skills and roles are missing** in their squad.
- Finding people, sending invitations, reviewing applications, and assigning roles happens in one focused workflow without social media bloat (no likes, comments, or follower counts).

---

## How it works

```
DISCOVER  ──►  MATCH  ──►  UNDERSTAND WHY  ──►  FIND CANDIDATES  ──►  FORM SQUAD  ──►  COLLABORATE
```

1. **Discover**: Browse open projects or search for students by skills, major, or natural language prompts.
2. **Match**: The matching engine evaluates profile data against project requirements and outputs a transparent compatibility score.
3. **Understand Why**: The UI explains exact skill overlaps, schedule fit, and missing capabilities.
4. **Find Candidates**: One-click candidate ranking finds students who satisfy unfilled roles.
5. **Form Squad & Collaborate**: Project leads invite candidates or accept incoming applications, reassign roles, and track holistic team synergy.

---

## Core Features

### Student Profiles
- **Skills & Proficiency**: 1–5 proficiency rating with verification flags and years of experience.
- **Availability**: Hours per week, remote preference, weekend availability, and weekday time windows.
- **Working Style & Experience**: Independent, collaborative, or mentor-oriented styles with academic year.
- **Profile Customization**: Avatar upload (via Supabase Storage or camera capture), bio, and links (GitHub, LinkedIn, Portfolio).

### Projects & Recruitment
- **Requirements Matrix**: Required and preferred skills with required proficiency levels.
- **Role Slots**: Dedicated slots (e.g. Lead Architect, UI/UX Designer, ML Specialist).
- **Applications**: Students can apply with an optional pitch note. Project owners review applicants with fit scores and 1-click decisions.

### Deterministic Matching Engine
Compatibility scores are calculated using deterministic TypeScript logic rather than opaque AI guesses:

| Component | Weight | How it works |
| :--- | :--- | :--- |
| **Skill Match** | **35%** | Evaluates required and preferred project skills against user skills with weighted proficiency scaling. |
| **Experience Level** | **20%** | Compares student experience with project complexity. |
| **Weekly Availability** | **15%** | Evaluates whether the student's committed hours meet the project workload. |
| **Interest Alignment** | **15%** | Matches student interest tags with project categories and domains. |
| **Role Compatibility** | **10%** | Matches candidate skillset and headline against project roles. |
| **Working Style** | **5%** | Measures harmony between student style and team work patterns. |

### Squads & Collaboration Dashboard (`/teams`)
- **Squad Rosters**: Active squads with member lists and role badges.
- **Role Assignment**: Team leads can reassign roles with presets (`Squad Lead`, `Frontend Engineer`, `Backend Architect`, `ML Researcher`, `UI/UX Designer`, `Systems & DevOps`, `Product Lead`, `Research Specialist`) or custom titles.
- **Member Management**: Leads can manage squad members with automatic authorization checks.
- **Team Synergy (5-Way Breakdown)**:
  - Skill Coverage (50%)
  - Role Diversity (20%)
  - Schedule Overlap (15%)
  - Working Style Harmony (10%)
  - Experience Balance (5%)
- **3-State Capability Tracks**:
  - `COVERED ✓`
  - `PARTIALLY COVERED △`
  - `MISSING ⚠` (with instant `FIND CANDIDATES →` matcher)

### In-App Notifications
- Real-time notification center for invitations, application review status, and squad updates.
- Supports individual mark-as-read and mark-all-read operations.

### Demo Mode
- A complete offline demonstration state with mock profiles, projects, and squads.
- Allows testing and presenting all product features without requiring a live Supabase connection or real credentials.

---

## AI Architecture & Safety

In Caca, **the matching engine is the source of truth**. AI does not guess or invent matching numbers.

AI is used as an optional enhancement layer for:
- **Search Intent Parsing**: Extracting structured filters (skills, categories, availability) from natural language search queries.
- **Match Explanations**: Grounded synthesis of match strengths and gaps based strictly on computed engine data.
- **Team Synergy Insights**: Natural language summaries of squad strengths and missing capabilities.

### Safety & Privacy Isolation
- All prompts pass through `AISanitizer` before reaching any model.
- Private student data (email addresses, phone numbers, auth IDs, passwords, and tokens) is stripped out before processing.
- Includes a built-in `MockAIProvider` that runs deterministically without API keys. If Gemini, OpenAI, or Anthropic keys are configured, `ServerAIProvider` will use them with automatic fallback on failure or timeout.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, Row Level Security)
- **Testing**: Vitest, React Testing Library, jsdom
- **Styling**: Tailwind CSS with restrained neo-brutalist utility classes

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Login, Signup, Onboarding
│   ├── (main)/
│   │   ├── feed/            # Project feed with match insights & squad builder
│   │   ├── discover/        # Natural language search & student discovery
│   │   ├── create/          # Project creation
│   │   ├── projects/[id]/   # Project detail, capability matrix, applications
│   │   ├── teams/           # Squad management, roles, inbound applicants
│   │   └── profile/         # Student profile & public profile views
│   └── api/ai/              # Server-side AI route handlers (search, explanations)
├── ai/                      # AI provider abstraction, mock provider, privacy sanitizer
├── components/              # UI primitives, feed cards, modals, notifications
├── lib/                     # Supabase client, auth context, mock data, utility helpers
├── matching/                # Deterministic matching algorithms & team synergy engine
├── services/                # Profile, Project, Team, Application, Invitation, Notification services
├── supabase/migrations/     # PostgreSQL schemas, RLS policies, storage configuration
├── test/                    # Vitest unit and integration test suites
└── types/                   # TypeScript interfaces for database, matching, AI, and users
```

---

## Running Locally

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Live AI Provider (defaults to 'mock' if left blank)
AI_PROVIDER=mock
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase Database Setup

To set up your database in Supabase:
1. Open your Supabase project dashboard.
2. Go to the **SQL Editor**.
3. Run the migrations in `supabase/migrations/` in chronological order:
   - `20260825000001_initial_schema.sql` (core tables: `profiles`, `skills`, `user_skills`, `interests`, `user_interests`, `availability`, `projects`, `project_skills`, `project_slots`, `applications`, `teams`, `team_members`)
   - `20260825000002_storage_avatars.sql` & `20260825000007_avatar_storage_policy.sql` (avatars storage bucket & RLS)
   - `20260825000003_teams_rls.sql` (team authorization policies)
   - `20260825000008_invitations_notifications_tags.sql` (`team_invitations`, `notifications`)

All tables use PostgreSQL Row Level Security (RLS) so users can only modify their own profile, applications, and squads where they have lead permissions.

---

## Testing & Quality Assurance

We use Vitest and React Testing Library for automated testing across the matching engine, AI fallback layers, and collaboration services.

```bash
# Run test suite
npm run test

# Run TypeScript typecheck
npm run typecheck

# Run production build
npm run build
```

**Verification Status**:
- **Tests**: 14 test files, 72 tests passing (100% green)
- **TypeScript**: 0 errors
- **Build**: All static and dynamic routes compiled successfully

---

## Design

Caca uses a clean, high-contrast style designed for fast scannability:
- Off-white canvas (`#F9F9F6`) with dark ink text (`#0D0D0D`)
- 2px solid borders with subtle tactile offset shadows
- Lime and coral accents for match scores and missing roles
- Monospaced typography for metrics, tags, and data breakdown

---

## Development Notes

During development, we focused heavily on stability and deterministic behavior:
- **Separation of Concerns**: Kept match calculations completely deterministic in TypeScript rather than letting an LLM hallucinate scores.
- **Graceful Degradation**: Added resilient fallback mechanisms across Supabase queries, avatar uploads, and local storage caches.
- **Demo Mode**: Built an isolated demo environment so the app can be presented or evaluated without dependency on network or cloud infrastructure.
