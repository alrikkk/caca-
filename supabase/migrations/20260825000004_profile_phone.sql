-- ==============================================================================
-- Caca: Add Optional Phone Number Support to Profiles
-- ==============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;
