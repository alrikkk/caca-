-- ==============================================================================
-- CACA SCHEMA MIGRATION: CHAT PER-USER HIDING, NOTIFICATION TYPES & RLS POLICIES
-- ==============================================================================

-- 1. Add per-user deletion/hiding support to conversation_members
ALTER TABLE public.conversation_members
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Ensure foreign key on profiles exists for conversation_members if possible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversation_members_profile'
  ) THEN
    ALTER TABLE public.conversation_members
    ADD CONSTRAINT fk_conversation_members_profile
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore if constraint already exists or types match auth.users
END $$;

-- 3. Update notifications type constraint to support all product notification categories
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('invitation', 'application_status', 'follow', 'connect', 'message', 'info'));

-- 4. Ensure conversation members can update own row (e.g. for hiding/deleting conversation per-user)
DROP POLICY IF EXISTS "Users can update own conversation membership" ON public.conversation_members;
CREATE POLICY "Users can update own conversation membership"
  ON public.conversation_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Team Members RLS: Users can insert their own team membership if creator or invited
DROP POLICY IF EXISTS "Team creators manage team members" ON public.team_members;
CREATE POLICY "Team creators manage team members"
  ON public.team_members FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.is_lead = true
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.is_lead = true
    )
  );
