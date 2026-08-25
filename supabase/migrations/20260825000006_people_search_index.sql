-- ==============================================================================
-- Caca: Indexes for Global People Search
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_fullname_search ON public.profiles USING btree (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_college_search ON public.profiles USING btree (college);
CREATE INDEX IF NOT EXISTS idx_profiles_major_search ON public.profiles USING btree (major);
