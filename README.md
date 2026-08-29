# Caca

Caca is a student-focused platform for finding people to build projects with.

The idea came from a pretty simple problem: during hackathons, college projects, and startup competitions, finding the right teammates can be harder than coming up with the idea itself. Caca tries to make that process easier by helping students discover projects, find suitable teammates, and actually collaborate after matching.

## What it does

- Discover projects based on your skills and interests
- Get compatibility scores for projects and students
- See why a match was recommended instead of just getting a random percentage
- Find missing roles in a project and discover students who could fill them
- Build a squad using complementary skills
- Create squads, invite members and manage roles
- Apply to projects and accept/reject applications
- Follow other students and connect through their profiles
- Upload a resume and add social links
- Save projects for later
- Share short project updates through Clips
- Message students through direct and group chats
- Use voice input for search and chat
- Get notifications for invitations and collaboration activity
- Use the Guide and Help sections for project/startup resources

## Matching

The main matching system is deterministic rather than letting an AI model decide who should match.

The score uses:

- Skills — 35%
- Experience — 20%
- Availability — 15%
- Interests — 15%
- Role — 10%
- Working style — 5%

AI is used around this system for things like understanding natural-language queries, extracting project requirements and improving explanations. The actual compatibility calculation remains predictable.

## Tech Stack

- Next.js + React
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- Supabase Auth and Row Level Security
- Gemini / OpenAI through a server-side AI provider layer
- Vitest for testing

## *This is still a test project so i will be accepting forks to the code and suggestions.


