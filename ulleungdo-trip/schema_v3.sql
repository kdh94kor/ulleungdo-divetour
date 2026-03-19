-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v3)
-- (Run this in Supabase SQL Editor)
-- ==========================================

DROP TABLE IF EXISTS public.schedule_histories;
DROP TABLE IF EXISTS public.schedules;

-- 1. Schedules Table
CREATE TABLE public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_date DATE NOT NULL,
    schedule_time TIME NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Schedule History Table
CREATE TABLE public.schedule_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    old_data JSONB,
    new_data JSONB,
    changed_by_email TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS (Row Level Security) 설정
-- Supabase 보안 정책(Policy) 충돌 에러 (new row violates row-level security policy) 방지용 필수 설정

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
-- 누구나 볼 수 있음 (Read)
CREATE POLICY "Allow read to everyone" ON public.schedules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read to auth" ON public.schedules FOR SELECT TO authenticated USING (true);
-- 로그인한 사용자(authenticated)만 추가/수정/삭제 가능 (Write)
CREATE POLICY "Allow all to authenticated" ON public.schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.schedule_histories ENABLE ROW LEVEL SECURITY;
-- 누구나 볼 수 있음 (Read)
CREATE POLICY "Allow read to everyone" ON public.schedule_histories FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read to auth" ON public.schedule_histories FOR SELECT TO authenticated USING (true);
-- 로그인한 사용자만 히스토리 추가 가능
CREATE POLICY "Allow all to authenticated" ON public.schedule_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);
