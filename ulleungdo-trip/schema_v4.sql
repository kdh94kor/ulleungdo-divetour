-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v4)
-- (Run this in Supabase SQL Editor)
-- Adds Packing and Transportation Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS public.packing_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transportation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,          -- e.g., "1. 항구로 이동 (육로)"
    title TEXT NOT NULL,             -- e.g., "자차"
    description TEXT NOT NULL,       -- e.g., "카풀 인원 배정 완료"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- RLS (Row Level Security) 설정
-- ==========================================
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to everyone" ON public.packing_items FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read to auth" ON public.packing_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.packing_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.transportation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to everyone" ON public.transportation_items FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read to auth" ON public.transportation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.transportation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
