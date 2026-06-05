-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v2)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_title TEXT NOT NULL,         -- e.g., "8월 10일 (목)"
    log_time TEXT,                   -- e.g., "19:00"
    content TEXT NOT NULL,           -- e.g., "서울역 집결 및 출발"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Schedule History Table
CREATE TABLE IF NOT EXISTS public.schedule_histories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    old_time TEXT,
    old_content TEXT,
    new_time TEXT,
    new_content TEXT,
    changed_by_email TEXT NOT NULL,  -- stores the email of the editor
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Packing Items Table
CREATE TABLE IF NOT EXISTS public.packing_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Transportation Info Table
CREATE TABLE IF NOT EXISTS public.transportation_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,          -- e.g., "1. 항구로 이동 (육로)"
    title TEXT NOT NULL,             -- e.g., "자차"
    description TEXT NOT NULL,       -- e.g., "카풀 인원 배정 완료"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- You may insert initial data here:
-- INSERT INTO schedules (day_title, log_time, content) VALUES ('8월 10일 (목)', '19:00', '서울역 집결 및 출발');
