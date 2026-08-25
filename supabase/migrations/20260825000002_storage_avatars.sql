-- ==============================================================================
-- Caca: Supabase Storage Configuration for User Avatars
-- ==============================================================================

-- 1. Create 'avatars' public bucket if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable public read access for avatars
CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 3. Authenticated users can upload their own avatar into folder matching their auth.uid()
CREATE POLICY "Users Can Upload Own Avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- 4. Users can update their own avatar
CREATE POLICY "Users Can Update Own Avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- 5. Users can delete their own avatar
CREATE POLICY "Users Can Delete Own Avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);
