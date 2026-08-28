-- ==============================================================================
-- CACA SCHEMA MIGRATION: CHAT DELIVERY, RECURSION-FREE RLS & REALTIME PUBLICATION
-- ==============================================================================

-- 1. Helper security definer functions for safe, recursion-free membership checks
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv_id
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_creator(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conv_id
    AND created_by = p_user_id
  );
$$;

-- 2. Conversations Table RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation members can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation members and creator can view their conversations" ON public.conversations;
CREATE POLICY "Conversation members and creator can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    created_by = auth.uid() OR
    public.is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Creators can delete their conversations" ON public.conversations;
CREATE POLICY "Creators can delete their conversations"
  ON public.conversations FOR DELETE
  USING (created_by = auth.uid());

-- 3. Conversation Members Table RLS Policies
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view membership of their conversations" ON public.conversation_members;
CREATE POLICY "Members can view membership of their conversations"
  ON public.conversation_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Conversation creators or members can add participants" ON public.conversation_members;
DROP POLICY IF EXISTS "Authenticated users can join or be added to conversations" ON public.conversation_members;
CREATE POLICY "Conversation creators or members can add participants"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      public.is_conversation_creator(conversation_id, auth.uid()) OR
      public.is_conversation_member(conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own conversation membership" ON public.conversation_members;
CREATE POLICY "Users can update own conversation membership"
  ON public.conversation_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_conversation_creator(conversation_id, auth.uid())
  );

-- 4. Messages Table RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation members can view messages" ON public.messages;
CREATE POLICY "Conversation members can view messages"
  ON public.messages FOR SELECT
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Conversation members can send messages" ON public.messages;
CREATE POLICY "Conversation members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 5. Realtime Publication for Messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;
