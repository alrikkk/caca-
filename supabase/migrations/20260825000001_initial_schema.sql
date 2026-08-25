-- ==============================================================================
-- Caca: Intelligent College Project Discovery & Team Formation Platform
-- Database Schema: Initial Foundation
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT,
    college TEXT NOT NULL,
    major TEXT NOT NULL,
    grad_year INT NOT NULL,
    experience_level TEXT NOT NULL CHECK (experience_level IN ('freshman', 'sophomore', 'junior', 'senior', 'grad', 'alumni')),
    working_style TEXT NOT NULL DEFAULT 'collaborative' CHECK (working_style IN ('independent', 'collaborative', 'structured', 'fast-paced', 'mentor-oriented')),
    bio TEXT,
    avatar_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for college search and discovery
CREATE INDEX IF NOT EXISTS idx_profiles_college ON public.profiles(college);
CREATE INDEX IF NOT EXISTS idx_profiles_experience_level ON public.profiles(experience_level);
CREATE INDEX IF NOT EXISTS idx_profiles_working_style ON public.profiles(working_style);

-- ==============================================================================
-- 2. SKILLS & USER SKILLS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'frontend', 'backend', 'ml_ai', 'design', 'hardware', 'product', 'marketing'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    proficiency INT NOT NULL CHECK (proficiency BETWEEN 1 AND 5), -- 1: Beginner, 2: Familiar, 3: Competent, 4: Advanced, 5: Expert
    years_experience NUMERIC(3, 1) NOT NULL DEFAULT 0.0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON public.user_skills(skill_id);

-- ==============================================================================
-- 3. INTERESTS & USER INTERESTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'ai_safety', 'fintech', 'healthtech', 'robotics', 'climate', 'social', 'gaming'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, interest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON public.user_interests(user_id);

-- ==============================================================================
-- 4. AVAILABILITY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hours_per_week INT NOT NULL CHECK (hours_per_week BETWEEN 1 AND 80),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    prefers_remote BOOLEAN NOT NULL DEFAULT TRUE,
    weekend_availability BOOLEAN NOT NULL DEFAULT TRUE,
    weekday_evenings BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_windows JSONB DEFAULT '[]'::jsonb, -- e.g. [{"day": "monday", "startTime": "18:00", "endTime": "22:00"}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. PROJECTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('draft', 'recruiting', 'in_progress', 'completed', 'archived')),
    max_team_size INT NOT NULL DEFAULT 4 CHECK (max_team_size BETWEEN 2 AND 12),
    duration_weeks INT NOT NULL DEFAULT 6,
    hours_per_week INT NOT NULL DEFAULT 10,
    banner_url TEXT,
    github_repo TEXT,
    demo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);

-- ==============================================================================
-- 6. PROJECT SKILLS (Structured Requirements)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    required_proficiency INT NOT NULL DEFAULT 2 CHECK (required_proficiency BETWEEN 1 AND 5),
    importance TEXT NOT NULL DEFAULT 'required' CHECK (importance IN ('required', 'preferred', 'nice_to_have')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_project_skills_project ON public.project_skills(project_id);

-- ==============================================================================
-- 7. APPLICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    pitch_note TEXT,
    compatibility_score NUMERIC(5, 2), -- Cached individual match score (0-100)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_project ON public.applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_id);

-- ==============================================================================
-- 8. TEAMS & TEAM MEMBERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    team_compatibility_score NUMERIC(5, 2), -- Holistic team score (0-100)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_title TEXT NOT NULL,
    is_lead BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Skills are readable by everyone" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Interests are readable by everyone" ON public.interests FOR SELECT USING (true);

CREATE POLICY "User skills are viewable by everyone" ON public.user_skills FOR SELECT USING (true);
CREATE POLICY "Users manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Availability viewable by everyone" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Users manage own availability" ON public.availability FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Projects viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Project owners manage their projects" ON public.projects FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Project skills viewable by everyone" ON public.project_skills FOR SELECT USING (true);
CREATE POLICY "Project owners manage project skills" ON public.project_skills FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_skills.project_id AND projects.owner_id = auth.uid())
);

CREATE POLICY "Applicants and project owners view applications" ON public.applications FOR SELECT USING (
    auth.uid() = applicant_id OR 
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = applications.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Students can apply to projects" ON public.applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Project owners can update application status" ON public.applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = applications.project_id AND projects.owner_id = auth.uid())
);

CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Team members viewable by everyone" ON public.team_members FOR SELECT USING (true);
