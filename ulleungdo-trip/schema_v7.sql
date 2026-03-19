-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v7)
-- Add Created By Tracking to Schedules, Accommodations, and Transports
-- ==========================================

ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.accommodations 
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.transportation_items 
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;
