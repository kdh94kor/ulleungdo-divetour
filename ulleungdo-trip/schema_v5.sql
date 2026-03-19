-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v5)
-- (Run this in Supabase SQL Editor)
-- Adds Accommodations Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.accommodations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT,
    address TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- RLS (Row Level Security) 설정
-- ==========================================
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to everyone" ON public.accommodations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read to auth" ON public.accommodations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.accommodations FOR ALL TO authenticated USING (true) WITH CHECK (true);
