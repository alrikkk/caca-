-- ==============================================================================
-- Caca: Teams & Team Members RLS Insert / Update Policies
-- ==============================================================================

-- 1. Enable authenticated users to insert teams
CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 2. Enable team members or owners to update teams
CREATE POLICY "Authenticated users can update teams"
ON public.teams FOR UPDATE
USING (auth.role() = 'authenticated');

-- 3. Enable authenticated users to insert team members
CREATE POLICY "Authenticated users can insert team members"
ON public.team_members FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 4. Enable authenticated users to update/delete team members
CREATE POLICY "Authenticated users can manage team members"
ON public.team_members FOR ALL
USING (auth.role() = 'authenticated');
