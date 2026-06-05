-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v8)
-- Add Accommodations and Transportation Histories
-- ==========================================

CREATE TABLE IF NOT EXISTS public.accommodation_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accommodation_id UUID,
    modified_by_email TEXT NOT NULL,
    modified_by_name TEXT,
    old_data JSONB,
    new_data JSONB,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.accommodation_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.accommodation_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.accommodation_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.transportation_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transportation_id UUID,
    modified_by_email TEXT NOT NULL,
    modified_by_name TEXT,
    old_data JSONB,
    new_data JSONB,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.transportation_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.transportation_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.transportation_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);
