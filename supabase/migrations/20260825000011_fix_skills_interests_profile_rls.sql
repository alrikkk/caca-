-- ==============================================================================
-- CACA SCHEMA MIGRATION: SKILLS, INTERESTS, PROFILES RLS & CHAT DELETION POLICIES
-- ==============================================================================

-- 1. Ensure social and profile columns exist on profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS open_to TEXT[] DEFAULT ARRAY['HACKATHONS', 'STARTUPS']::TEXT[],
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'AVAILABLE';

-- 2. Skills Insert Policy for Authenticated Users (Allow creating new/custom skills)
DROP POLICY IF EXISTS "Authenticated users can insert new skills" ON public.skills;
CREATE POLICY "Authenticated users can insert new skills"
  ON public.skills FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Interests Insert Policy for Authenticated Users
DROP POLICY IF EXISTS "Authenticated users can insert new interests" ON public.interests;
CREATE POLICY "Authenticated users can insert new interests"
  ON public.interests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. User Interests Policies
DROP POLICY IF EXISTS "User interests are viewable by everyone" ON public.user_interests;
CREATE POLICY "User interests are viewable by everyone"
  ON public.user_interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own interests" ON public.user_interests;
CREATE POLICY "Users manage own interests"
  ON public.user_interests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. User Skills Policies (Explicit WITH CHECK for secure modifications)
DROP POLICY IF EXISTS "Users manage own skills" ON public.user_skills;
CREATE POLICY "Users manage own skills"
  ON public.user_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Availability Policies (Explicit WITH CHECK)
DROP POLICY IF EXISTS "Users manage own availability" ON public.availability;
CREATE POLICY "Users manage own availability"
  ON public.availability FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Conversations Delete Policy (Creators can delete their conversations)
DROP POLICY IF EXISTS "Creators can delete their conversations" ON public.conversations;
CREATE POLICY "Creators can delete their conversations"
  ON public.conversations FOR DELETE
  USING (created_by = auth.uid());
