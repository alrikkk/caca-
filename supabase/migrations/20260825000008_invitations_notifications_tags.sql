-- ==============================================================================
-- Caca: Team Invitations, In-App Notifications, & Profile Discovery Tags
-- ==============================================================================

-- 1. Add discovery columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS open_to TEXT[] DEFAULT ARRAY['HACKATHONS', 'STARTUPS']::TEXT[];

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'AVAILABLE';

-- 2. Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_title TEXT DEFAULT 'Member',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_team_invite UNIQUE (team_id, invitee_id)
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('invitation', 'application_status', 'info')),
  link TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS for Team Invitations
DROP POLICY IF EXISTS "Users can view relevant team invitations" ON public.team_invitations;
CREATE POLICY "Users can view relevant team invitations"
ON public.team_invitations FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Users can send team invitations" ON public.team_invitations;
CREATE POLICY "Users can send team invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Invitees or inviters can update invitation status" ON public.team_invitations;
CREATE POLICY "Invitees or inviters can update invitation status"
ON public.team_invitations FOR UPDATE
USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- 6. RLS for Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);
