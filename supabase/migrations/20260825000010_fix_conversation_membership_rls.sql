-- ==============================================================================
-- CACA SCHEMA MIGRATION: FIX CONVERSATION MEMBERSHIP RLS & RESUMES STORAGE POLICY
-- ==============================================================================

-- 1. Add created_by column to conversations table if not exists
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid();

-- 2. Update conversations RLS policies
DROP POLICY IF EXISTS "Conversation members can view their conversations" ON public.conversations;
CREATE POLICY "Conversation members and creator can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (created_by IS NULL OR created_by = auth.uid()));

-- 3. Replace overly permissive conversation_members policy
-- Prevent arbitrary users from joining conversations they do not belong to
DROP POLICY IF EXISTS "Authenticated users can join or be added to conversations" ON public.conversation_members;

CREATE POLICY "Conversation creators or members can add participants"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    -- Conversation creator adding members (including self and initial participants)
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
    )
    OR
    -- Existing conversation member adding a new participant
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- 4. Fix Resumes Upload Storage Policy (Require path matching uploader's auth.uid())
DROP POLICY IF EXISTS "Authenticated Upload Resumes" ON storage.objects;

CREATE POLICY "Authenticated Upload Resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
