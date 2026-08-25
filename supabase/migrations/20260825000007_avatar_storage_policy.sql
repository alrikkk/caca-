-- ==============================================================================
-- Caca: Robust Storage Policies for User Avatars
-- ==============================================================================

-- 1. Ensure 'avatars' public bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to recreate cleanly without conflict
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Upload Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Update Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Delete Own Avatar" ON storage.objects;

-- 3. Public read access
CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Authenticated users can upload/insert into their own user directory
CREATE POLICY "Users Can Upload Own Avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Authenticated users can update/replace files in their own user directory
CREATE POLICY "Users Can Update Own Avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Authenticated users can delete files in their own user directory
CREATE POLICY "Users Can Delete Own Avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
